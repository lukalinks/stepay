import Link from 'next/link';
import { Header } from '@/components/Header';

export const metadata = {
  title: 'Privacy Policy - Stepay',
  description: 'Privacy Policy for Stepay - Deposit and cash out XLM with Mobile Money.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#faf9f7]">
      <Header showBack maxWidth="narrow" />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-heading mb-6 sm:mb-8">Privacy Policy</h1>
        <div className="prose prose-slate max-w-none space-y-6 text-slate-600">
          <p className="text-sm text-slate-500">Last updated: February 2026</p>
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading mt-6 sm:mt-8 mb-3 sm:mb-4">1. Information We Collect</h2>
            <p>
              We collect your mobile phone number, Stellar wallet address, and transaction history necessary to provide the Service.
            </p>
          </section>
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading mt-6 sm:mt-8 mb-3 sm:mb-4">2. How We Use Your Information</h2>
            <p>
              We use your information to process transactions, send XLM to your wallet, and facilitate mobile money payments. We do not sell your personal data.
            </p>
          </section>
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading mt-6 sm:mt-8 mb-3 sm:mb-4">3. Data Storage</h2>
            <p>
              Your data is stored securely. Wallet keys are encrypted. We retain transaction records as required by applicable law.
            </p>
          </section>
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading mt-6 sm:mt-8 mb-3 sm:mb-4">4. Third Parties</h2>
            <p>
              We share data with payment processors (e.g. Lenco for mobile money) and the Stellar network as necessary to complete transactions.
            </p>
          </section>
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading mt-6 sm:mt-8 mb-3 sm:mb-4">5. Your Rights</h2>
            <p>You may request access to or deletion of your personal data. Contact us to exercise these rights.</p>
          </section>
          <section>
            <h2 className="text-lg sm:text-xl font-semibold text-slate-900 font-heading mt-6 sm:mt-8 mb-3 sm:mb-4">6. Contact</h2>
            <p>For privacy questions, contact us through the support channels provided in the app.</p>
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
