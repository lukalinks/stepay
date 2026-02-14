import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { Logo } from '@/components/Logo';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?auto=format&fit=crop&w=1200&q=80';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-[env(safe-area-inset-bottom)]">
      <Header
        maxWidth="full"
        logoSize="lg"
        logoClassName="text-xl sm:text-2xl"
        right={
          <>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2.5 min-h-[44px] flex items-center text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Login
            </Link>
            <Link
              href="/login?next=/dashboard"
              className="rounded-full bg-slate-900 px-4 py-2.5 min-h-[44px] flex items-center text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98] sm:px-5"
            >
              Get Started
            </Link>
          </>
        }
      />

      <main className="flex-1">
        {/* Hero - split layout with African image */}
        <section className="relative min-h-[min(100vh,700px)] flex flex-col lg:flex-row lg:min-h-[90vh]">
          <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-12 xl:px-20 pt-6 pb-12 sm:pt-12 sm:pb-16 lg:pt-0 lg:pb-0 order-2 lg:order-1">
            <div className="max-w-xl">
              <span className="inline-block text-xs font-medium tracking-widest uppercase text-teal-600 mb-4 sm:mb-6">
                Stellar · Zambia
              </span>
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 font-heading leading-[1.1]">
                Crypto for
                <span className="block mt-1 text-teal-600">everyone.</span>
              </h1>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-600 leading-relaxed">
                Deposit and cash out XLM and USDC with Mobile Money. No bank. Low fees. Built for Africa.
              </p>
              <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Link
                  href="/login?next=/dashboard/buy"
                  className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 sm:px-8 py-3.5 bg-slate-900 text-white text-base font-semibold rounded-xl hover:bg-slate-800 transition-colors active:scale-[0.98] group"
                >
                  Start Depositing <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 shrink-0" />
                </Link>
                <Link
                  href="/login?next=/dashboard"
                  className="inline-flex items-center justify-center min-h-[48px] px-6 sm:px-8 py-3.5 text-slate-700 text-base font-semibold rounded-xl border border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-colors active:scale-[0.98]"
                >
                  View Dashboard
                </Link>
              </div>
              <p className="mt-6 sm:mt-10 text-xs sm:text-sm text-slate-500 text-center sm:text-left">
                5-second settlement · Non-custodial · MTN, Airtel, Zamtel
              </p>
            </div>
          </div>
          <div className="flex-1 relative min-h-[40vh] sm:min-h-[45vh] lg:min-h-[90vh] order-1 lg:order-2">
            <div className="absolute inset-0 lg:inset-y-0 lg:left-0 lg:right-8 xl:right-16 lg:rounded-l-3xl overflow-hidden">
              <Image
                src={HERO_IMAGE}
                alt="African woman using mobile phone"
                fill
                className="object-cover object-center"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/50 to-transparent lg:from-slate-50 lg:via-slate-50/30 lg:to-transparent" />
              <div className="absolute inset-0 lg:hidden bg-gradient-to-t from-slate-50 to-transparent" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-14 sm:py-20 lg:py-28 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 font-heading">
                How it works
              </h2>
              <p className="mt-2 sm:mt-3 text-slate-600 text-sm sm:text-base max-w-lg mx-auto">
                Three steps to move between ZMW and crypto.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              <div className="text-center p-4 sm:p-0 rounded-2xl sm:rounded-none bg-slate-50/50 sm:bg-transparent">
                <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-teal-100 text-teal-600 text-sm font-bold">
                  1
                </span>
                <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold text-slate-900 font-heading">Deposit</h3>
                <p className="mt-1.5 sm:mt-2 text-slate-600 text-sm leading-relaxed">
                  Enter amount, approve on your phone. ZMW → XLM or USDC in seconds.
                </p>
              </div>
              <div className="text-center p-4 sm:p-0 rounded-2xl sm:rounded-none bg-slate-50/50 sm:bg-transparent">
                <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-slate-200 text-slate-600 text-sm font-bold">
                  2
                </span>
                <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold text-slate-900 font-heading">Use</h3>
                <p className="mt-1.5 sm:mt-2 text-slate-600 text-sm leading-relaxed">
                  Hold, send to anyone, or spend. Your crypto, your keys.
                </p>
              </div>
              <div className="text-center p-4 sm:p-0 rounded-2xl sm:rounded-none bg-slate-50/50 sm:bg-transparent">
                <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 text-sm font-bold">
                  3
                </span>
                <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold text-slate-900 font-heading">Cash out</h3>
                <p className="mt-1.5 sm:mt-2 text-slate-600 text-sm leading-relaxed">
                  Convert to ZMW. Funds sent straight to your mobile wallet.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-14 sm:py-20 lg:py-28 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-10 sm:mb-16">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 font-heading">
                Why Stepay
              </h2>
              <p className="mt-2 sm:mt-3 text-slate-600 text-sm sm:text-base max-w-lg mx-auto">
                Designed for real money, real people.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 font-heading">Mobile Money First</h3>
                <p className="mt-1.5 sm:mt-2 text-slate-600 text-sm leading-relaxed">
                  MTN, Airtel Money, Zamtel. Cash in and out to your phone—no bank needed.
                </p>
              </div>
              <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 font-heading">Fast & Low Cost</h3>
                <p className="mt-1.5 sm:mt-2 text-slate-600 text-sm leading-relaxed">
                  Stellar: near-zero fees, 5-second finality. No slow confirmations.
                </p>
              </div>
              <div className="bg-white p-5 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 font-heading">Secure & Yours</h3>
                <p className="mt-1.5 sm:mt-2 text-slate-600 text-sm leading-relaxed">
                  Your keys, your crypto. We never custody your funds.
                </p>
              </div>
            </div>
            <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
              <span className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium">
                XLM
              </span>
              <span className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium">
                USDC
              </span>
              <span className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs sm:text-sm font-medium">
                ZMW
              </span>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-14 sm:py-20 bg-slate-900">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white font-heading">
              Ready to get started?
            </h2>
            <p className="mt-2 sm:mt-3 text-slate-400 text-sm sm:text-base">
              Move between ZMW and crypto in minutes.
            </p>
            <Link
              href="/login?next=/dashboard"
              className="mt-6 sm:mt-8 inline-flex items-center justify-center min-h-[48px] w-full sm:w-auto sm:min-w-0 px-10 py-3.5 bg-white text-slate-900 rounded-xl text-base font-semibold hover:bg-slate-100 transition-colors active:scale-[0.98]"
            >
              Get Started
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-slate-900 border-t border-slate-800 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-6">
            <Link href="/" className="flex items-center text-white hover:opacity-90 transition-opacity min-h-[44px]">
              <Logo iconOnly={false} size="md" variant="dark" />
            </Link>
            <div className="flex gap-6 sm:gap-8">
              <Link href="/terms" className="text-slate-400 hover:text-white text-sm font-medium py-2 transition-colors min-h-[44px] flex items-center">
                Terms
              </Link>
              <Link href="/privacy" className="text-slate-400 hover:text-white text-sm font-medium py-2 transition-colors min-h-[44px] flex items-center">
                Privacy
              </Link>
            </div>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm mt-4 sm:mt-6 text-center sm:text-left">
            © 2026 Stepay. Built on Stellar for Zambia.
          </p>
        </div>
      </footer>
    </div>
  );
}
