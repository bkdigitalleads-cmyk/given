import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initPurchases, getIsPro } from './purchases';

export interface Settings {
  lockEnabled: boolean;
  /** Charitable mileage rate, cents per mile (statutory 14¢). */
  mileageCents: number;
  /** Donor name printed on the year-end report. */
  donorName: string;
  /** Tax year the user is viewing (0 = current calendar year). */
  activeYear: number;
}

export const DEFAULT_SETTINGS: Settings = {
  lockEnabled: false,
  mileageCents: 14,
  donorName: '',
  activeYear: 0,
};

export const SETTINGS_KEY = 'given.settings.v1';

/** Donations allowed on the free tier. */
export const FREE_ITEM_LIMIT = 10;
/** Photos per donation on the free tier. */
export const FREE_PHOTOS_PER_ITEM = 1;
/** Photos per donation on Pro (storage sanity cap). */
export const PRO_PHOTOS_PER_ITEM = 6;

export function currentYear(): number {
  return new Date().getFullYear();
}

interface AppState {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  isPro: boolean;
  setIsPro: (v: boolean) => void;
  refreshPro: () => Promise<void>;
  paywallVisible: boolean;
  showPaywall: () => void;
  hidePaywall: () => void;
  ready: boolean;
  /** Resolved tax year being viewed. */
  year: number;
  /** Bumped whenever donation data changes, so screens refetch. */
  itemsVersion: number;
  bumpItems: () => void;
}

const Ctx = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isPro, setIsPro] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const [itemsVersion, setItemsVersion] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } catch {
        // corrupted settings -> defaults
      }
      try {
        await initPurchases();
        setIsPro(await getIsPro());
      } catch {
        setIsPro(false);
      }
      setReady(true);
    })();
  }, []);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const refreshPro = useCallback(async () => {
    setIsPro(await getIsPro());
  }, []);

  const value = useMemo<AppState>(
    () => ({
      settings,
      updateSettings,
      isPro,
      setIsPro,
      refreshPro,
      paywallVisible,
      showPaywall: () => setPaywallVisible(true),
      hidePaywall: () => setPaywallVisible(false),
      ready,
      year: settings.activeYear || currentYear(),
      itemsVersion,
      bumpItems: () => setItemsVersion((v) => v + 1),
    }),
    [settings, updateSettings, isPro, refreshPro, paywallVisible, ready, itemsVersion]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
