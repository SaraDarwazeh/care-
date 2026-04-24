export interface NurseProfile {
  id: string;
  name: string;
  specialization: string;
  location: string;
  rating: number;
}

export interface PatientAppointment {
  id: string;
  nurseName: string;
  date: string;
  time: string;
  status: "pending" | "accepted" | "completed";
}

export interface MedicalRecord {
  id: string;
  date: string;
  nurseName: string;
  content: string;
}

export const nurseProfiles: NurseProfile[] = [
  {
    id: "n1",
    name: "Nurse Emily Carter",
    specialization: "Elderly Home Care",
    location: "Downtown",
    rating: 4.9,
  },
  {
    id: "n2",
    name: "Nurse Daniel Brooks",
    specialization: "Post-Surgery Support",
    location: "Northside",
    rating: 4.8,
  },
  {
    id: "n3",
    name: "Nurse Aisha Khan",
    specialization: "Chronic Care Management",
    location: "West End",
    rating: 4.7,
  },
  {
    id: "n4",
    name: "Nurse Maria Lopez",
    specialization: "Pediatric Home Visits",
    location: "Lakeside",
    rating: 4.9,
  },
];

export const patientAppointments: PatientAppointment[] = [
  {
    id: "a1",
    nurseName: "Nurse Emily Carter",
    date: "2026-04-27",
    time: "09:30 AM",
    status: "accepted",
  },
  {
    id: "a2",
    nurseName: "Nurse Daniel Brooks",
    date: "2026-04-30",
    time: "02:00 PM",
    status: "pending",
  },
  {
    id: "a3",
    nurseName: "Nurse Maria Lopez",
    date: "2026-04-20",
    time: "11:00 AM",
    status: "completed",
  },
];

export const medicalRecords: MedicalRecord[] = [
  {
    id: "r1",
    date: "2026-04-20",
    nurseName: "Nurse Maria Lopez",
    content:
      "Vitals were stable. Patient reported improved sleep and reduced fatigue. Continue hydration plan.",
  },
  {
    id: "r2",
    date: "2026-04-12",
    nurseName: "Nurse Emily Carter",
    content:
      "Medication schedule reviewed and adjusted for morning routine. Follow-up visit recommended in one week.",
  },
  {
    id: "r3",
    date: "2026-04-05",
    nurseName: "Nurse Daniel Brooks",
    content:
      "Post-treatment wound check completed. Healing is on track with no signs of infection.",
  },
];
