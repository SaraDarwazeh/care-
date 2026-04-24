<div align="center">
  <img src="https://images.unsplash.com/photo-1576091160550-2173ff9e5ee5?auto=format&fit=crop&q=80&w=800" alt="Care Plus Banner" width="100%" style="border-radius: 16px; margin-bottom: 20px; max-height: 300px; object-fit: cover;" />
  
  <h1>Care Plus ⚕️</h1>
  <p><strong>Trusted Home Healthcare, Simplified.</strong></p>
</div>

---

## 🎯 Vision

Care Plus aims to simplify home healthcare access in a modern, reliable way. We bridge the gap between patients needing professional care at home and qualified nurses seeking flexible opportunities, creating a trustworthy and transparent ecosystem for all.

---

## 🚀 Features

Care Plus is a comprehensive dual-sided marketplace tailored for three distinct user roles:

### 👤 Patient Experience
- **Browse Nurses:** Discover available home nurses with filters for gender, shift availability, and specialized services.
- **Nurse Profiles:** View detailed profiles including verified credentials, ratings, services offered, and real-time availability.
- **Book Appointments:** Seamlessly book shifts with specific locations and personalized care notes.
- **Booking Management:** Track the status of upcoming appointments and view past sessions.
- **Medical Records:** Centralized access to personal medical history and care logs.
- **Profile Management:** Manage personal details and default addresses.
- **Medical Store:** Browse and order essential medical supplies directly to your door.

### 👩‍⚕️ Nurse Experience
- **Professional Profiles:** Create a verified profile highlighting experience, services, and pricing.
- **Schedule Management:** Easily set and manage availability across morning, afternoon, and night shifts (A/B/C).
- **Booking Dashboard:** Accept or reject incoming booking requests with a single click.
- **Patient Insights:** Access necessary patient medical information prior to shifts to ensure high-quality care.
- **Earnings Tracking:** Monitor completed shifts and track total revenue.

### 🛠 Admin Control
- **Application Review:** Approve or reject new nurse registrations to maintain platform quality.
- **User Management:** Oversee all patient and nurse accounts.
- **E-commerce Management:** Full CRUD control over the medical store's product catalog.
- **Platform Analytics:** Monitor all platform bookings, medical records, and store orders from a centralized dashboard.

---

## 🛒 Medical Store
An integrated e-commerce solution for patients to purchase healthcare supplies:
- **Product Listing:** Browse categories (Wound Care, Daily Aids, etc.).
- **Cart System:** Manage items before purchase.
- **Checkout Flow:** Simple, streamlined checkout process.
- **Flexible Payments:** Support for Cash on Delivery and Bank Transfer.

---

## 🧠 System Flow

1. **Onboarding:** Users register and select their role (Patient or Nurse).
2. **Verification:** Nurse accounts enter a pending state until an Admin reviews and approves their credentials.
3. **Discovery & Booking:** Patients browse approved nurses and submit booking requests for specific shifts.
4. **Confirmation:** Nurses review incoming requests on their dashboard and accept or reject them.
5. **Care Delivery:** The session takes place, and medical records/earnings are updated.
6. **Oversight:** Admins monitor the entire lifecycle, managing users, products, and resolving platform issues.

---

## 🖥️ Screens & UI

*Note: Replace placeholders below with actual project screenshots.*

<div align="center">
  <img src="./screens/home.png" alt="Home Landing Page" width="45%" />
  <img src="./screens/dashboard.png" alt="Nurse Dashboard" width="45%" />
</div>

---

## ⚙️ Tech Stack

Built for performance, scalability, and an exceptional user experience:

- **Framework:** [Next.js (App Router)](https://nextjs.org/)
- **UI Library:** [React](https://react.dev/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Backend/Auth:** [Firebase](https://firebase.google.com/) (Authentication & Firestore)
- **Language:** [TypeScript](https://www.typescriptlang.org/)

---

## 📦 Installation

Ready to run locally? Follow these steps:

```bash
# Clone the repository
git clone https://github.com/yourusername/careplus.git

# Navigate to the directory
cd careplus

# Install dependencies
npm install

# Start the development server
npm run dev
```

---

## 🔐 Environment Variables

To run this project, you will need to add the following Firebase configuration to your `.env.local` file:

```env
NEXT_PUBLIC_FIREBASE_API_KEY="your_api_key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your_auth_domain"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your_project_id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your_storage_bucket"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your_sender_id"
NEXT_PUBLIC_FIREBASE_APP_ID="your_app_id"
```

*Ensure your Firestore rules are configured to support the Users, Bookings, Products, and Orders collections.*

---

## 🧪 Demo Accounts

You can test the platform using the following pre-configured demo accounts:

### Admin
- **Email:** `admin@careplus.com`
- **Password:** `123456`

### Patient
- **Email:** `sara@test.com`
- **Password:** `123456`

### Nurse
- **Email:** `nurse@test.com`
- **Password:** `123456`

---

## 📌 Future Improvements

- [ ] **Stripe Integration:** Real payment processing for bookings and store orders.
- [ ] **Push Notifications:** Real-time alerts for booking status changes.
- [ ] **In-App Messaging:** Direct chat system between patients and nurses.
- [ ] **Native Mobile App:** React Native expansion for iOS and Android.

---
<div align="center">
  <i>Built with ❤️ for better healthcare.</i>
</div>
