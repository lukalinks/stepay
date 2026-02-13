import Link from 'next/link';
import { ArrowRight, Globe, Shield, Smartphone } from 'lucide-react';
import { Header } from '@/components/Header';
import { Logo } from '@/components/Logo';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header
        maxWidth="full"
        logoSize="lg"
        logoClassName="text-xl sm:text-2xl"
        right={
          <>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-teal-600 active:bg-slate-100"
            >
              Login
            </Link>
            <Link
              href="/login?next=/dashboard"
              className="rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all hover:bg-amber-600 active:scale-[0.98] sm:px-5"
            >
              Get Started
            </Link>
          </>
        }
      />

      {/* Hero - Asymmetric layout with brand motifs */}
      <main className="flex-1 pb-6">
        <section className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-20 lg:pt-16 lg:pb-28 bg-[#faf9f7] stepay-dots stepay-blob">
          <div className="absolute top-20 right-0 w-96 h-96 bg-teal-400/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-400/8 rounded-full blur-3xl" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50/80 border border-teal-200/50 text-teal-700 text-xs font-semibold mb-6">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                Built on Stellar · Zambia
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 mb-5 sm:mb-6 font-heading">
                Crypto for
                <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-teal-500 to-amber-600">Everyone.</span>
              </h1>
              <p className="text-base sm:text-lg text-slate-600 mb-8 sm:mb-10 leading-relaxed max-w-xl">
                Deposit and cash out XLM and USDC instantly using Mobile Money. No bank account required. Fast, secure, built for Africa.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link href="/login?next=/dashboard/buy" className="min-h-[48px] px-6 sm:px-8 py-4 bg-teal-600 text-white rounded-2xl text-base sm:text-lg font-semibold hover:bg-teal-700 transition-all shadow-xl shadow-teal-500/25 flex items-center justify-center gap-2 active:scale-[0.98] group">
                  Start Depositing <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
                <Link href="/login?next=/dashboard" className="min-h-[48px] px-6 sm:px-8 py-4 bg-white text-slate-900 rounded-2xl text-base sm:text-lg font-semibold hover:bg-slate-50 transition-all border border-slate-200/80 shadow-sm flex items-center justify-center active:scale-[0.98]">
                  View Dashboard
                </Link>
              </div>
            </div>
            {/* Decorative stepped bars - brand motif */}
            <div className="hidden lg:flex absolute top-1/2 right-8 -translate-y-1/2 flex-col gap-2 opacity-40">
              {[4, 6, 8, 10, 8, 6].map((h, i) => (
                <div key={i} className="h-2 rounded-full bg-gradient-to-r from-teal-400 to-amber-400" style={{ width: `${h * 12}px` }} />
              ))}
            </div>
          </div>
        </section>

        {/* Features - Bento-style grid with asymmetric cards */}
        <section className="py-14 sm:py-20 lg:py-24 bg-white relative">
          <div className="absolute inset-0 stepay-dots opacity-30" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-10 font-heading text-center">Why Stepay</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
              <div className="bg-gradient-to-br from-teal-50 to-white p-6 sm:p-8 rounded-3xl border border-teal-100/80 shadow-sm hover:shadow-md hover:border-teal-200/60 transition-all group sm:rounded-tl-[2rem]">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-600 mb-4 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 font-heading">Mobile Money First</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">M-Pesa, Airtel Money, MTN. Cash in and out instantly to your phone.</p>
              </div>

              <div className="bg-gradient-to-br from-amber-50/80 to-white p-6 sm:p-8 rounded-3xl border border-amber-100/80 shadow-sm hover:shadow-md hover:border-amber-200/60 transition-all group sm:rounded-tr-[2rem] sm:mt-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-105 transition-transform">
                  <Globe className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 font-heading">Global Access</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">Powered by Stellar. Near-zero fees, 5-second settlement, cross-border.</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-50/80 to-white p-6 sm:p-8 rounded-3xl border border-emerald-100/80 shadow-sm hover:shadow-md hover:border-emerald-200/60 transition-all group sm:rounded-br-[2rem] sm:row-span-2 sm:flex sm:flex-col sm:justify-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-105 transition-transform">
                  <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 font-heading">Secure & Non-Custodial</h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">Your keys, your crypto. We help you manage your wallet securely.</p>
              </div>

              <div className="sm:col-span-2 bg-slate-50/80 p-6 sm:p-8 rounded-3xl border border-slate-200/60 sm:rounded-bl-[2rem]">
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-medium">XLM</span>
                  <span className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-medium">USDC</span>
                  <span className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-medium">Mobile Money</span>
                  <span className="px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-sm font-medium">5s settlement</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-300 py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8">
            <Link href="/" className="flex items-center text-white">
              <Logo iconOnly={false} size="md" variant="dark" />
            </Link>
            <div className="flex gap-8">
              <Link href="/terms" className="text-slate-400 hover:text-white text-sm font-medium py-2 transition-colors">Terms</Link>
              <Link href="/privacy" className="text-slate-400 hover:text-white text-sm font-medium py-2 transition-colors">Privacy</Link>
            </div>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm text-center sm:text-left mt-6">© 2026 Stepay. Built on Stellar.</p>
        </div>
      </footer>
    </div>
  );
}
