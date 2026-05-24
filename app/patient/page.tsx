"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarClock, Stethoscope, Store, UserCircle, Star, ShieldCheck, HeartPulse, ChevronRight, Apple, Activity, Plus, BookOpen, Package } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import PatientButton from "@/components/patient/PatientButton";
import { useAuth } from "@/hooks/useAuth";
import { BookingWithParticipants, NurseMarketplaceProfile, PatientProfile } from "@/lib/types";
import { getBookingsForPatientWithParticipants } from "@/services/bookingService";
import { getApprovedNurseMarketplaceProfiles } from "@/services/nurseService";
import { getPatientProfile } from "@/services/patientService";
import { useCart } from "@/components/patient/CartContext";
import { getProducts } from "@/services/storeService";
import { StoreItem } from "@/lib/types";

const QUICK_ACTIONS = [
  {
    label: "Book a Nurse",
    desc: "Find and book a trusted nurse",
    href: "/patient/nurses",
    icon: Stethoscope,
    color: "bg-sky-50 text-sky-600 border-sky-100",
    iconBg: "bg-sky-100",
  },
  {
    label: "Medical Records",
    desc: "View your care history",
    href: "/patient/records",
    icon: BookOpen,
    color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    iconBg: "bg-emerald-100",
  },
  {
    label: "Care Packages",
    desc: "Multi-day nursing packages",
    href: "/services/packages",
    icon: Package,
    color: "bg-violet-50 text-violet-600 border-violet-100",
    iconBg: "bg-violet-100",
  },
  {
    label: "Health Store",
    desc: "Order medical supplies",
    href: "/patient/store",
    icon: Store,
    color: "bg-amber-50 text-amber-600 border-amber-100",
    iconBg: "bg-amber-100",
  },
];

const HEALTH_TIPS = [
  { id: 1, title: "Stay Hydrated", desc: "Drink at least 8 glasses a day.", image: "https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&q=80", icon: Activity },
  { id: 2, title: "Healthy Diet", desc: "Balance your meals with greens.", image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80", icon: Apple },
  { id: 3, title: "Regular Exercise", desc: "30 mins of daily activity.", image: "https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&q=80", icon: HeartPulse },
];

export default function PatientHomePage() {
  const { appUser, loading } = useAuth();
  const { addToCart } = useCart();
  const [bookings, setBookings] = useState<BookingWithParticipants[]>([]);
  const [nurses, setNurses] = useState<NurseMarketplaceProfile[]>([]);
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!appUser) return;
    const patientId = appUser.id;
    let active = true;

    async function loadData() {
      try {
        const [bookingsData, nursesData, productsData, profileData] = await Promise.all([
          getBookingsForPatientWithParticipants(patientId),
          getApprovedNurseMarketplaceProfiles(),
          getProducts(),
          getPatientProfile(patientId),
        ]);

        if (active) {
          setBookings(bookingsData);
          setNurses(nursesData.slice(0, 4)); // Get top 4 nurses
          setProducts(productsData);
          setPatientProfile(profileData);
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        if (active) setLoadingData(false);
      }
    }

    void loadData();
    return () => { active = false; };
  }, [appUser]);

  const isProfileIncomplete = !loadingData && patientProfile !== null &&
    (!patientProfile.phone || !patientProfile.defaultLocation);

  if (loading || !appUser) {
    if (loading) {
      return <LoadingScreen text="Preparing your patient experience..." />;
    }

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12">
        <section id="home" className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-sky-50 to-emerald-50 p-8 sm:p-12">
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-600">Patient area</p>
            <h1 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Browse the platform, then sign in when you are ready to book.</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
              You can continue exploring nurses, services, packages, and store products without creating an account yet.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/services" className="rounded-2xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700">Services</Link>
              <Link href="/patient/nurses" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700">Browse nurses</Link>
              <Link href="/patient/store" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-sky-200 hover:text-sky-700">Browse store</Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const upcomingBookings = bookings
    .filter((b) => b.status === "accepted" || b.status === "pending")
    .slice(0, 3);
  const bestSellers = products.slice(0, 3); // Get 3 products

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-8 sm:space-y-12 sm:pb-12">
      {/* 1. Welcome Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 to-sky-800 p-6 shadow-[0_20px_40px_-15px_rgba(2,132,199,0.5)] text-white sm:p-12">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 sm:gap-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md mb-3 sm:text-sm sm:mb-4">
              <HeartPulse className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Your health dashboard
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-5xl mb-2">
              Welcome back, {appUser.name.split(' ')[0]}!
            </h1>
            <p className="max-w-xl text-sm text-sky-100 font-medium sm:text-lg">
              We are here to help you manage your health journey. Find trusted nurses, track appointments, and order supplies.
            </p>
            <div className="mt-5 sm:mt-8">
              <Link href="/patient/nurses" className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-sky-700 hover:bg-slate-50 transition shadow-lg hover:-translate-y-0.5 sm:px-6 sm:py-3.5 sm:text-base">
                Find a Nurse <ChevronRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
          
          <div className="hidden lg:block relative h-48 w-48 shrink-0">
            {/* Decorative abstract elements */}
            <div className="absolute inset-0 rounded-full bg-white/10 border-4 border-white/20 backdrop-blur-sm animate-pulse" />
            <ShieldCheck className="absolute inset-0 m-auto h-24 w-24 text-white/80" />
          </div>
        </div>
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-emerald-400/20 blur-3xl" />
      </section>

      {/* 2. Profile Completeness Banner */}
      {isProfileIncomplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <UserCircle className="h-6 w-6 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              Complete your profile for a better experience — add your phone and address so nurses can reach you easily.
            </p>
          </div>
          <Link
            href="/patient/profile"
            className="shrink-0 rounded-xl bg-amber-100 px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-200 transition whitespace-nowrap"
          >
            Complete Profile
          </Link>
        </div>
      )}

      {/* 3. Quick Actions */}
      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Quick Actions</h2>
          <p className="text-slate-500 font-medium">Everything you need, one tap away.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`rounded-3xl bg-white border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all p-5 flex flex-col gap-3 ${action.color}`}
            >
              <div className={`w-10 h-10 flex items-center justify-center rounded-2xl ${action.iconBg}`}>
                <action.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm leading-tight">{action.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-snug">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. Upcoming Appointments */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Upcoming Appointments</h2>
            <p className="text-slate-500 font-medium">Your scheduled care sessions.</p>
          </div>
          <Link href="/patient/appointments" className="flex items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700 transition">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loadingData ? (
          <div className="animate-pulse flex gap-4">
            <div className="h-32 w-full bg-slate-200 rounded-3xl" />
            <div className="h-32 w-full bg-slate-200 rounded-3xl hidden sm:block" />
          </div>
        ) : upcomingBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50">
            <CalendarClock className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-slate-500 font-medium mb-4">No upcoming appointments — Book your first nurse.</p>
            <PatientButton href="/patient/nurses" className="bg-sky-100 text-sky-700 hover:bg-sky-200 rounded-xl">Book a session</PatientButton>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingBookings.map((booking) => (
              <div key={booking.id} className="flex flex-col rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <CalendarClock className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{booking.nurseName}</h3>
                    <p className="text-sm font-medium text-slate-500">{booking.service}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center rounded-2xl bg-slate-50 p-4 mt-auto">
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
                    <p className="font-bold text-slate-700">{booking.date} • {booking.time}</p>
                  </div>
                  <span className={`rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    booking.status === "accepted" ? "bg-emerald-100 text-emerald-700" :
                    booking.status === "rejected" ? "bg-rose-100 text-rose-700" :
                    "bg-amber-100 text-amber-700"
                  }`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. Recommended Nurses */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Recommended Nurses</h2>
            <p className="text-slate-500 font-medium">Top-rated professionals available in your area.</p>
          </div>
          <Link href="/patient/nurses" className="hidden sm:flex items-center gap-1 text-sm font-bold text-sky-600 hover:text-sky-700 transition">
            View all <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-hide snap-x">
          {loadingData ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="min-w-[280px] h-80 bg-slate-200 rounded-3xl animate-pulse shrink-0" />
            ))
          ) : Array.isArray(nurses) && nurses.length > 0 ? (
            nurses.map((nurse) => (
              <div key={nurse.userId} className="min-w-[280px] w-[280px] shrink-0 snap-start rounded-3xl bg-white shadow-sm border border-slate-100 overflow-hidden group flex flex-col">
                <div className="relative h-48 w-full overflow-hidden">
                  <Image 
                    src={nurse.profileImage || `https://i.pravatar.cc/300?u=${nurse.userId}`} 
                    alt={nurse.fullName} 
                    fill 
                    unoptimized
                    className="object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                    <div>
                      <p className="font-extrabold text-lg leading-tight">{nurse.fullName}</p>
                      <p className="text-sm font-medium text-sky-200">{nurse.specialization}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-lg px-2 py-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-bold">{nurse.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="flex flex-wrap gap-1 mb-4">
                    {Array.isArray(nurse.services) && nurse.services.slice(0, 2).map((s) => (
                      <span key={`${nurse.userId}-${s.name}`} className="bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
                        {s.name}
                      </span>
                    ))}
                    {Array.isArray(nurse.services) && nurse.services.length > 2 && <span className="bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md uppercase">+{nurse.services.length - 2}</span>}
                  </div>
                  <Link href={`/patient/nurses/${nurse.userId}`} className="w-full flex items-center justify-center py-2.5 rounded-xl bg-sky-50 text-sky-700 font-bold text-sm hover:bg-sky-600 hover:text-white transition-colors group-hover:shadow-md">
                    Book Session
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500">No nurses available at the moment.</p>
          )}
        </div>
      </section>

      {/* 4. Medical Store Preview */}
      <section className="rounded-3xl bg-violet-50 p-6 sm:p-10 border border-violet-100 relative overflow-hidden">
        <div className="absolute right-0 top-0 h-64 w-64 bg-violet-200/50 rounded-full blur-3xl -z-0 translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-2 text-violet-700 font-bold mb-2">
                <Store className="h-5 w-5" /> Care Plus Store
              </div>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight sm:text-3xl">Essential Supplies</h2>
            </div>
            <Link href="/patient/store" className="hidden sm:flex items-center gap-1 text-sm font-bold text-violet-600 hover:text-violet-700 transition bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow">
              Browse Store <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {bestSellers.map((product) => (
              <div key={product.id} className="bg-white rounded-3xl p-5 shadow-sm border border-white hover:border-violet-200 transition-colors group flex flex-col">
                <div className="h-32 flex items-center justify-center text-6xl bg-slate-50 rounded-2xl mb-4 group-hover:scale-105 transition-transform">
                  {product.image}
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-slate-800 leading-tight">{product.name}</h3>
                  <span className="font-extrabold text-violet-700">${product.price}</span>
                </div>
                <button 
                  onClick={() => addToCart(product.id)}
                  className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-violet-100 text-violet-700 font-bold text-sm hover:bg-violet-600 hover:border-violet-600 hover:text-white transition-all"
                >
                  <Plus className="h-4 w-4" /> Add to cart
                </button>
              </div>
            ))}
          </div>
          
          <Link href="/patient/store" className="mt-6 sm:hidden w-full flex items-center justify-center gap-1 text-sm font-bold text-violet-600 bg-white px-4 py-3 rounded-xl shadow-sm">
            Browse Full Store <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* 5. Health Tips */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Daily Health Tips</h2>
          <p className="text-slate-500 font-medium">Small steps for a healthier life.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {HEALTH_TIPS.map((tip) => (
            <div key={tip.id} className="group relative overflow-hidden rounded-3xl bg-white shadow-sm border border-slate-100 cursor-pointer h-40">
              <Image 
                src={tip.image} 
                alt={tip.title} 
                fill 
                className="object-cover opacity-50 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent group-hover:from-black/90 transition-colors" />
              <div className="absolute inset-0 p-5 flex flex-col justify-end">
                <div className="bg-white/20 backdrop-blur-md w-fit p-2 rounded-xl mb-3 border border-white/30 text-white group-hover:bg-white group-hover:text-sky-600 transition-colors">
                  <tip.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-white text-lg leading-tight">{tip.title}</h3>
                <p className="text-slate-200 text-sm font-medium opacity-0 -translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                  {tip.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
