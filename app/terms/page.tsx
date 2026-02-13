import Link from 'next/link';
import { Header } from '@/components/Header';

export const metadata = {
  title: 'Terms of Service - Stepay',
  description: 'Terms of Service for Stepay - Deposit and cash out XLM with Mobile Money.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <Header showBack maxWidth="narrow" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading mb-6 sm:mb-8">Terms of Service</h1>
        <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
          <p className="text-sm text-slate-500">Last updated: February 2026</p>
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading mt-6 sm:mt-8 mb-3 sm:mb-4">1. Agreement</h2>
            <p>
              By using Stepay (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
            </p>
          </section>
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading mt-6 sm:mt-8 mb-3 sm:mb-4">2. Description of Service</h2>
            <p>
              Stepay facilitates the purchase and sale of Stellar Lumens (XLM) using mobile money in Zambia. We connect you with the Stellar network and mobile money providers.
            </p>
          </section>
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading mt-6 sm:mt-8 mb-3 sm:mb-4">3. Eligibility</h2>
            <p>You must be at least 18 years old and have a valid Zambian mobile number to use the Service.</p>
          </section>
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading mt-6 sm:mt-8 mb-3 sm:mb-4">4. Risks</h2>
            <p>
              Cryptocurrency transactions involve risk. Prices can fluctuate. You are solely responsible for your transactions and for securing your wallet credentials.
            </p>
          </section>
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading mt-6 sm:mt-8 mb-3 sm:mb-4">5. Limitation of Liability</h2>
            <p>
              Stepay is provided &quot;as is&quot;. We are not liable for any losses arising from your use of the Service, including but not limited to transaction failures, network issues, or price changes.
            </p>
          </section>
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading mt-6 sm:mt-8 mb-3 sm:mb-4">6. Contact</h2>
            <p>For questions about these Terms, contact us through the support channels provided in the app.</p>
          </section>
        </div>
        <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-200">
          <Link href="/" className="text-teal-600 hover:text-teal-700 font-medium py-3 min-h-[44px] inline-flex items-center transition-colors">
            ← Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
