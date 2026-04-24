"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  ChevronRight, ShieldCheck, Star, Pill, Stethoscope, Droplet,
  HeartHandshake, BadgeCheck, Users, Activity, ArrowRight,
  Search, CalendarCheck, Home as HomeIcon, UserPlus, ClipboardList, Banknote, Plus
} from "lucide-react";
import { NurseMarketplaceProfile, StoreItem } from "@/lib/types";
import { getApprovedNurseMarketplaceProfiles } from "@/services/nurseService";
import { getProducts } from "@/services/storeService";

export default function Home() {
  const [nurses, setNurses] = useState<NurseMarketplaceProfile[]>([]);
  const [products, setProducts] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [n, p] = await Promise.all([getApprovedNurseMarketplaceProfiles(), getProducts()]);
        if (active) { setNurses(n.slice(0, 6)); setProducts(p.slice(0, 4)); }
      } catch (e) { console.error(e); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 flex w-full items-center justify-between bg-white/90 px-4 py-4 backdrop-blur-md shadow-sm sm:px-8">
        <div className="flex items-center gap-2 text-sky-700">
          <ShieldCheck className="h-7 w-7" />
          <span className="text-xl font-extrabold tracking-tight">Care Plus</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-sky-700 transition">Login</Link>
          <Link href="/register?role=nurse" className="hidden rounded-2xl border-2 border-emerald-500 px-4 py-2 text-sm font-bold text-emerald-600 hover:bg-emerald-50 transition sm:block">
            Join as Nurse
          </Link>
          <Link href="/register" className="rounded-2xl bg-sky-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-sky-700 transition">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden bg-slate-50">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-8">
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-16">
            {/* Left: Text */}
            <div className="w-full lg:w-1/2 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 z-10">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-bold text-emerald-700 border border-emerald-200">
                <BadgeCheck className="h-4 w-4" /> All nurses 100% verified & background checked
              </div>
              <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl lg:text-7xl leading-tight">
                Trusted Home Care,<br />at Your <span className="text-sky-600">Doorstep.</span>
              </h1>
              <p className="text-lg text-slate-600 sm:text-xl font-medium max-w-lg">
                Book highly qualified, compassionate nurses for your loved ones. Professional healthcare delivered right to your home.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-sky-600/30 transition-all hover:bg-sky-500 hover:scale-105 active:scale-95">
                  Find a Nurse <ChevronRight className="h-5 w-5" />
                </Link>
                <Link href="/register?role=nurse" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-8 py-4 text-lg font-bold text-slate-700 border border-slate-200 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-95">
                  Join as a Nurse
                </Link>
              </div>
            </div>

            {/* Right: Image */}
            <div className="w-full lg:w-1/2 relative z-10 animate-in fade-in zoom-in duration-1000 delay-200">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl shadow-[0_20px_50px_rgba(8,_112,_184,_0.1)]">
                <Image 
                  src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&q=80"
                  alt="Nurse helping elderly patient at home" 
                  fill 
                  className="object-cover" 
                  priority 
                  unoptimized 
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-20 -mt-10 mx-auto max-w-5xl px-4 sm:px-8">
        <div className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-6 shadow-xl sm:grid-cols-4 animate-in fade-in zoom-in duration-700 delay-300">
          {[
            { label: "Patients Served", value: "500+", icon: Users, color: "text-sky-500", bg: "bg-sky-50" },
            { label: "Verified Nurses", value: "120+", icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-50" },
            { label: "Successful Bookings", value: "2,500+", icon: Activity, color: "text-violet-500", bg: "bg-violet-50" },
            { label: "Average Rating", value: "4.9/5", icon: Star, color: "text-amber-500", bg: "bg-amber-50" },
          ].map((stat, i) => (
            <div key={i} className="flex flex-col items-center justify-center text-center">
              <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <p className="text-2xl font-extrabold text-slate-800">{stat.value}</p>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-24 px-4 py-20 sm:px-8">

        {/* How It Works */}
        <section>
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-sky-600 uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">How Care Plus Works</h2>
            <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto">Whether you need care or want to provide it — we make it simple.</p>
          </div>
          <div className="grid gap-8 lg:grid-cols-2">
            {/* For Patients */}
            <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-white border border-sky-100 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500 text-white shadow-md">
                  <HomeIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">For Patients</h3>
                  <p className="text-sm text-slate-500">Get care at home in 3 easy steps</p>
                </div>
              </div>
              <div className="space-y-6">
                {[
                  { step: "1", icon: Search, title: "Browse Nurses", desc: "Filter by specialization, location, shift, and availability." },
                  { step: "2", icon: CalendarCheck, title: "Book a Session", desc: "Choose your date, shift, and service. Confirm with one click." },
                  { step: "3", icon: HeartHandshake, title: "Get Care at Home", desc: "A verified nurse arrives at your door, ready to help." },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500 text-white font-extrabold text-lg shadow-md shadow-sky-500/20">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{item.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/register" className="mt-8 flex items-center gap-2 font-bold text-sky-600 hover:text-sky-700 transition">
                Find a Nurse <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* For Nurses */}
            <div className="rounded-3xl bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
                  <Stethoscope className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-slate-800">For Nurses</h3>
                  <p className="text-sm text-slate-500">Earn on your own schedule</p>
                </div>
              </div>
              <div className="space-y-6">
                {[
                  { step: "1", icon: UserPlus, title: "Create Your Profile", desc: "Add your specialization, certifications, services, and shifts." },
                  { step: "2", icon: ShieldCheck, title: "Get Approved", desc: "Our team reviews your profile and certificates within 24h." },
                  { step: "3", icon: Banknote, title: "Receive Bookings & Earn", desc: "Accept or decline requests. Get paid per completed session." },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white font-extrabold text-lg shadow-md shadow-emerald-500/20">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{item.title}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/register?role=nurse" className="mt-8 flex items-center gap-2 font-bold text-emerald-600 hover:text-emerald-700 transition">
                Join as a Nurse <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="rounded-3xl bg-slate-800 p-8 sm:p-16 text-center text-white relative overflow-hidden">
          <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-sky-500/20 blur-3xl" />
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative z-10">
            <p className="text-sm font-bold text-sky-400 uppercase tracking-widest mb-3">What We Offer</p>
            <h2 className="mb-12 text-4xl font-extrabold tracking-tight">Comprehensive Care Services</h2>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                { name: "Wound Care", icon: Droplet, color: "text-rose-400", bg: "bg-rose-400/10", desc: "Professional dressing & wound management" },
                { name: "IV Injection", icon: Pill, color: "text-purple-400", bg: "bg-purple-400/10", desc: "IV therapy & medication administration" },
                { name: "Elderly Care", icon: HeartHandshake, color: "text-amber-400", bg: "bg-amber-400/10", desc: "Compassionate support for seniors" },
                { name: "Post-op Care", icon: Stethoscope, color: "text-sky-400", bg: "bg-sky-400/10", desc: "Recovery assistance after surgery" },
              ].map(service => (
                <div key={service.name} className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md transition-all hover:bg-white/10 hover:scale-105 hover:-translate-y-1">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${service.bg} ${service.color}`}>
                    <service.icon className="h-8 w-8" />
                  </div>
                  <span className="font-bold text-slate-200">{service.name}</span>
                  <p className="text-xs text-slate-400 leading-relaxed">{service.desc}</p>
                </div>
              ))}
            </div>
            <div className="mt-12">
              <Link href="/register" className="inline-block rounded-2xl bg-white px-8 py-3 font-bold text-slate-800 hover:bg-slate-100 transition shadow-lg">
                Explore All Services
              </Link>
            </div>
          </div>
        </section>

        {/* Featured Nurses */}
        <section>
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="text-sm font-bold text-sky-600 uppercase tracking-widest mb-2">Top Rated</p>
              <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Available Nurses</h2>
              <p className="mt-3 text-lg text-slate-500">Trusted professionals ready for dispatch in your area.</p>
            </div>
            <Link href="/register" className="text-sm font-bold text-sky-600 hover:text-sky-700 hidden sm:flex items-center gap-1">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {loading ? (
            <div className="flex gap-6 overflow-x-auto pb-8">
              {[1,2,3,4].map(i => <div key={i} className="h-[320px] w-72 shrink-0 animate-pulse rounded-3xl bg-slate-200" />)}
            </div>
          ) : nurses.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-lg text-slate-500 font-medium">No nurses available at the moment.</p>
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-8 pt-4 snap-x">
              {nurses.map(nurse => (
                <Link key={nurse.userId} href="/register"
                  className="group snap-center relative flex w-72 shrink-0 flex-col overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)]">
                  <div className="absolute right-4 top-4 z-10">
                    <div className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-md">Available</div>
                  </div>
                  <div className="relative h-52 w-full overflow-hidden bg-slate-100">
                    {nurse.profileImage ? (
                      <Image src={nurse.profileImage} alt={nurse.fullName} fill unoptimized className="object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-slate-300">
                        {nurse.fullName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <h3 className="text-lg font-bold line-clamp-1">{nurse.fullName}</h3>
                          <BadgeCheck className="h-4 w-4 text-sky-400 shrink-0" />
                        </div>
                        <p className="text-sm text-emerald-300 font-semibold">{nurse.specialization}</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-lg bg-black/40 backdrop-blur-md px-2 py-1 text-xs font-bold">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{nurse.rating.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col p-5">
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-4">{nurse.bio || "Dedicated healthcare professional providing exceptional home care."}</p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                      <p className="text-sm text-slate-400">Starting at</p>
                      <p className="font-extrabold text-slate-800">${nurse.pricePerHour ?? 0}<span className="text-sm font-medium text-slate-400">/hr</span></p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Medical Store Preview */}
        <section className="rounded-3xl bg-violet-50 border border-violet-100 p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-violet-200/50 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-10">
              <div>
                <p className="text-sm font-bold text-violet-600 uppercase tracking-widest mb-2">Care Plus Store</p>
                <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Medical Supplies</h2>
                <p className="mt-3 text-slate-500">High-quality home care supplies delivered to you.</p>
              </div>
              <Link href="/register" className="hidden sm:flex items-center gap-2 rounded-2xl bg-white px-5 py-2.5 text-sm font-bold text-violet-700 shadow-sm hover:shadow-md transition">
                Browse Store <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(loading ? Array(4).fill(null) : products).map((item, i) =>
                item ? (
                  <div key={item.id} className="bg-white rounded-3xl p-5 shadow-sm border border-white hover:border-violet-200 hover:shadow-md transition group flex flex-col">
                    <div className="h-28 flex items-center justify-center text-5xl bg-slate-50 rounded-2xl mb-4 group-hover:scale-110 transition-transform">{item.image}</div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{item.name}</h3>
                      <span className="font-extrabold text-violet-700 shrink-0">${item.price}</span>
                    </div>
                    <p className="text-xs text-slate-400 font-semibold uppercase mb-3">{item.category}</p>
                    <Link href="/register" className="mt-auto flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-violet-100 text-violet-700 font-bold text-sm hover:bg-violet-600 hover:border-violet-600 hover:text-white transition">
                      <Plus className="h-4 w-4" /> Add to Cart
                    </Link>
                  </div>
                ) : (
                  <div key={i} className="h-48 bg-white/60 rounded-3xl animate-pulse" />
                )
              )}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section>
          <div className="mb-10 text-center">
            <p className="text-sm font-bold text-sky-600 uppercase tracking-widest mb-3">Reviews</p>
            <h2 className="text-4xl font-extrabold text-slate-800 tracking-tight">Trusted by Families</h2>
            <p className="mt-4 text-lg text-slate-500">Hear from patients who've experienced our premium care.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { text: "The nurse arrived on time, was extremely professional, and made my father feel so comfortable. Highly recommended!", author: "Sarah M.", location: "Nablus", avatar: "SM" },
              { text: "Care Plus made it so easy to find a wound care specialist. The booking process is seamless and the service is top-notch.", author: "Ahmed K.", location: "Ramallah", avatar: "AK" },
              { text: "I've never felt more secure leaving my mother with a home nurse. The verification process gave me total peace of mind.", author: "Laila H.", location: "Jenin", avatar: "LH" },
            ].map((t, i) => (
              <div key={i} className="flex flex-col justify-between rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative border border-slate-100 hover:border-sky-200 hover:-translate-y-1 transition-all">
                <div>
                  <div className="flex gap-1 mb-5">
                    {[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed mb-6 italic">"{t.text}"</p>
                </div>
                <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-700 font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{t.author}</p>
                    <p className="text-xs text-slate-400">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="rounded-3xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800" />
          <div className="absolute inset-0">
            <Image src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?auto=format&fit=crop&q=80"
              alt="Healthcare" fill className="object-cover opacity-10" unoptimized />
          </div>
          <div className="absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative z-10 p-12 sm:p-20 text-center text-white">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold text-white mb-6 border border-white/30">
              <BadgeCheck className="h-4 w-4" /> Join 500+ satisfied patients & 120+ active nurses
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl mb-6">Get Started Today</h2>
            <p className="text-lg text-sky-100 max-w-xl mx-auto mb-10">
              Join Care Plus and experience healthcare the way it should be — trusted, convenient, and professional.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-10 py-4 text-lg font-bold text-sky-700 shadow-xl hover:bg-slate-50 transition hover:scale-105 active:scale-95">
                Register as Patient <ChevronRight className="h-5 w-5" />
              </Link>
              <Link href="/register?role=nurse" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-10 py-4 text-lg font-bold text-white shadow-xl hover:bg-emerald-400 transition hover:scale-105 active:scale-95">
                Register as Nurse <ClipboardList className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-10 text-center sm:px-8">
        <div className="flex items-center justify-center gap-2 text-sky-700 mb-4">
          <ShieldCheck className="h-6 w-6" />
          <span className="text-lg font-extrabold">Care Plus</span>
        </div>
        <p className="text-sm text-slate-500">© 2025 Care Plus. Premium home healthcare. All nurses verified and approved.</p>
        <div className="flex items-center justify-center gap-6 mt-4">
          <Link href="/login" className="text-sm font-semibold text-slate-500 hover:text-sky-600 transition">Login</Link>
          <Link href="/register" className="text-sm font-semibold text-slate-500 hover:text-sky-600 transition">Register</Link>
          <Link href="/register?role=nurse" className="text-sm font-semibold text-slate-500 hover:text-emerald-600 transition">Join as Nurse</Link>
        </div>
      </footer>
    </main>
  );
}
