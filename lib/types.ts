export type UserRole = "admin" | "nurse" | "patient";

export type UserStatus = "pending" | "approved" | "rejected";

export type BookingStatus = "pending" | "accepted" | "rejected" | "completed" | "cancelled";

export type NurseDay = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export interface NurseServiceItem {
  name: string;
  price: number;
}

export interface NurseAvailabilityHours {
  from: string;
  to: string;
}

export interface NurseProfile {
  userId: string;
  fullName: string;
  profileImage: string;
  bio: string;
  specialization: string;
  services: NurseServiceItem[];
  pricePerHour?: number;
  rating: number;
  availableDays: NurseDay[];
  availableHours: NurseAvailabilityHours;
  acceptsOvernight: boolean;
  skills: string[];
  experienceYears: number;
  location?: string;
  gender?: "male" | "female" | "other";
  availableShifts?: string[];
  certificates?: string[];
  packagesSupported?: string[];
  additionalServices?: string[];
  willingToServeLocations?: string[];
  transportAvailable?: boolean;
  // Vacation / leave mode. When onLeave is true, validateBooking rejects
  // future bookings overlapping the [leaveStartDate, leaveEndDate] range.
  // Either bound may be omitted: missing start = leave starts now,
  // missing end = leave is open-ended.
  onLeave?: boolean;
  leaveStartDate?: string;
  leaveEndDate?: string;
}

export interface NurseMarketplaceProfile extends NurseProfile {
  email: string;
  status: UserStatus;
}

export interface PatientProfile {
  userId: string;
  defaultLocation: string;
  medicalHistory: string;
  phone?: string;
  diseases?: string[];
  paymentMethods?: string[];
  profileCompleted?: boolean;
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
}

export interface BookingWithParticipants extends Booking {
  patientName: string;
  patientEmail: string;
  nurseName: string;
  nurseSpecialization?: string;
  nurseProfileImage?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

export interface StoreOrder {
  id: string;
  patientId: string;
  items: { productId: string; quantity: number; price: number }[];
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered";
  createdAt: string;
}

// Care Packages — admin-managed long-term care plans.
// Display fields are optional so legacy seed entries keep working; booking
// flow depends only on id, slug, title, summary, durationDays, active.
export interface PackageDurationOption {
  days: number;
  label: string;
  priceModifier?: number; // multiplicative; 1.0 = base, 0.9 = 10% discount
}

export interface PackageTimelineStep {
  day: number;
  title: string;
  description: string;
}

export interface CarePackage {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description?: string;
  targetAudience?: string;
  recommendedFor?: string[];
  includedServices: string[];
  highlights: string[];
  outcomes?: string[];
  careTimeline?: PackageTimelineStep[];
  durationDays: number;
  durationOptions?: PackageDurationOption[];
  shiftOptions?: string[];
  basePricePerDay?: number;
  currency?: string;
  addOns?: string[];
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

export interface MedicalRecord {
  id: string;
  patientId: string;
  nurseId?: string;
  bookingId?: string;
  summary?: string;
  observations?: Observation[]; // denormalized snapshot
  createdAt: string;
  updatedAt?: string;
}
