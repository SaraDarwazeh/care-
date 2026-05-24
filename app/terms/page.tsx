export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-extrabold text-slate-800 mb-2">Terms of Service</h1>
      <p className="text-sm text-slate-500 mb-8">Last updated: May 2026</p>

      <div className="space-y-8 text-slate-700">
        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-3">Platform Purpose</h2>
          <p className="text-sm leading-relaxed">Care Plus is a home healthcare marketplace that connects patients with licensed nurses. We facilitate bookings but do not directly employ nurses. All nurses are independently licensed professionals.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-3">Nurse Verification</h2>
          <p className="text-sm leading-relaxed">All nurses on Care Plus are reviewed and approved by our team before activation. We verify submitted credentials and licenses. However, patients are encouraged to confirm credentials directly before care begins.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-3">Patient Responsibilities</h2>
          <p className="text-sm leading-relaxed">Patients must provide accurate medical information to ensure appropriate care. Emergency situations should always contact emergency services (not platform support).</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-3">Community Donations</h2>
          <p className="text-sm leading-relaxed">The community section facilitates peer-to-peer equipment visibility only. Care Plus is not responsible for the condition, delivery, or authenticity of donated items. All transactions occur directly between parties.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 mb-3">Limitation of Liability</h2>
          <p className="text-sm leading-relaxed">Care Plus provides a platform for connecting healthcare professionals with patients. We are not liable for medical outcomes, nurse conduct, or service quality beyond our verified nurse approval process.</p>
        </section>
      </div>
    </div>
  );
}
