# Care Plus — Master Execution Plan & Product Documentation

## Project Overview

Care Plus is a home healthcare platform connecting patients with verified nurses for:

- One-time medical services
- Shift-based care
- Long-term care packages
- Medical product purchases
- Community healthcare support

The platform supports three main user roles:

1. Patient
2. Nurse
3. Admin

Current stack:

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Firebase Authentication
- Firestore Database
- Firebase Hosting / Vercel Deployment

--- 

# Current Progress

- **Last Updated**: 2026-05-24 (Session 4 — Mobile Optimization & Responsive UX Pass)
- **Completion Percentage**: 97% (Mobile optimization complete across all major flows)

## Phases Status

*   **PHASE 1 — Security & Infrastructure Stabilization**: Completed
    *   *Task 1.1 — Secure Firestore Rules*: Completed — Role-based rules for all collections (users, nurseProfiles, bookings, products, orders, communityPosts, medicalRecords, patientProfiles)
    *   *Task 1.2 — Secure API Routes*: Completed — Bearer token check on `/api/nurses` GET and `/api/nurses/status` PATCH
    *   *Task 1.3 — Add Next.js Middleware*: Completed — `middleware.ts` guards `/patient/*`, `/nurse/*`, `/admin/*` via `careplus_session` cookie; session cookie set on login/register, cleared on logout
    *   *Task 1.4 — Firebase Storage Integration*: Completed (community image uploads, nurse profile image uploads already existed)
    *   *Task 1.5 — Booking Logic Stabilization*: Completed — Server-side validation, overlap detection, nurse status checks
*   **PHASE 2 — UX Refactor & Flow Unification**: Completed
*   **PHASE 3 — Patient Experience Upgrade**: Completed
    *   Patient dashboard: profile completeness banner, quick actions grid (Book/Records/Packages/Store), upcoming appointments (max 3), health tips
    *   Appointments page: full booking history, status badges, cancel button for pending
    *   Patient nav: added Appointments, Records, Community links
*   **PHASE 4 — Nurse Experience Upgrade**: Completed
    *   Availability page: pill-button day selectors, shift toggle cards (A/B/C), checkbox city grid, transport/overnight toggles, save with spinner
    *   Schedule page: already complete — grouped by date, TODAY badge, shift labels
    *   Nurse nav: added missing Availability link
*   **PHASE 5 — Admin Dashboard Expansion**: Completed
    *   Main dashboard: 6-metric grid, div-based 7-day booking trend bar chart, revenue progress bars (Total/Pending/This Month)
    *   Orders page: status filter tabs, expandable order cards, smart status transition buttons, live Firestore updates
    *   Patients/Nurses/Bookings/Products/Records pages: all implemented
    *   `getDashboardStats`: returns totalPatients, totalRevenue, pendingRevenue, thisMonthRevenue, 7-day trend data
*   **PHASE 6 — Booking System Expansion**: Completed
    *   *Core Task — Booking model & validation*: Completed
    *   *Task 6.1 — Package booking support*: Completed
    *   *Task 6.2 — Add-on services pricing*: Completed (client + server-side pricing engine)
    *   *Task 6.3 — Server-side pricing API*: Completed (`/api/bookings/pricing`)
    *   *Task 6.4 — Booking validation API*: Completed (`/api/bookings/validate`)
*   **PHASE 7 — Store System Upgrade**: Completed
    *   Store page: category filter tabs, live name/description search, gradient product cards, inline quantity controls, cart badge
    *   Cart page: real Firestore order creation, clearCart on checkout, order ID in success state, per-item subtotals, trash icon
    *   Seed data: 10 realistic healthcare products across 5 categories
    *   `storeService.ts`: added `createOrder()` writing to Firestore `orders` collection
    *   CartContext: added `removeItemCompletely()` and `clearCart()`
*   **PHASE 8 — Community System**: Completed
    *   Community page: renamed header, disclaimer banner, category filter (All/Wheelchairs/Walkers/Beds/Equipment/Other)
    *   CommunityCard: category badge, location icon, "View Details" button, contact mailto button
    *   PostForm: proper labels, category dropdown, contact sub-section, file input styled
    *   Post detail page: disclaimer, polished image, contact mailto/tel action buttons
*   **PHASE 9 — Medical Records System**: Completed
    *   Records list: improved empty state with icon and explanation text
    *   RecordCard: formatted date, nurse name, observation count badge, latest observation snippet
    *   Record detail: timeline view with emerald dots, VitalCard stat cards (BP, HR, temp, RR, O₂), medication note panel, alert badges, nurse-only ObservationForm section
    *   Admin records page: already fully implemented
*   **PHASE 10 — Final Polish**: In Progress (remaining items: mobile optimization, animations, review system, order tracking)

---

# UX & PRODUCT REMEDIATION — SESSION 3 (2026-05-24)

## Audit Score Before Remediation
- Product Experience: 6.5/10
- MVP Readiness: 7.0/10
- Healthcare Trust: 3.0/10

## Critical Issues Resolved

### Marketplace Integrity
- **FIXED:** Fake gender filter (`fullName.length % 2`) → now uses `nurse.gender` field
- **FIXED:** Fake shift filter (`fullName.length % 3`) → now uses `nurse.availableShifts[]` field
- **ADDED:** Sort options: Highest Rated / Lowest Price / Most Experienced
- **ADDED:** Guest browsing — unauthenticated users can browse `/patient/nurses` and `/patient/nurses/*`
- **ADDED:** Login redirect context — `?redirect=` param preserved through login/register flow

### Booking Integrity
- **FIXED:** `BookingStatus` type expanded — added `"cancelled"` (was missing, patient cancel used nurse `"rejected"`)
- **FIXED:** Cancel appointment — now uses `"cancelled"` status, has `window.confirm()` guard, shows slate badge
- **ADDED:** BookingForm step progress bar — "Step 2 of 5", named labels (Type/Service/Date & Time/Add-ons/Confirm), animated sky fill
- **ADDED:** Shift time labels — `SHIFT_LABELS` constant, A/B/C now show "(7:00 AM – 2:00 PM)" etc. throughout booking form
- **ADDED:** New patient onboarding redirect — registration → `/patient/profile?onboarding=true` with welcome banner
- **ADDED:** Post-booking auto-redirect — success screen auto-pushes to `/patient/appointments` after 3 seconds

### Store Reliability
- **FIXED:** Cart `patientId: "guest"` → reads `auth.currentUser?.uid` at checkout
- **ADDED:** localStorage cart persistence — survives page refresh and tab navigation
- **ADDED:** "Added!" toast feedback — button turns emerald for 1.5s on Add to Cart

### Trust & Compliance
- **CREATED:** `/privacy` — Privacy Policy page (5 sections: data collection, usage, security, rights, contact)
- **CREATED:** `/terms` — Terms of Service page (5 sections: platform purpose, nurse verification, patient responsibilities, community, liability)
- **ADDED:** Footer legal links — Privacy Policy, Terms of Service, Contact Us
- **ADDED:** Nurse profile trust card — "Verified Healthcare Professional" with identity/license/background check indicators
- **ADDED:** Medical records privacy notice — encrypted data notice with link to privacy policy
- **ADDED:** Booking form T&C checkbox — must accept Terms & Privacy before submitting booking

### UX Consistency
- **CREATED:** Shared `EmptyState` component — consistent icon/title/description/CTA across all empty states
- **ADDED:** Nurse marketplace filter count badge — shows "2 active" on mobile toggle and desktop sidebar
- **ADDED:** "Verified" emerald badge on all `NurseMarketplaceCard` components
- **ADDED:** Nurse booking rejection confirmation — `window.confirm()` guard before rejecting
- **ADDED:** Post-booking redirect message — "Redirecting to your appointments shortly…"

## Completed — Session 4: Mobile Optimization & Responsive UX Pass

All major flows audited and refined for phones, tablets, and smaller laptops:

- **Homepage**: Reduced `space-y-28 py-24` → `space-y-16 py-12` on mobile; hero h1 from 2.6rem → 2rem on mobile; all section headings made responsive (`text-2xl sm:text-4xl`); hero section vertical padding tightened
- **Booking Form**: Step labels "Date & Time" → "Schedule", "Confirm" → "Review" to prevent overflow on 320px; switched to `text-[10px] sm:text-xs`; booking type radios converted to full-width `grid-cols-3` with hidden `<input>` for cleaner touch targets
- **Community page**: Long title "Community Donations — Healthcare Equipment Exchange" reduced to "Community Donations" at `text-2xl sm:text-3xl`; subtitle shown inline on mobile
- **Nurse dashboard**: Stat cards changed to `flex-col sm:flex-row` on mobile, icon/text scaled down; hero padding `p-6 sm:p-10`; welcome heading `text-2xl sm:text-4xl`
- **Patient dashboard**: Hero `p-6 sm:p-12`; welcome heading `text-2xl sm:text-5xl`; subtitle `text-sm sm:text-lg`; CTA button scaled; `space-y-12` → `space-y-8 sm:space-y-12`; store section heading responsive
- **Admin dashboard**: Welcome hero `p-6 sm:p-8`, heading `text-2xl sm:text-3xl`; stat grid changed to `grid-cols-2` on mobile; stat card icons/padding scaled down with `sm:` breakpoints
- **Appointments card**: Added `min-w-0 truncate` to nurse name; icon scaled down; status badge text reduced to `text-[10px] sm:text-xs`; padding `p-5` (from `p-6`)
- **Nurse marketplace**: Page title `text-2xl sm:text-3xl`, description `text-sm sm:text-base`
- **Store hero**: Padding `p-6 sm:p-10`; heading `text-xl sm:text-4xl`; description simplified on mobile
- **Auth pages**: Register role cards `p-4 sm:p-6 gap-4 sm:gap-5`; icons `h-12 sm:h-14`
- **Navbar**: Mobile toggle enlarged to `h-10 w-10 rounded-xl` with `active:bg-slate-100` for better touch feedback
- **Admin/Nurse page headings**: Bookings, Nurses, Patients, Profile pages all set to `text-2xl sm:text-3xl`

## Remaining Issues
- Patient order history page (no patient-facing orders tracking page yet)
- Review/rating system (post-visit feedback form for patients)
- In-app notification system (no real-time alerts for booking acceptance)
- Nurse profile photo upload (Firebase Storage upload for profile image)
- Animation polish (page transitions, micro-interactions)

---

# Storage Decision

## Selected Storage Solution

### Primary Choice
Use:

- Firebase Storage

Reason:

- Already integrated with Firebase ecosystem
- Easy integration with current architecture
- Good enough for MVP
- Supports image uploads and certificates

---

## Backup Alternative

If Firebase Storage free limits become restrictive:

Use:

- Cloudinary

Cloudinary will be used for:

- Nurse profile images
- Product images
- Community donation images
- Certificates

Reason:

- Excellent free tier
- Easy image optimization
- CDN delivery
- Fast implementation

---

# Current MVP Status

## Already Functional

- Authentication
- Role system
- Patient dashboard
- Nurse dashboard
- Admin dashboard
- Booking creation
- Firestore integration
- Nurse approval flow
- Product store structure
- Basic filtering
- Responsive UI

---

## Still Missing / Weak

- Firebase security rules
- Protected API routes
- Middleware protection
- Firebase Storage integration

## Community System

Added a lightweight Community/Donations module to support listing donated healthcare equipment.

Collections:
- `communityPosts` — donation posts (title, description, category, images, location, contact, createdAt, createdBy)
- `communityCategories` — optional categories for posts

Routes / Pages:
- `/community` — landing page with post creation form and listing
- `/community/[id]` — donation details page

New Services & Components:
- `services/communityService.ts` — Firestore helpers: `createDonationPost`, `getDonationPosts`, `getDonationPostById`, `getDonationCategories`
- `components/community/CommunityCard.tsx` — card used in feed
- `components/community/PostForm.tsx` — client-side form with optional image upload to Firebase Storage

Storage:
- Reuses Firebase Storage (client-side upload via `uploadBytesResumable` + `getDownloadURL`). Images are stored under `community/` path.

Notes:
- The system only provides listing and contact details. Platform explicitly disclaims responsibility for transactions, deliveries, or payments. Users must contact donors externally.

- Real image uploads
- Payment integration
- Care packages system
- Additional services pricing logic
- Community system
- Medical records system
- Smart availability validation
- Transportation pricing
- Real analytics

## Medical Records System

Added a lightweight Medical Records module for patient visit documentation, nurse observations, and vitals tracking.

Collections:
- `medicalRecords` — top-level records linking `patientId`, optional `nurseId`, optional `bookingId`, `summary`, timestamps.
- `medicalRecords/{recordId}/observations` — subcollection of nurse observations with `note`, `vitals`, `medicationNote`, `alerts`, `timestamp`, and `nurseId`.

Services & Components:
- `services/medicalService.ts` — Firestore helpers: `createMedicalRecord`, `addObservation`, `getRecordsForPatient`, `getRecordById`, `getRecordsForBooking`.
- `components/medical/RecordCard.tsx` — compact card for record listing.
- `components/medical/ObservationForm.tsx` — nurse form to add observations and vitals (client-side).

Routes / Pages:
- `/patient/records` — patient-facing record history (list), uses `getRecordsForPatient`.
- `/patient/records/[id]` — record detail with observation timeline and nurse observation form (nurse-only add).
- Admin: existing [admin/records] page is available for auditing records; medical records are stored separately and can be surfaced here or via a dedicated admin view in the future.

Notes & Next Steps:
- Preserves booking relationships — `medicalRecords` may reference `bookingId` when created during or after a visit.
- Observations are stored in a subcollection for efficient append and auditability.
- Security: add Firestore rules to ensure only nurses or authorized staff can create/append observations; patients can read their records.
- UX: timeline-style listing, calm colors, small reusable cards similar to platform patterns.

---

# MASTER EXECUTION ROADMAP

---

# PHASE 1 — Security & Infrastructure Stabilization

## Goal
Make the current MVP secure and stable before scaling features.

---

## Task 1.1 — Secure Firestore Rules

### Objectives

Protect all collections properly.

### Required Rules

#### Users
- User can read/update only their own profile
- Admin can manage all users

#### Nurse Profiles
- Nurse can edit only their own profile
- Patients can read approved nurses only
- Admin can manage all profiles

#### Patient Profiles
- Patient can edit only their own profile
- Admin can view all profiles

#### Bookings
- Patient can create own bookings
- Nurse can view assigned bookings
- Admin can view all bookings

#### Orders
- Patient can create/view own orders
- Admin can manage all orders

#### Products
- Public read access
- Admin-only write access

---

## Task 1.2 — Secure API Routes

### Problem
Current admin APIs are publicly accessible.

### Required Fixes

Protect:

- /api/nurses
- /api/nurses/status

Requirements:

- Verify Firebase Auth token
- Verify admin role
- Reject unauthorized requests

---

## Task 1.3 — Add Next.js Middleware

### Goals

Protect routes server-side.

### Required Middleware Logic

#### Guests
Cannot access:

- /patient/*
- /nurse/*
- /admin/*

#### Patients
Cannot access:

- /admin/*
- /nurse/*

#### Nurses
Cannot access:

- /admin/*
- /patient/*

#### Admin
Full access

---

## Task 1.4 — Firebase Storage Integration

### Required Uploads

#### Nurse
- Profile image
- Certificates

#### Patient
- Optional medical files later

#### Store
- Product images

#### Community
- Donation item images

---

## Task 1.5 — Booking Logic Stabilization

### Required Validations

#### Prevent Double Booking
A nurse cannot accept overlapping appointments.

#### Validate Shift Availability
Booking must match nurse available shifts.

#### Validate Dates
No past booking dates.

#### Validate Nurse Status
Only approved nurses can receive bookings.

---

# PHASE 2 — UX Refactor & Flow Unification

## Goal
Unify the public and authenticated experience into one cohesive platform while preserving existing booking and dashboard functionality.

## Progress Update

- Completed:
    - Unified navbar chrome for guest and authenticated states.
    - Personalized landing blocks for logged-in patients above the public homepage content.
    - Shared shell for service pages so they inherit the same platform look and navigation.
    - Login/register routing now returns patient users to the landing experience.
    - Reduced landing-page CTA density by removing the extra closing CTA panel.
    - Guest browsing now stays open on patient browse routes while booking remains gated.
    - Booking intent now survives from filtered nurse lists into nurse profiles and booking forms.
    - Care packages now have a concrete package-plan breakdown instead of only a generic shell.
- 2026-05-24: Added anchor-based landing navigation, an auto-rotating hero carousel, and a packages preview section.
- 2026-05-24: Added dedicated services routes and prefiltered booking navigation for one-time, shift-based, and package flows.
- 2026-05-24: Reworked the services section into three categories and added route-backed /services pages plus marketplace prefiltering.
- 2026-05-24: Softened the services hub and booking pages so they feel like part of the same platform shell.

## Modified Files

- [app/page.tsx](app/page.tsx)
- [app/login/page.tsx](app/login/page.tsx)
- [app/register/page.tsx](app/register/page.tsx)
- [app/patient/layout.tsx](app/patient/layout.tsx)
- [app/patient/page.tsx](app/patient/page.tsx)
- [app/patient/nurses/page.tsx](app/patient/nurses/page.tsx)
- [app/patient/nurses/[id]/page.tsx](app/patient/nurses/[id]/page.tsx)
- [app/services/page.tsx](app/services/page.tsx)
- [app/services/one-time/page.tsx](app/services/one-time/page.tsx)
- [app/services/shifts/page.tsx](app/services/shifts/page.tsx)
- [app/services/packages/page.tsx](app/services/packages/page.tsx)
- [components/layout/PlatformNavbar.tsx](components/layout/PlatformNavbar.tsx)
- [components/layout/PlatformFooter.tsx](components/layout/PlatformFooter.tsx)
- [components/layout/PlatformShell.tsx](components/layout/PlatformShell.tsx)
- [components/patient/BookingForm.tsx](components/patient/BookingForm.tsx)
- [components/patient/NurseMarketplaceCard.tsx](components/patient/NurseMarketplaceCard.tsx)
- [components/services/ServiceBookingPage.tsx](components/services/ServiceBookingPage.tsx)
- [components/services/ServiceCategoryCard.tsx](components/services/ServiceCategoryCard.tsx)

## Remaining Issues

- The legacy patient dashboard route still exists and can be used directly, so the next cleanup pass should decide whether to visually align it with the landing-first experience.
- The authenticated navbar menu is functional but intentionally lightweight; it does not yet include a notifications center or deeper account actions.
- The booking flow is still using the existing Firestore write path; the next expansion pass should add validation around package-specific selections and booking constraints.

## Architecture Notes

- The authenticated patient landing experience now lives on the same `/` entry point as the public homepage.
- Service pages share the same shell, navbar, and footer so they feel like one platform instead of separate microsites.
- Booking and filtering behavior were preserved by routing service CTAs into the existing nurse marketplace and booking flows.
- Selected service and shift context now survives into the nurse profile booking form, reducing friction between discovery and booking.

---

# Navbar Requirements

## Navigation Items

- Home
- Services
- Packages
- Nurses
- Store
- Community
- Join as Nurse
- Login
- Get Started

---

# Hero Section Requirements

## Replace Static Hero

Use:

- Hero carousel
- Smooth transitions
- Multiple healthcare images

### Content

Headline:
Trusted Home Care at Your Doorstep

Subheadline:
Professional nurses and compassionate healthcare services delivered to your home.

### CTA Buttons

- Find a Nurse
- Join as Nurse

---

## Hero Image Requirements

Images should include:

- Nurses helping elderly patients
- Home healthcare environment
- Medical support scenes
- Warm emotional healthcare moments

Style:

- Modern
- Professional
- Human-centered
- Trustworthy

---

# Services Section

## Required Categories

### One-Time Services

- IV injections
- IM injections
- Wound dressing
- Burn care
- Blood sample collection
- Special needs support

---

## Pricing Engine — Server-side Pricing (New)

**Last Updated**: 2026-05-24 18:26 (Local Time)

Overview:

- Introduced a centralized, authoritative server-side pricing engine to replace fragile duplicated client calculations.
- Pricing covers one-time services, shift bookings, and multi-day care packages. It applies add-ons, transportation fees, and overnight fees, and returns a structured breakdown (base, addons, transport, overnight, subtotal, tax, total).

Files added/modified:

- `services/pricingService.ts`: centralized pricing logic and nurse-profile lookup.
- `app/api/bookings/pricing/route.ts`: POST endpoint `/api/bookings/pricing` that returns canonical pricing for a proposed booking.
- `components/patient/BookingForm.tsx`: now requests server pricing when user reaches the final checkout step and uses server-provided totals for booking submissions.

Pricing fields added to payloads:

- `pricing.base`: numeric base amount
- `pricing.addons`: list of applied add-ons with `id`, `name`, and `price`
- `pricing.transport`: transportation fee (if applicable)
- `pricing.overnight`: overnight allowance/fee (if applicable)
- `pricing.subtotal`: pre-tax subtotal
- `pricing.tax`: tax amount applied (5% currently)
- `pricing.total`: final total charged/stored

Notes on calculation:

- The server fetches nurse profile details (service list, `pricePerHour`, `acceptsOvernight`) to derive base rates.
- Shift pricing assumes an 8-hour shift when computing the shift base.
- Package pricing is computed as daily coverage (8 hours/day * hourly rate) multiplied by `durationDays`.
- Add-on items are canonicalized to a known list; transportation adds a fixed fee when selected.
- Overnight shift (`C`) triggers an overnight allowance which is smaller when the nurse `acceptsOvernight`.
- Tax is applied as a 5% flat rate in the current MVP.

Developer actions and next steps:

- The BookingForm now shows server-calculated pricing on the final step; client-side estimates are preserved as UX fallbacks.
- Next: add server-side pricing validation before finalizing payments (wallet/checkout), and add tests around `computePricing` for edge cases (promotions, discounts, regional taxes).

---

## Packages & Additional Services (New)

Overview:

- Implemented curated care packages (Post-Op, Elderly Companion, Total Dependence, Palliative).
- Added dedicated package browsing pages and package detail pages with included services lists and duration visibility.
- Users can book a package directly from the package detail page — the flow preselects package and duration when navigating into the nurse listing and profile booking form.

Files added/modified:

- `lib/packagesCatalog.ts`: canonical package definitions and included services.
- `components/packages/PackageCard.tsx`: package summary card used on the packages listing.
- `components/packages/PackageDetail.tsx`: package detail view with CTA to book the package.
- `app/services/packages/page.tsx`: packages listing page.
- `app/services/packages/[id]/page.tsx`: package detail pages.
- `components/common/AddOnItem.tsx`: reusable add-on checkbox component.
- `components/patient/BookingForm.tsx`: accepts `initialPackage` and `initialDurationDays` from nurse profile query params and preserves package selection through booking flow.
- `app/patient/nurses/[id]/page.tsx`: forwards `package` and `durationDays` query params into the booking form.

Package UX notes:

- Package detail pages show included services, highlights, and an explicit duration. The CTA uses calm, healthcare-oriented language and leads users into the nurse browse + booking flow with the package preselected.
- Pricing preview for packages uses the server pricing engine; the BookingForm requests server pricing on the final step and the server applies package-level computation (daily coverage × duration).

Add-on UX notes:

- Add-ons (Cooking, Transportation, Shopping, Cleaning, Companion support) now have a reusable `AddOnItem` component used in the booking summary and can be reused across package pages later.
- Add-ons are included in the server pricing calculation via the `pricingService`.

Nurse capability updates:

- `NurseProfile` now includes `packagesSupported`, `additionalServices`, `willingToServeLocations`, and `transportAvailable` fields so nurses can advertise support for packages and add-ons.

Progress update:

- Packages listing and detail pages implemented, add-on UI component added, booking flow wired to preselect packages and durations, and documentation updated.

Remaining blockers:

- Add UI for nurses to manage package availability and add-on service toggles (nurse dashboard work).
- Add package-specific availability rules (e.g., limited nurse capacity for packages) to `validateBooking` if needed.
- Add tests and secure API routes (scheduled for a later security phase).


Progress update:

- Added pricing service and API route. Client booking flow now requests server pricing and submits server totals. Updated execution plan and todos.


---

### Shift-Based Services

Allow patient to book:

- Shift A
- Shift B
- Shift C

For:

- One day
- Multiple days
- Monthly care

---

### Care Packages

Packages:

- Post-Op Care
- Elderly Companion Care
- Total Dependence Care
- Palliative Care

---

# Remove Current Top Nurses Section

Replace with:

## Smart CTA Section

Example:

"Find the right caregiver for your needs"

With:

- Search CTA
- Filter CTA
- Explore Nurses CTA

---

# Add Community Section

Purpose:

Allow users to donate medical equipment.

Examples:

- Wheelchairs
- Walkers
- Hospital beds
- Medical chairs

Important:

Platform only displays posts.

Communication happens outside platform.

No payments involved.

---

# Add Store Preview Section

Display:

- Best sellers
- Featured products
- Medical essentials

Examples:

- Gloves
- Blood pressure devices
- Thermometers
- Medical masks

---

# Add Testimonials Section

Display:

- Patient stories
- Trust indicators
- Care experiences

Style:

- Emotional
- Human-centered
- Warm

---

# PHASE 3 — Patient Experience Upgrade

## Goal
Make patient dashboard feel alive and personalized.

---

# Patient Dashboard Requirements

## Sections

### Upcoming Appointments

Display:

- Nurse
- Date
- Shift
- Status

---

## Booking System Implementation (2026-05-24)

Summary:

- Expanded booking data model to support `bookingType` (one-time, shift, package), `packageId`, `durationDays`, `shift`, and a `pricing` breakdown stored with each booking.
- Added server-side validation in `services/bookingService.ts` (`validateBooking`) to enforce: no past dates, nurse `status === 'approved'`, shift availability, and simple overlap prevention (same nurse/date/shift or same nurse/date/time).
- Enhanced booking creation to include `pricing` object with `base`, `addons`, `subtotal`, `tax`, and `total`.

Modified collections / new fields:

- `bookings` collection: new fields stored on create — `bookingType`, `packageId`, `durationDays`, `shift`, `pricing` (object), `addons` (inside pricing.addons).

New/updated components and services:

- `components/patient/BookingForm.tsx`: extended to support booking type selection, package selection, add-on selection, duration, pricing summary, and sends pricing details to the booking service.
- `services/bookingService.ts`: added `validateBooking` and integrated validation into `createBooking`.
- `lib/types.ts`: expanded `Booking` type with bookingType, packageId, durationDays, shift, and pricing breakdown.

Notes & Next steps:

- Current overlap prevention is conservative (checks identical date+shift or date+time). A follow-up should add time-range checks for partial overlaps and recurring package schedules.
- Add server-side endpoint to compute pricing and availability if stronger authorization is needed.
- Update Firestore security rules to enforce server-side invariants (only allow writes that pass validation). This is planned in PHASE 1.
 - Implemented a server-side validation endpoint at `/api/bookings/validate` that reuses the same validation logic.
 - Improved overlap detection: one-time bookings now check +/- 60 minutes for neighboring bookings; package bookings check the full date range for conflicts.

---

### Health Tips / Articles

Examples:

- Recovery tips
- Elderly care tips
- Hydration reminders
- Medication awareness

---

### Recommended Nurses

Based on:

- Services
- Location
- Ratings

---

### Store Recommendations

Display:

- Best sellers
- Suggested products

---

### Quick Actions

- Book nurse
- Explore packages
- Open store
- Medical records

---

### Complete Profile CTA

If profile incomplete:

Display reminder banner.

Patient cannot finalize booking until profile is completed.

---

# Patient Profile Requirements

## Required Fields

- Full name
- Phone number
- Address
- Emergency contact
- Medical history
- Allergies
- Current medications
- Diseases

---

# PHASE 4 — Nurse Experience Upgrade

## Goal
Create professional nurse workspace.

---

# Nurse Dashboard Requirements

## Sections

### Upcoming Appointments

### Earnings Overview

### Availability Management

### Shift Management

### Booking Requests

### Completed Sessions

### Performance Stats

### Ratings & Reviews

---

# Nurse Profile Requirements

## Required Fields

### Basic Info

- Name
- Image
- Bio
- Gender
- Experience years

---

### Medical Qualifications

- Certificates
- Specialization
- Skills

---

### Services

Nurse can select:

- One-time services
- Packages
- Additional services

---

### Availability

- Shift A
- Shift B
- Shift C

---

### Locations

Nurse can specify:

- Current city
- Willing-to-serve locations

Examples:

- Nablus
- Ramallah
- Jenin

---

### Transportation Fee

If outside primary city:

Additional fee may apply.

---

### Additional Services

Examples:

- Cooking
- Transportation
- Shopping
- Cleaning
- Companion care

---

# PHASE 5 — Admin Dashboard Expansion

## Goal
Turn admin panel into full operational dashboard.

---

# Admin Dashboard Requirements

## Required Sections

### Analytics

- Total users
- Total bookings
- Revenue
- Active nurses
- Active patients

---

### Nurse Management

- Approve/reject nurses
- View certificates
- Suspend accounts

---

### Booking Management

- View all bookings
- Filter bookings
- Change statuses

---

### Product Management

- Add products
- Edit products
- Delete products
- Upload product images

---

### Orders Management

- View orders
- Update statuses
- Track totals

---

### Medical Records Access

Admin can:

- View medical records
- Audit nurse notes

---

### Community Moderation

- Remove inappropriate donation posts

---

# PHASE 6 — Booking System Expansion

## Goal
Create realistic healthcare booking flow.

---

# Booking Types

## Type 1 — One-Time Service

Examples:

- IV injection
- Wound dressing

Booking flow:

1. Select service
2. Select date/time
3. Select nurse
4. Confirm booking

---

## Type 2 — Shift Booking

Examples:

- Shift A for 7 days
- Shift B for 1 month

Booking flow:

1. Select shift
2. Select duration
3. Select nurse
4. Confirm booking

---

## Type 3 — Care Packages

### Packages

#### Post-Op Care

Includes:

- Medication management
- Wound care
- Recovery monitoring
- Mobility assistance

---

#### Elderly Companion Care

Includes:

- Daily support
- Medication reminders
- Emotional support
- Mobility assistance

---

#### Total Dependence Care

Includes:

- Full daily assistance
- Feeding support
- Hygiene support
- Position changing

---

#### Palliative Care

Includes:

- Comfort care
- Pain monitoring
- Emotional support
- Quality of life care

---

# Additional Services Logic

## Examples

- Cooking
- Transportation
- Shopping
- Cleaning

Each service:

- May add additional cost
- May be optional

---

# Pricing System

## Pricing Components

### Base Service Price

### Additional Services Fees

### Transportation Fees

### Overnight Fees

### Package Pricing

---

# Smart Filtering Requirements

## Patient Can Filter By

- Service
- Package
- Gender
- Location
- Availability
- Experience
- Rating
- Additional services
- Transportation

---

# Auto-Fill Booking Logic

## Requirement

Store selected filters in localStorage.

When user opens booking form:

Auto-fill:

- Service
- Shift
- Location
- Preferences

---

# PHASE 7 — Store System Upgrade

## Goal
Create proper healthcare store experience.

---

# Store Features

## Product Categories

Examples:

- Medical equipment
- Monitoring devices
- Recovery products
- Elderly support products

---

# Product Requirements

- Real images
- Price
- Description
- Stock status

---

# Cart System

## Features

- Add/remove products
- Quantity updates
- Mock checkout

---

# Orders

## Order Statuses

- Pending
- Processing
- Delivered
- Cancelled

---

# PHASE 8 — Community System

## Goal
Allow community healthcare support.

---

# Community Features

## Donation Posts

User can post:

- Medical equipment
- Support items
- Recovery equipment

---

# Donation Post Fields

- Title
- Description
- Image
- Contact information
- Location

---

# Important Rule

Platform is NOT responsible for payments or delivery.

Communication happens externally.

---

# PHASE 9 — Medical Records System

## Goal
Create real medical tracking.

---

# Medical Records Collection

Create dedicated Firestore collection.

---

# Nurse Notes

Nurse can add:

- Vitals
- Observations
- Medication notes
- Recovery notes
- Alerts

---

# Patient Records

Patient can:

- View history
- View appointments
- View nurse notes

---

# PHASE 10 — Final Polish

## Goal
Make MVP presentation-ready.

---

# Required Improvements

## UI Polish

- Better animations
- Better spacing
- Better loading states
- Better empty states
- Better typography

---

## UX Polish

- Toast notifications
- Smooth onboarding
- Better forms
- Better navigation

---

## Mobile Optimization

- Responsive improvements
- Better mobile interactions

---

# DEVELOPMENT STRATEGY

## Important Rule

DO NOT implement everything at once.

Work incrementally.

---

# Recommended Prompt Workflow

## Example

### Prompt 1
Secure Firestore rules and API routes.

### Prompt 2
Add Firebase Storage image uploads.

### Prompt 3
Rebuild landing page hero carousel.

### Prompt 4
Implement packages system.

---

# IMPORTANT MVP NOTES

## Payments

Payments remain mocked for MVP.

No Stripe integration required currently.

Supported options:

- Cash
- Mock online payment

---

## Scalability Goal

This project should evolve from:

"Nurse booking platform"

into:

"Complete Home Healthcare Ecosystem"

