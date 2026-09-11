# Given — App Store metadata (v1.0) — DRAFT, pricing needs Brian's approval

## Identity
- **App name (23/30):** `Given: Donation Tracker`
- **Subtitle (30/30):** `Charity log & tax value guide`
- Bundle id: `com.bwk.given` · slug `given-donation-tracker` · owner `bkdeveloper123`
- Categories: Finance (primary), Productivity (secondary)
- Age rating: 4+

Title carries the exact Apple-autocomplete phrase ("donation tracker", #2 suggestion for "donation"). Subtitle carries charity, log, tax, value, guide ("assistant/calc" valuation intent from autocomplete). Note: "ItsDeductible" is a trademark; it stays OUT of the title/subtitle/keywords and lives only on the landing page as a comparison ("replacement for").

## Keywords (no words repeated from title/subtitle; US storefront indexes all three locales)

**en-US (97/100):**
`deduction,deductible,goodwill,thrift,receipt,mileage,giving,tithe,8283,nonprofit,record,taxes,itemize`

**es-MX (additional English terms):**
`contributions,gifts,church,fair,market,clothes,furniture,appraisal,irs,turbotax`

**ar-SA (additional English terms):**
`philanthropy,generosity,tracker,ledger,organizer,household,items,estimate,worth,yearly`

(Check "turbotax" and "goodwill" against Apple's trademark guidance before submission; both are commonly used as generic keywords but Apple occasionally flags them. Drop if a metadata rejection cites them.)

## Description (EULA + Privacy links REQUIRED — do not remove)

Given is the donation tracker that has your tax summary ready in April.

Log cash gifts, donated goods at fair-market value, and charitable miles the moment you give, then hand your preparer one clean year-end PDF instead of a shoebox of receipts. If you used to keep this list in ItsDeductible, this is where the habit lives now.

LOG A DONATION IN SECONDS
• Cash, Goods, or Mileage; pick the charity or add a new one
• Snap the receipt or the bags on the porch (up to 6 photos with Pro)
• Mark each gift as acknowledged so nothing $250+ is missing its receipt

FAIR-MARKET VALUES WITHOUT THE GUESSWORK
• Built-in value guide: typical thrift-store prices for clothes, furniture, kitchen, electronics, books, sports gear, and decor
• Tap items to build a total, adjust for condition, and Given records how you valued it
• Mileage valued at the statutory 14 cents per mile

ONE CLEAN SUMMARY AT TAX TIME
• Year-end PDF grouped by charity: dates, descriptions, condition, values, receipt status, photos, and totals by type
• Flags Form 8283 (over $500 noncash) and appraisal ($5,000+) thresholds, plus any $250+ gift without a written acknowledgment
• CSV export for spreadsheets and tax software
• Switch tax years with one tap

NEW FOR 2026
Starting with tax year 2026, cash gifts can be deducted even if you don't itemize (up to $1,000 single / $2,000 married filing jointly). Given keeps cash, goods, and mileage totaled separately so the numbers are ready however you file.

PRIVATE BY DESIGN
• Your giving lives on your iPhone: no account, no cloud, no tracking, no connection to the IRS or your bank
• Optional Face ID lock
• Works fully offline

Free to start: log your first 10 donations on us. Given Pro unlocks unlimited donations, the year-end PDF, CSV export, up to 6 photos per donation, and Face ID lock, as a Yearly subscription or a one-time Lifetime purchase.

Given is a record-keeping aid, not tax advice. Not affiliated with Intuit, TurboTax, or ItsDeductible.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://bkdigitalleads-cmyk.github.io/given/privacy.html

## Promotional text (live-editable, ≤170)
Track charitable donations for taxes: cash, goods at fair-market value with a built-in guide, and mileage. Export a year-end summary PDF in one tap.

## What's New (1.0)
Welcome to Given! Log cash, goods, and mileage donations by charity, value items with the built-in guide, and export your year-end tax summary.

## Pricing (RevenueCat: entitlement `pro`, offering `default`) — PROPOSED, needs Brian's OK
- `given_pro_yearly` — auto-renewing subscription, **$9.99/yr** (hero: annual tax ritual)
- `given_pro_lifetime` — non-consumable IAP, **$24.99** (anchor)
- ONE subscription group "Given Pro" with GROUP-level localization set immediately
- Free tier: 10 donations; no time-limited trial (a trial would let users export the year's PDF and cancel)

## App Review Notes (paste into ASC)
The subscription's title, length, price, and functional Terms of Use (EULA) and
Privacy Policy links are shown inside the app on the paywall screen, pinned at the
bottom (visible without scrolling), plus in Settings → Purchases. Restore Purchases
is on the paywall and in Settings. The app is fully usable without an account;
all data is stored on-device. Camera/photo access is used only to attach photos of
receipts or donated items. The value guide and tax notes are informational
record-keeping aids, clearly labeled as not tax advice; the app does not file
taxes or connect to any tax authority.

## App Privacy labels
- Purchases → Purchase History: App Functionality, not linked, no tracking
- Everything else: Data Not Collected

## URLs
- Privacy: https://bkdigitalleads-cmyk.github.io/given/privacy.html
- Support: https://bkdigitalleads-cmyk.github.io/given/support.html
- Marketing: https://bkdigitalleads-cmyk.github.io/given/

## Screenshot shot list (Brian, 6.9" device, 5–6 shots)
1. Giving tab: year chips, hero total with cash/goods/mileage breakdown, several donations with a receipt thumbnail (hero)
2. Add donation: Goods selected, charity chips, value with "Add items from the value guide" button, condition chips
3. Value guide sheet open (Clothing section, running total visible)
4. Year-end PDF in share sheet (money shot: charity group + notes for preparer)
5. Summary tab (totals, flags card, export cards)
6. Paywall (yearly hero) — also record the 30–60s paywall video here
