import type { LocalizedString } from "@/lib/i18nContent";

export type UserRole = "admin" | "nurse" | "patient";

export type UserStatus = "pending" | "approved" | "rejected";

export type BookingStatus = "pending" | "accepted" | "rejected" | "completed" | "cancelled";

export type NurseDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface NurseServiceItem {
  name: string;
  price: number;
}

// Credential document attached to a nurse profile. The url points at the
// uploaded file in S3 (PDF or image). Legacy records that pre-date file
// storage may carry strings here; nurseService.ts coerces those into
// objects with url:"" on read so the UI doesn't crash.
export interface NurseCertificate {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
}

export interface NurseAvailabilityHours {
  from: string;
  to: string;
}

// Provider kind discriminator. Care+ launched as a nurse-only marketplace;
// physiotherapists were added as a second provider type behind the
// admin-controlled `siteSettings.physiotherapyEnabled` flag. The nurse
// infrastructure (collection, routes, services) handles both kinds —
// this field is the only thing that tells them apart at the data layer.
// Missing on legacy records → treated as "nurse" by every reader.
export type ProviderKind = "nurse" | "physio";

export interface NurseProfile {
  userId: string;
  // See ProviderKind above. Optional for back-compat with pre-physio
  // records; readers should default to "nurse" when absent.
  providerKind?: ProviderKind;
  fullName: string;
  profileImage: string;
  bio: string;
  specialization: string;
  services: NurseServiceItem[];
  // Legacy hourly rate. Still used as: (a) the per-named-service fallback
  // denominator for one-time bookings, (b) the shift-pricing fallback
  // (× SHIFT_BILLED_HOURS) for nurses who haven't yet set pricePerShift.
  // New shift bookings should use pricePerShift instead.
  pricePerHour?: number;
  // Flat per-shift prices in the platform currency. When set, the shift
  // booking total is exactly pricePerShift[shift] — no hourly × N math,
  // no overnight surcharge (shift C already encodes the overnight premium).
  // Any shift omitted means the nurse does not offer that shift.
  pricePerShift?: { A?: number; B?: number; C?: number };
  rating: number;
  availableDays: NurseDay[];
  availableHours: NurseAvailabilityHours;
  acceptsOvernight: boolean;
  skills: string[];
  experienceYears: number;
  location?: string;
  gender?: "male" | "female" | "other";
  availableShifts?: string[];
  certificates?: NurseCertificate[];
  packagesSupported?: string[];
  // Custom add-on offerings stacked on top of the global add-on catalog
  // when this nurse is booked. Booking form shows these in place of the
  // global add-ons; pricing service validates ids against this list.
  additionalServices?: NurseServiceItem[];
  willingToServeLocations?: string[];
  transportAvailable?: boolean;
  languages?: string[];
  // Vacation / leave mode. When onLeave is true, validateBooking rejects
  // future bookings overlapping the [leaveStartDate, leaveEndDate] range.
  // Either bound may be omitted: missing start = leave starts now,
  // missing end = leave is open-ended.
  onLeave?: boolean;
  leaveStartDate?: string;
  leaveEndDate?: string;
  // Aggregate cached on the profile doc; recomputed on each new review.
  reviewCount?: number;
  // Optional descriptive content shown on the nurse detail page.
  carePhilosophy?: string;
  gallery?: string[];
}

export interface NurseReview {
  id: string;
  nurseId: string;
  patientId: string;
  patientName?: string;
  bookingId?: string;
  rating: number; // 1–5 inclusive
  comment: string;
  createdAt: string;
}

export interface NurseMarketplaceProfile extends NurseProfile {
  email: string;
  status: UserStatus;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

// A named address a patient can book against. Supports the "book for self
// vs. parent's house" use case. The locations[] field is the source of
// truth going forward; `defaultLocation` is kept as a derived mirror of
// the entry flagged isDefault so legacy readers keep working.
export interface PatientLocation {
  id: string;
  label: string;        // "Home", "Work", "Mother's house", etc.
  address: string;
  isDefault?: boolean;
}

export interface PatientProfile {
  userId: string;
  defaultLocation: string;
  locations?: PatientLocation[];
  medicalHistory: string;
  phone?: string;
  diseases?: string[];
  paymentMethods?: string[];
  profileCompleted?: boolean;
  // Phase 4.2 additions — all optional so legacy records keep working.
  emergencyContact?: EmergencyContact;
  allergies?: string[];
  currentMedications?: string[];
  // Canonical condition ids from lib/medicalConditions.ts. New primary
  // input for the medical section; the legacy `diseases` array stays
  // around to hold free-text "other condition not in the list" strings
  // captured via the same picker.
  conditions?: string[];
  dateOfBirth?: string;
  bloodType?: string;
  // Identity verification (post-launch gate before first booking).
  // idDocumentKey holds the S3 object key (not a URL) — IDs live under a
  // private prefix and are read only via short-lived signed URLs. Admin
  // sets verificationStatus to "verified" or "rejected" after review.
  idDocumentKey?: string;
  verificationStatus?: "pending" | "verified" | "rejected";
  verifiedAt?: string;
  verifiedBy?: string;
  verificationNote?: string;
}

export interface Booking {
  id: string;
  patientId: string;
  nurseId: string;
  service: string;
  bookingType?: "one-time" | "shift" | "package";
  packageId?: string;
  durationDays?: number; // for multi-day / package bookings
  durationMinutes?: number; // for one-time bookings length in minutes
  shift?: string; // A | B | C
  price: number;
  pricing?: {
    base: number;
    addons?: { id: string; name: string; price: number }[];
    transport?: number;
    subtotal?: number;
    // Legacy: historical bookings persisted a tax line. New bookings never
    // write it; PriceBreakdown only renders the row when > 0 so old totals
    // still display correctly without re-running tax math.
    tax?: number;
    total?: number;
  };
  date: string;
  time: string;
  location: string;
  notes: string;
  status: BookingStatus;
  createdAt: string;
  rejectionReason?: string;
  // Snapshot fields denormalized at create time so the appointments + bookings
  // pages don't need a follow-up join to render the participant names.
  // Older bookings without these fall back to the join.
  patientNameSnapshot?: string;
  patientEmailSnapshot?: string;
  nurseNameSnapshot?: string;
  nurseSpecializationSnapshot?: string;
  nurseProfileImageSnapshot?: string;
}

export interface BookingWithParticipants extends Booking {
  patientName: string;
  patientEmail: string;
  nurseName: string;
  nurseSpecialization?: string;
  nurseProfileImage?: string;
}

// Consent block captured at signup. Stores the exact version strings
// (from lib/consentVersions.ts) the user agreed to + when. Optional on
// AppUser so legacy accounts that pre-date consent capture keep working.
export interface UserConsent {
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  // Provider kind for users with role === "nurse". Carries the choice
  // from registration to the profile-setup form so a physiotherapist
  // sees physio-appropriate specializations + service options on first
  // load. Always undefined for patients and admins. Missing on legacy
  // nurse records → treated as "nurse" by readers.
  providerKind?: ProviderKind;
  status: UserStatus;
  createdAt: string;
  consent?: UserConsent;
  // Persisted UI language preference. Captured at signup from the
  // active locale; users can change it from profile/settings and via
  // the navbar locale switcher. Optional so legacy accounts keep working.
  language?: "en" | "ar";
  // Sign-in provider. Defaults to "email" for back-compat — legacy
  // accounts created before Google sign-in shipped don't have this set.
  provider?: "email" | "google";
  // Denormalized loyalty-points balance. Source of truth lives in the
  // users/{uid}/pointsLedger subcollection; this aggregate is updated
  // atomically (Firestore transaction) on every earn/redeem so the
  // navbar pill and admin views can render without an extra query.
  pointsBalance?: number;
  // ISO timestamp of the most recent admin approval for nurses. Distinguishes
  // first-time pending from re-pending (post-edit re-review). Always present
  // on approved nurses after the re-approval workflow shipped.
  approvedAt?: string;
  // SHA-256 hash of the last-approved nurse profile snapshot. Used to detect
  // whether a profile edit changed any "significant" field and should trigger
  // re-review. Nurses only.
  lastApprovedProfileHash?: string;
}

export interface StoreItem {
  id: string;
  // Long-form admin-curated copy uses the LocalizedString shape per
  // Phase 5. Tolerant readers in storeService coerce legacy plain
  // strings to {en: "..."} so existing Firestore records keep working
  // until the backfill migration completes.
  name: LocalizedString;
  description: LocalizedString;
  price: number;
  // category stays a flat enum key; display labels come from
  // patient.store.categories.* in the message catalog.
  category: string;
  image: string;
}

export interface StoreOrder {
  id: string;
  patientId: string;
  items: { productId: string; quantity: number; price: number }[];
  // `subtotal` is the cart subtotal before any points discount. `total`
  // is what the patient actually pays after `pointsDiscount` is applied.
  // Legacy orders without redemption keep `total` only — subtotal is
  // optional so old reads keep working.
  subtotal?: number;
  pointsRedeemed?: number;
  pointsDiscount?: number;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered";
  createdAt: string;
}

// Points ledger entries live in users/{uid}/pointsLedger/{id}. Every
// balance change must be accompanied by a ledger doc so audit + admin
// reconciliation works without parsing balance deltas.
export type PointsSource =
  | "booking_completed"
  | "order_delivered"
  | "review_submitted"
  | "redemption"
  | "admin_adjust";

export interface PointsLedgerEntry {
  id: string;
  type: "earn" | "redeem";
  source: PointsSource;
  // Always positive — direction is encoded by `type` so the ledger
  // displays cleanly without sign-juggling in UI code.
  amount: number;
  // bookingId / orderId / reviewId. Combined with `source` it forms the
  // idempotency key — the points service refuses to write a second earn
  // entry for the same (source, sourceId) pair.
  sourceId?: string;
  note?: string;
  createdAt: string;
}

// Care Packages — admin-managed long-term care plans.
// Display fields are optional so legacy seed entries keep working; booking
// flow depends only on id, slug, title, summary, durationDays, active.
export interface PackageDurationOption {
  days: number;
  label: LocalizedString;
  priceModifier?: number; // multiplicative; 1.0 = base, 0.9 = 10% discount
}

export interface PackageTimelineStep {
  day: number;
  title: LocalizedString;
  description: LocalizedString;
}

// Pricing mode controls whether a package locks duration/pricing or lets
// patients tune the booking.
//   fixed   — predefined duration + shifts + price. Patient sees the
//             package as a bundle and books it as-is. basePricePerDay is
//             required so the total is unambiguous.
//   dynamic — patient picks one of the durationOptions (or a free-form
//             day count if no options are defined). Pricing recalculates
//             per choice using basePricePerDay or the nurse's hourly rate.
// Records without pricingMode are treated as "dynamic" for backward compat.
export type PackagePricingMode = "fixed" | "dynamic";

export interface CarePackage {
  id: string;
  // slug stays canonical (URL key, queried via where("slug","==",…)).
  slug: string;
  // All curated long-form fields go through LocalizedString per Phase 5.
  // packageService tolerantly normalizes legacy plain-string records
  // to { en: "..." } on read so the rollout doesn't depend on the
  // backfill being complete first.
  title: LocalizedString;
  summary: LocalizedString;
  description?: LocalizedString;
  targetAudience?: LocalizedString;
  recommendedFor?: LocalizedString[];
  includedServices: LocalizedString[];
  highlights: LocalizedString[];
  outcomes?: LocalizedString[];
  careTimeline?: PackageTimelineStep[];
  durationDays: number;
  durationOptions?: PackageDurationOption[];
  // shiftOptions / addOns / currency / pricingMode are flat enum keys.
  shiftOptions?: string[];
  basePricePerDay?: number;
  currency?: string;
  addOns?: string[];
  pricingMode?: PackagePricingMode;
  image?: string;
  images?: string[];
  active: boolean;
  featured: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Community / Donations
export interface ContactInfo {
  name?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

// Moderation lifecycle for community donation posts:
//   active — visible on the public community listing (default for new posts).
//   hidden — removed from public view by admin moderation; still recoverable.
//   flagged — flagged for review (e.g. via future user-report feature) but
//             may still be visible until the admin acts. Reserved for now.
// Records without a status field are treated as "active" for backward compat.
export type DonationPostStatus = "active" | "hidden" | "flagged";

export interface DonationPost {
  id: string;
  title: string;
  description: string;
  category: string;
  images?: string[];
  location?: string;
  contact: ContactInfo;
  createdBy?: string; // user id
  createdAt: string;
  status?: DonationPostStatus;
  moderatedAt?: string;
  moderationNote?: string;
}

export interface DonationCategory {
  id: string;
  label: string;
}

// Medical Records
export interface Vitals {
  bloodPressure?: string; // e.g. '120/80'
  heartRate?: number;
  temperature?: number; // Celsius
  respiratoryRate?: number;
  oxygenSaturation?: number; // %
}

export interface Observation {
  id: string;
  nurseId: string;
  nurseName?: string;
  timestamp: string;
  note: string;
  vitals?: Vitals;
  medicationNote?: string;
  alerts?: string[];
}

// Notifications — designed to be extensible to email/SMS without schema change.
export type NotificationType =
  | "booking_created"
  | "booking_accepted"
  | "booking_rejected"
  | "booking_completed"
  | "booking_cancelled"
  | "nurse_signup"
  | "nurse_approved"
  | "nurse_rejected"
  | "order_created"
  | "order_status_changed"
  | "patient_id_verified"
  | "patient_id_rejected"
  | "points_earned"
  | "points_redeemed"
  | "system_alert";

export type NotificationChannel = "in_app" | "email" | "sms";

export interface Notification {
  id: string;
  userId: string;                  // recipient user id
  type: NotificationType;
  title: string;
  body: string;
  link?: string;                   // optional deep link
  read: boolean;
  readAt?: string;
  createdAt: string;
  // Future-extensible channel tracking — only in_app is wired today.
  deliveredVia?: NotificationChannel[];
  // Event-specific payload; opaque to UI but useful for analytics / future routing.
  payload?: Record<string, unknown>;
}

// Lifecycle of a medical record:
//   draft     — nurse is still editing observations (default on create)
//   submitted — nurse marked it ready; awaiting patient confirmation
//   confirmed — patient acknowledged the record is accurate
//   disputed  — patient flagged an issue (see disputeNote); nurse can revise + resubmit
// Records without a status field are treated as "draft" for backward compat.
export type MedicalRecordStatus = "draft" | "submitted" | "confirmed" | "disputed";

export interface MedicalRecord {
  id: string;
  patientId: string;
  nurseId?: string;
  bookingId?: string;
  summary?: string;
  observations?: Observation[]; // denormalized snapshot
  status?: MedicalRecordStatus;
  submittedAt?: string;
  confirmedAt?: string;
  disputedAt?: string;
  disputeNote?: string; // patient's reason for disputing
  createdAt: string;
  updatedAt?: string;
}

// Education / trust cards shown on the homepage and managed by admins.
// Three buckets that map to undecided-patient questions:
//   why            — why home care could help (vs hospital / clinic / etc.)
//   faq            — common operational questions about the platform
//   what-to-expect — concrete reassurance about how a visit unfolds
// Intentionally short text (title ≤60 chars, body ≤180 chars) — these
// are scannable cards, not articles. Admin can disable/reorder without
// touching code.
export type EducationCardKind = "why" | "faq" | "what-to-expect";

export const EDUCATION_ACCENTS = ["sky", "emerald", "violet", "amber", "rose"] as const;
export type EducationCardAccent = (typeof EDUCATION_ACCENTS)[number];

export interface EducationCard {
  id: string;
  // kind stays a flat enum (used by where() in queries).
  kind: EducationCardKind;
  // Card body copy is admin-curated long-form content per Phase 5.
  title: LocalizedString;
  body: LocalizedString;
  icon?: string;       // lucide-react icon name; service curates the choices
  accent?: EducationCardAccent;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Educational Library — short-form videos managed by admins.
// Distinct subsystem from EducationCard (text trust cards). Each video
// is a self-contained admin-curated record with bilingual copy and a
// public-readable MP4 in S3.
export const EDUCATION_VIDEO_CATEGORIES = [
  "general",
  "preventive",
  "post-op",
  "chronic",
  "pediatric",
  "elderly",
  "wellness",
  "nutrition",
  "mental-health",
] as const;
export type EducationVideoCategory = (typeof EDUCATION_VIDEO_CATEGORIES)[number];

export interface EducationVideo {
  id: string;
  // Bilingual admin-curated copy per Phase 5. Tolerant readers normalize
  // legacy plain-string records on the way in.
  title: LocalizedString;
  description: LocalizedString;
  // Public S3 URL. Browser plays via plain <video src>; no streaming
  // protocol — MVP keeps the pipeline simple.
  videoUrl: string;
  // Optional poster image. Public URL. If absent the player shows a
  // gradient placeholder.
  thumbnailUrl?: string;
  // Captured from <video> loadedmetadata on upload — purely a display
  // hint ("2:14" badge). The video itself is the source of truth.
  durationSeconds?: number;
  category: EducationVideoCategory;
  // Free-form admin keywords for client-side search. Not stored as a
  // localized field — patients see the active locale's tag set if a
  // tag matches existing i18n labels.
  tags?: string[];
  // Publication state. Unpublished videos are hidden from patient
  // surfaces but remain editable in the admin panel.
  published: boolean;
  order: number;
  // Best-effort denormalized counters. Increment from the patient
  // surfaces but tolerate races — these are vanity stats, not billing.
  viewCount?: number;
  saveCount?: number;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

// Per-user save record. Lives at users/{uid}/savedVideos/{videoId}.
// videoId is the doc id; the body just stores the bookmark timestamp
// so the library page can sort by recency.
export interface SavedVideoEntry {
  videoId: string;
  savedAt: string;
}

// Global site settings — single doc at siteSettings/global. New flags
// live here. Reads are public; writes require admin role (enforced by
// Firestore rules). Optional fields default to "enabled" so an empty
// or missing doc keeps the platform fully functional.
export interface SiteSettings {
  // Toggles the Education Library feature platform-wide. When false
  // the patient nav item is hidden, /patient/education* routes redirect
  // home, and any homepage section is suppressed. Admin CRUD remains
  // reachable so content can be staged before launch / re-launch.
  educationLibraryEnabled?: boolean;
  // Toggles physiotherapist support across the platform. When false
  // (the default), the marketplace filters physios out, registration
  // doesn't offer the "Physiotherapist" role, the Find Care wizard
  // hides the physio-specific situation, and homepage/copy stay
  // nurse-focused. Existing physio profiles are NOT deleted — admin
  // can still see and manage them, and their workspace logins still
  // work so they can update their profile while disabled.
  physiotherapyEnabled?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}
