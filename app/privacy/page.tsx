export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: May 2026</p>

      <div className="space-y-8 text-slate-700">
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-3">Data We Collect</h2>
          <p className="text-sm leading-relaxed">Care Plus collects name, email, phone number, address, and medical history to facilitate home healthcare services. This information is used solely to connect you with healthcare professionals and manage your bookings.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-3">How We Use Your Data</h2>
          <p className="text-sm leading-relaxed">Your personal and medical data is used to: match you with qualified nurses, process bookings, maintain medical records, and improve platform safety. We do not sell your data to third parties.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-3">Data Security</h2>
          <p className="text-sm leading-relaxed">All data is stored securely using Firebase (Google Cloud infrastructure). Communication is encrypted via HTTPS/TLS. Medical records are access-controlled so only authorized nurses and administrators can view them.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-3">Your Rights</h2>
          <p className="text-sm leading-relaxed">You have the right to access, correct, or delete your personal data at any time. Contact us at privacy@careplus.health to exercise these rights.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-3">Contact</h2>
          <p className="text-sm leading-relaxed">For privacy concerns: privacy@careplus.health</p>
        </section>
      </div>
    </div>
  );
}
