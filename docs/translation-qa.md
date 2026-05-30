# Care+ — Arabic translation QA log

Walk-through checklist for the **pre-launch** second-native-speaker QA
pass (per plan §13). Reviewer must NOT be the original translator.

Sign off each surface with: date, reviewer initials, issues found,
screenshot link, follow-up tickets. A surface is "shipped" only when
every page below has an entry with no open issues.

## How to run a pass

1. Open `/ar` and `/en` versions of the page side-by-side in two
   browser windows.
2. Read every visible string aloud. Flag anything that:
   - Reads dialect rather than MSA.
   - Reads literal-translated English rather than natural Arabic.
   - Uses wrong gender for the recipient (see plan §13).
   - Breaks layout: line wraps badly, overflows cards, splits awkwardly.
   - Mixes RTL/LTR poorly (numbers, prices, codes inside Arabic text).
3. Test interactive elements: form submissions, error states, toasts,
   empty states.
4. Take a screenshot of any issue + link it in the row below.

## Public surface

| Page | Reviewer | Date | Status | Notes |
| --- | --- | --- | --- | --- |
| `/ar` (home) | | | | |
| `/ar/services` | | | | |
| `/ar/services/packages` | | | | |
| `/ar/services/packages/[id]` (one sample) | | | | |
| `/ar/services/one-time` | | | | |
| `/ar/services/shifts` | | | | |
| `/ar/community` | | | | |
| `/ar/community/[id]` (one sample) | | | | |
| `/ar/login` | | | | |
| `/ar/register` | | | | |
| `/ar/forgot-password` | | | | |
| `/ar/privacy` | | | | |
| `/ar/terms` | | | | |
| `/ar/pending-approval` | | | | |

## Patient surface

| Page | Reviewer | Date | Status | Notes |
| --- | --- | --- | --- | --- |
| `/ar/patient` (dashboard) | | | | |
| `/ar/patient/nurses` (marketplace) | | | | |
| `/ar/patient/nurses/[id]` | | | | |
| `/ar/patient/profile` | | | | |
| `/ar/patient/appointments` | | | | |
| `/ar/patient/records` | | | | |
| `/ar/patient/records/[id]` | | | | |
| `/ar/patient/store` | | | | |
| `/ar/patient/cart` | | | | |
| `/ar/patient/orders` | | | | |
| `/ar/patient/notifications` | | | | |
| Booking flow (5 steps) | | | | |
| Review submission | | | | |

## Nurse surface

| Page | Reviewer | Date | Status | Notes |
| --- | --- | --- | --- | --- |
| `/ar/nurse` (dashboard) | | | | |
| `/ar/nurse/setup` | | | | |
| `/ar/nurse/schedule` (week-start = Sunday) | | | | |
| `/ar/nurse/availability` | | | | |
| `/ar/nurse/bookings` | | | | |
| `/ar/nurse/earnings` | | | | |
| `/ar/nurse/records` | | | | |
| `/ar/nurse/store` | | | | |
| `/ar/nurse/notifications` | | | | |
| Booking accept / complete flow | | | | |
| Visit completion modal | | | | |

## Admin surface

| Page | Reviewer | Date | Status | Notes |
| --- | --- | --- | --- | --- |
| `/ar/admin` (dashboard) | | | | |
| `/ar/admin/nurses` | | | | |
| `/ar/admin/patients` | | | | |
| `/ar/admin/bookings` | | | | |
| `/ar/admin/packages` (bilingual editor) | | | | |
| `/ar/admin/products` (bilingual editor) | | | | |
| `/ar/admin/orders` | | | | |
| `/ar/admin/records` | | | | |
| `/ar/admin/community` | | | | |
| `/ar/admin/education` (bilingual editor) | | | | |
| `/ar/admin/notifications` | | | | |
| `/ar/admin/system-status` | | | | |
| `/ar/admin/settings` | | | | |

## Cross-cutting checks

| Item | Status | Notes |
| --- | --- | --- |
| Locale switcher visible in every chrome (public, patient, nurse, admin) | | |
| `<html lang="ar" dir="rtl">` set on every AR page | | |
| Mismatch banner shows once, dismisses, stays gone | | |
| Notifications relocalize when user toggles language | | |
| Firebase auth errors render in active locale | | |
| Dates show with Latin digits but Arabic month names | | |
| Currency renders with Latin digits and active currency symbol | | |
| Lucide chevrons / arrows flip in RTL | | |
| Forms: text inputs use `dir="auto"`; phone/price/codes stay LTR | | |
| Nurse schedule starts on Sunday in AR | | |
| Brand wordmark "Care+" stays Latin in Arabic body copy | | |

## Sign-off

- [ ] Every page row above has reviewer + date + "OK".
- [ ] All flagged issues either fixed or filed as post-launch tickets.
- [ ] Translation glossary up to date with any new canonical terms.
- [ ] Final go/no-go: ___ (lead reviewer name + date)
