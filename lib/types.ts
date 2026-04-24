export type UserRole = "admin" | "nurse" | "patient";

export type UserStatus = "pending" | "approved" | "rejected";

export type BookingStatus = "pending" | "accepted" | "rejected" | "completed";

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
  price: number;
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
