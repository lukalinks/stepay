import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Header } from '@/components/Header';
import { Logo } from '@/components/Logo';

const HERO_IMAGE = '/heropic.jpg';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white pb-[env(safe-area-inset-bottom)]">
      <Header
        maxWidth="full"
        logoSize="lg"
        logoClassName="text-xl sm:text-2xl"
        right={
          <>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2.5 min-h-[44px] flex items-center text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Login
            </Link>
            <Link
              href="/login?next=/dashboard"
              className="rounded-lg bg-slate-900 px-4 py-2.5 min-h-[44px] flex items-center text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-[0.98] sm:px-5"
            >
              Get Started
            </Link>
          </>
        }
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="min-h-[min(100vh,780px)] lg:min-h-[88vh] flex flex-col lg:flex-row items-center gap-12 lg:gap-16 py-12 lg:py-0">
              <div className="flex-1 order-2 lg:order-1 lg:pr-8 xl:pr-12">
                <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-600 mb-6">
                  Stellar Network · Zambia
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-[2.75rem] font-bold tracking-tight text-slate-900 font-heading leading-[1.15]">
                  Crypto for{' '}
                  <span className="text-teal-600">everyone.</span>
                </h1>
                <p className="mt-6 text-base sm:text-lg text-slate-600 leading-[1.7] max-w-lg">
                  Deposit and cash out XLM and USDC with Mobile Money. No bank account required. Low fees. Built for Africa.
                </p>
                <div className="mt-10">
                  <Link
                    href="/login?next=/dashboard/buy"
                    className="inline-flex items-center justify-center gap-2 min-h-[48px] px-8 bg-slate-900 text-white text-base font-semibold rounded-lg hover:bg-slate-800 transition-colors active:scale-[0.98] group"
                  >
                    Start Depositing <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 shrink-0" />
                  </Link>
                </div>
                <p className="mt-8 text-sm text-slate-500">
                  5-second settlement · Non-custodial · MTN, Airtel, Zamtel
                </p>
              </div>
              <div className="flex-1 w-full order-1 lg:order-2 relative">
                <div className="relative aspect-[4/3] lg:aspect-square lg:max-w-[520px] lg:ml-auto rounded-2xl overflow-hidden shadow-xl shadow-slate-200/50 ring-1 ring-slate-900/5 bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HERO_IMAGE}
                    alt="African woman using mobile phone"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 lg:py-32 bg-slate-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <header className="text-center max-w-2xl mx-auto mb-20">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-600 mb-4">
                Process
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 font-heading tracking-tight">
                How it works
              </h2>
              <p className="mt-4 text-slate-600 text-base leading-relaxed">
                Three simple steps to move between ZMW and crypto.
              </p>
            </header>
            <div className="relative grid sm:grid-cols-3 gap-6 lg:gap-8">
              <div className="hidden sm:block absolute top-8 left-[calc(16.666%+1.5rem)] right-[calc(16.666%+1.5rem)] h-0.5 bg-gradient-to-r from-teal-200 via-slate-200 to-amber-200" />
              {[
                {
                  step: 1,
                  title: 'Deposit',
                  desc: 'Enter amount, approve on your phone. ZMW → XLM or USDC in seconds.',
                  color: 'teal',
                  bg: 'bg-teal-50',
                  border: 'border-teal-100',
                  badge: 'bg-teal-600',
                },
                {
                  step: 2,
                  title: 'Use',
                  desc: 'Hold, send to anyone, or spend. Your crypto, your keys.',
                  color: 'slate',
                  bg: 'bg-slate-100',
                  border: 'border-slate-200',
                  badge: 'bg-slate-700',
                },
                {
                  step: 3,
                  title: 'Cash out',
                  desc: 'Convert to ZMW. Funds sent straight to your mobile wallet.',
                  color: 'amber',
                  bg: 'bg-amber-50',
                  border: 'border-amber-100',
                  badge: 'bg-amber-600',
                },
              ].map((item) => (
                <article
                  key={item.step}
                  className={`relative flex flex-col rounded-2xl border ${item.border} ${item.bg} p-6 sm:p-8 lg:p-10 transition-shadow hover:shadow-lg`}
                >
                  <span
                    className={`flex w-12 h-12 shrink-0 items-center justify-center rounded-full ${item.badge} text-white text-sm font-bold shadow-md`}
                  >
                    {item.step}
                  </span>
                  <h3 className="mt-6 text-xl font-semibold text-slate-900 font-heading">{item.title}</h3>
                  <p className="mt-3 text-slate-600 text-sm sm:text-base leading-relaxed">
                    {item.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Features - bento grid */}
        <section className="py-24 lg:py-32 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <header className="text-center max-w-2xl mx-auto mb-20">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-teal-600 mb-4">
                Benefits
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 font-heading tracking-tight">
                Why Stepay
              </h2>
              <p className="mt-4 text-slate-600 text-base leading-relaxed">
                Designed for real money, real people.
              </p>
            </header>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <article className="lg:col-span-2 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-teal-50 to-white border border-teal-100 transition-shadow hover:shadow-lg">
                <h3 className="text-xl font-semibold text-slate-900 font-heading">Mobile Money First</h3>
                <p className="mt-4 text-slate-600 leading-relaxed max-w-md">
                  MTN, Airtel Money, Zamtel. Cash in and out to your phone—no bank needed. Built for how Zambia pays.
                </p>
              </article>
              <article className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200/80 transition-shadow hover:shadow-lg">
                <h3 className="text-lg font-semibold text-slate-900 font-heading">Fast & Low Cost</h3>
                <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                  Stellar: near-zero fees, 5-second finality. No slow confirmations.
                </p>
              </article>
              <article className="p-6 sm:p-8 rounded-2xl bg-slate-50 border border-slate-200/80 transition-shadow hover:shadow-lg">
                <h3 className="text-lg font-semibold text-slate-900 font-heading">Secure & Yours</h3>
                <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                  Your keys, your crypto. We never custody your funds.
                </p>
              </article>
              <div className="lg:col-span-2 p-6 sm:p-8 rounded-2xl bg-slate-900 text-white">
                <h3 className="text-lg font-semibold font-heading">Supported</h3>
                <div className="mt-4 flex flex-wrap gap-3">
                  <span className="px-4 py-2 rounded-lg bg-white/10 text-sm font-medium">XLM</span>
                  <span className="px-4 py-2 rounded-lg bg-white/10 text-sm font-medium">USDC</span>
                  <span className="px-4 py-2 rounded-lg bg-white/10 text-sm font-medium">ZMW</span>
                  <span className="px-4 py-2 rounded-lg bg-white/10 text-sm font-medium">5s settlement</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative py-24 lg:py-32 bg-slate-900 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(20,184,166,0.15),transparent)]" />
          <div className="relative max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white font-heading tracking-tight">
              Ready to get started?
            </h2>
            <p className="mt-4 text-slate-400 text-base sm:text-lg">
              Move between ZMW and crypto in minutes. No bank account required.
            </p>
            <Link
              href="/login?next=/dashboard"
              className="mt-10 inline-flex items-center justify-center min-h-[52px] w-full sm:w-auto px-12 bg-teal-500 text-white rounded-xl text-base font-semibold hover:bg-teal-600 transition-colors active:scale-[0.98] shadow-lg shadow-teal-500/25"
            >
              Get Started
            </Link>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            <div className="lg:col-span-2">
              <Link href="/" className="inline-flex items-center text-white hover:opacity-90 transition-opacity">
                <Logo iconOnly={false} size="lg" variant="dark" />
              </Link>
              <p className="mt-4 text-slate-400 text-sm leading-relaxed max-w-sm">
                Deposit and cash out XLM and USDC with Mobile Money. Built on Stellar for Zambia.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Legal</h4>
              <nav className="flex flex-col gap-3">
                <Link href="/terms" className="text-slate-400 hover:text-white text-sm transition-colors">
                  Terms of Service
                </Link>
                <Link href="/privacy" className="text-slate-400 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
              </nav>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">Network</h4>
              <p className="text-slate-400 text-sm">
                Stellar · Zambia
              </p>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © 2026 Stepay. All rights reserved.
            </p>
            <p className="text-slate-600 text-sm">
              Built on Stellar for Zambia.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
