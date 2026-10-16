# Given audit (Oct 15 2026)
## Findings
1. [MED] With Face ID lock on, leaving the app mid-entry wipes the unsaved donation and orphans its photos
   - Where: src/LockGate.tsx:367 and :376 (children unmounted while locked); src/screens/DonationForm.tsx:132-155 (remount calls reset())
   - What happens: Pro user with lock enabled starts a goods donation, adds 2 photos and 15 value-guide items, then switches to Mail to check the receipt amount. On background LockGate sets locked=true and renders the lock screen instead of its children, so DonationFormModal unmounts. After Face ID, Shell still has formVisible=true, the modal remounts with fresh state and the effect calls reset(): everything typed is gone. The pending photo files are never added to the DB or deleted, so they sit in documents/photos for good.
   - Fix: keep children mounted and render the lock screen as an absolute-fill overlay on top (e.g. `<>{children}{locked && <View style={StyleSheet.absoluteFill}>...lock UI...</View>}</>`).
2. [MED] An amount typed with a comma decimal is saved 100x too high
   - Where: src/money.ts:8
   - What happens: The value field uses keyboardType="decimal-pad" (DonationForm.tsx:408). On an iPhone whose region uses a comma decimal separator, that keypad shows "," instead of ".". The user enters "25,50", parseDollarsToCents strips every comma as a thousands separator, and $2,550.00 is saved. The form shows no parsed preview, so the wrong amount goes into the year total and the IRS summary PDF. (Miles already handle this case: DonationForm.tsx:157 maps "," to ".")
   - Fix: when the input contains a comma and no ".", and exactly 1-2 digits follow the last comma, treat that comma as the decimal point; strip commas otherwise.
3. [MED] The paywall promises a free trial and "No payment now" whether or not the user is eligible for one
   - Where: src/screens/Paywall.tsx:35-41, :159, :252
   - What happens: trialLabel and the "✓ No payment now" line read product.introPrice. StoreKit returns introPrice even to users who are no longer eligible, for example someone who already used the weekly trial and is now buying yearly in the same subscription group. That user sees "3 days free … you are not charged until the trial ends" and is charged immediately, which leads to refund requests and App Review 3.1.2 risk. The subtitle also falls back to a hard-coded '3 days free' when there is no weekly package or no trial, or when offerings fail to load.
   - Fix: call Purchases.checkTrialOrIntroductoryPriceEligibility([ids]) when the paywall opens and show trial copy only when the result is ELIGIBLE. Drop the '3 days free' fallback.
4. [MED] Face ID lock has no way out
   - Where: src/LockGate.tsx:342-353, :376; src/screens/Settings.tsx:104-108
   - What happens: (a) If the user later removes their device passcode, which also disables Face ID, authenticateAsync returns success:false (passcode_not_set / not_enrolled) on every try. The app stays on the lock screen with only an Unlock button that cannot work, and the only escape is deleting the app, which erases all donations. (b) A Pro user who turned on the lock and then let the subscription lapse can't turn it off, because onToggleLock opens the paywall whenever !isPro.
   - Fix: in unlock(), if the result error is 'not_enrolled' / 'passcode_not_set' / 'not_available', clear the lock (setLocked(false) and updateSettings({lockEnabled:false})). In onToggleLock, only require Pro when turning the lock on.
5. [LOW] A past tax year picked earlier is remembered across launches, so new donations silently default to Dec 31 of that year
   - Where: src/state.tsx:109 (activeYear persisted); src/screens/DonationForm.tsx:118
   - What happens: In January the user taps the 2025 chip to review last year. In March they open the app, which is still on 2025, and log three gifts. Each one defaults to 2025-12-31 and shows up in the 2025 list they're looking at. The 2026 summary is missing them and the already-filed 2025 total grows.
   - Fix: don't persist activeYear, or reset it to 0 on launch.
6. [LOW] The PDF mileage header shows today's rate setting, not the rate the totals were calculated with
   - Where: src/report.ts:173
   - What happens: Each mileage value is fixed at save time using the rate in effect then. If the user changes the rate setting, the header reads "120 charitable miles @ 20¢" next to a dollar total built at 14¢, and the line doesn't add up for the preparer.
   - Fix: drop the "@ N¢" text, or show the rate implied by the stored totals (mileageCents / miles).
7. [LOW] A purchase that succeeds without granting the 'pro' entitlement closes nothing and shows nothing
   - Where: src/screens/Paywall.tsx:75-81
   - What happens: If a package isn't attached to the 'pro' entitlement in RevenueCat (for example a newly added product), purchasePackage returns ok:true, isPro:false. Neither branch runs, so the user has paid, the paywall stays open, and no message appears. Nothing calls refreshPro or registers a CustomerInfo listener to pick it up later in the session.
   - Fix: add an `else if (res.ok)` branch with an alert telling the user to tap Restore, and register Purchases.addCustomerInfoUpdateListener in state.tsx to keep isPro current.

## Checked and fine
- db.ts schema is unchanged since 1.0.0 (git history), so there is no missing migration. Foreign keys are ON per connection, so the charity SET NULL and photo CASCADE work.
- Money is stored as integer cents. Totals use SQL integer SUMs, and group sums, the overall total and the CSV (cents/100 toFixed(2)) agree. formatCents is correct for non-negative values.
- Tax-year filtering compares 'YYYY-MM-DD' strings between Jan 1 and Dec 31. Dates are built from local getFullYear/getMonth/getDate (no toISOString), and shiftDate uses the local Date constructor.
- Free limit (10) is enforced at the only add entry point (Home handleAdd). The photo cap is 1 free / 6 Pro. PDF and CSV are gated to Pro.
- Restore in both Settings and the paywall handles the ok / not-found / error cases. Onboarding skips the paywall for users who are already Pro.
- Settings JSON.parse is wrapped in try/catch with a defaults merge (state.tsx and report.ts).
- Photos store filenames only, not absolute sandbox paths. storePhoto checks the file exists before returning. Deleting a donation removes its files. PDF thumbnails fall back to a placeholder.
- The review prompt fires once after the first saved donation or first PDF export. It is guarded by an AsyncStorage flag and hasAction, and errors are swallowed.
- Form 8283 ($500 noncash total), $5,000 appraisal and $250 acknowledgment flags use the right thresholds. The 14¢ statutory mileage rate is correct.
- CSV quoting is RFC-4180 compliant. The CSV and PDF handle an empty year.
