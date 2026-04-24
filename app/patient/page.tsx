"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarClock, Stethoscope, Store, UserCircle, Star, ShieldCheck, HeartPulse, ChevronRight, Apple, Activity, Plus } from "lucide-react";
import LoadingScreen from "@/components/common/LoadingScreen";
import PatientButton from "@/components/patient/PatientButton";
import PatientCard from "@/components/patient/PatientCard";
import SectionContainer from "@/components/patient/SectionContainer";
import { useAuth } from "@/hooks/useAuth";
import { BookingWithParticipants, NurseMarketplaceProfile } from "@/lib/types";
import { getBookingsForPatientWithParticipants } from "@/services/bookingService";
import { getApprovedNurseMarketplaceProfiles } from "@/services/nurseService";
import { useCart } from "@/components/patient/CartContext";
import { getProducts } from "@/services/storeService";
import { StoreItem } from "@/lib/types";

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
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!appUser) return;
    const patientId = appUser.id;
    let active = true;

    async function loadData() {
      try {
        const [bookingsData, nursesData, productsData] = await Promise.all([
          getBookingsForPatientWithParticipants(patientId),
          getApprovedNurseMarketplaceProfiles(),
          getProducts(),
        ]);
        
        if (active) {
          setBookings(bookingsData);
          setNurses(nursesData.slice(0, 4)); // Get top 4 nurses
          setProducts(productsData);
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

  if (loading || !appUser) {
    return <LoadingScreen text="Preparing your patient experience..." />;
  }

  const upcomingBookings = bookings.filter((b) => b.status !== "completed").slice(0, 2);
  const bestSellers = products.slice(0, 3); // Get 3 products

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 pb-12">
      {/* 1. Welcome Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 to-sky-800 p-8 shadow-[0_20px_40px_-15px_rgba(2,132,199,0.5)] text-white sm:p-12">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-white backdrop-blur-md mb-4">
              <HeartPulse className="h-4 w-4" /> Your health dashboard
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl mb-2">
              Welcome back, {appUser.name.split(' ')[0]}!
            </h1>
            <p className="max-w-xl text-lg text-sky-100 font-medium">
              We're here to help you manage your health journey. Find trusted nurses, track appointments, and order supplies.
            </p>
            <div className="mt-8">
              <Link href="/patient/nurses" className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-base font-bold text-sky-700 hover:bg-slate-50 transition shadow-lg hover:-translate-y-0.5">
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

      {/* 2. Upcoming Appointments */}
      <SectionContainer
        title="Upcoming Appointments"
        description="Your scheduled care sessions."
      >
        {loadingData ? (
          <div className="animate-pulse flex gap-4">
            <div className="h-32 w-full bg-slate-200 rounded-3xl" />
            <div className="h-32 w-full bg-slate-200 rounded-3xl hidden sm:block" />
          </div>
        ) : upcomingBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50">
            <CalendarClock className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-slate-500 font-medium mb-4">No upcoming appointments yet.</p>
            <PatientButton href="/patient/nurses" className="bg-sky-100 text-sky-700 hover:bg-sky-200 rounded-xl">Book a session</PatientButton>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
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
                    booking.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                    booking.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionContainer>

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
              <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Essential Supplies</h2>
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
