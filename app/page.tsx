import Link from 'next/link';
import { ArrowRight, Zap, Shield, Smartphone, Globe, ArrowUpRight, Clock, Wallet } from 'lucide-react';
import { Header } from '@/components/Header';
import { Logo } from '@/components/Logo';

const HERO_IMAGE = '/heropic.jpg';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#050a0e] pb-[env(safe-area-inset-bottom)]">
      {/* ── Hero ── */}
      <section className="relative min-h-screen overflow-hidden">
        {/* Ambient glow orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-teal-500/10 blur-[120px] animate-[pulse-glow_3s_ease-in-out_infinite]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-500/8 blur-[100px] animate-[pulse-glow_3s_ease-in-out_2s_infinite]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />

        <Header
          maxWidth="full"
          logoSize="lg"
          logoClassName="text-xl sm:text-2xl"
          transparent
          right={
            <>
              <Link
                href="/login"
                className="rounded-full px-4 py-2.5 min-h-[44px] flex items-center text-sm font-medium text-white/70 transition-all hover:text-white hover:bg-white/5"
              >
                Login
              </Link>
              <Link
                href="/signup?next=/dashboard"
                className="rounded-full bg-white px-5 py-2.5 min-h-[44px] flex items-center text-sm font-semibold text-slate-900 transition-all hover:bg-white/90 active:scale-[0.98]"
              >
                Get Started
              </Link>
            </>
          }
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-40 pb-20 lg:pb-32">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
            {/* Left: Copy */}
            <div className="flex-1 animate-[slide-up_0.8s_ease-out]">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 border border-white/10 px-4 py-2 mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-teal-400" />
                </span>
                <span className="text-sm text-white/60 font-medium">Live on Stellar Network</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-white font-heading leading-[1.05]">
                Move money{' '}
                <br className="hidden sm:block" />
                <span className="bg-gradient-to-r from-teal-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  without borders.
                </span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-white/50 leading-relaxed max-w-xl">
                Buy and sell XLM & USDC with Mobile Money. No bank account, no hassle. Instant settlement on Stellar.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mt-10">
                <Link
                  href="/signup?next=/dashboard/buy"
                  className="group relative inline-flex items-center justify-center gap-2.5 min-h-[56px] px-8 bg-gradient-to-r from-teal-500 to-teal-400 text-white text-base font-semibold rounded-2xl transition-all hover:shadow-[0_0_32px_rgba(20,184,166,0.4)] active:scale-[0.98]"
                >
                  Start Depositing
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 min-h-[56px] px-8 rounded-2xl border border-white/10 text-white/70 text-base font-medium hover:bg-white/5 hover:text-white transition-all"
                >
                  How it works
                </Link>
              </div>

              {/* Trust metrics */}
              <div className="flex flex-wrap gap-6 mt-12">
                {[
                  { value: '5s', label: 'Settlement' },
                  { value: '<$0.01', label: 'Fees' },
                  { value: '24/7', label: 'Available' },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col">
                    <span className="text-2xl font-bold text-white font-heading">{stat.value}</span>
                    <span className="text-xs text-white/40 uppercase tracking-wider mt-1">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Hero image with glass frame */}
            <div className="flex-1 w-full max-w-lg lg:max-w-none animate-[fade-in_1s_ease-out_0.3s_both]">
              <div className="relative">
                {/* Glow behind image */}
                <div className="absolute -inset-4 bg-gradient-to-br from-teal-500/20 to-amber-500/10 rounded-3xl blur-2xl" />
                <div className="relative aspect-[4/5] sm:aspect-[3/4] lg:aspect-[4/5] rounded-3xl overflow-hidden ring-1 ring-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HERO_IMAGE}
                    alt="African woman using mobile phone"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                    decoding="async"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#050a0e]/60 via-transparent to-transparent" />
                </div>

                {/* Floating pill: MTN */}
                <div className="absolute -left-4 sm:-left-6 top-1/4 glass rounded-2xl px-4 py-3 animate-[float_6s_ease-in-out_infinite]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Mobile Money</p>
                      <p className="text-sm font-semibold text-white">MTN · Airtel · Zamtel</p>
                    </div>
                  </div>
                </div>

                {/* Floating pill: Instant */}
                <div className="absolute -right-4 sm:-right-6 bottom-1/4 glass rounded-2xl px-4 py-3 animate-[float_6s_ease-in-out_2s_infinite]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
                      <Zap className="w-5 h-5 text-teal-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/50">Settlement</p>
                      <p className="text-sm font-semibold text-white">~5 seconds</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-[fade-in_1s_ease-out_1s_both]">
          <span className="text-xs text-white/30 uppercase tracking-widest">Scroll</span>
          <div className="w-5 h-8 rounded-full border border-white/20 flex justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-white/40 animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="relative py-28 lg:py-36 bg-[#050a0e]">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-500/5 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="text-center max-w-2xl mx-auto mb-20">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-teal-400 mb-4">
              Process
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-heading tracking-tight">
              Three steps.{' '}
              <span className="text-white/40">That&apos;s it.</span>
            </h2>
            <p className="mt-5 text-white/40 text-lg leading-relaxed">
              Move between ZMW and crypto in minutes.
            </p>
          </header>

          <div className="relative grid sm:grid-cols-3 gap-6 lg:gap-8">
            {/* Connector line */}
            <div className="hidden sm:block absolute top-12 left-[calc(16.666%+2rem)] right-[calc(16.666%+2rem)] h-px bg-gradient-to-r from-teal-500/40 via-white/10 to-amber-500/40" />

            {[
              {
                step: 1,
                title: 'Deposit',
                desc: 'Enter amount, approve on your phone. ZMW converts to XLM or USDC in seconds.',
                icon: <Wallet className="w-5 h-5" />,
                gradient: 'from-teal-500/20 to-teal-500/5',
                borderColor: 'border-teal-500/20',
                iconBg: 'bg-teal-500/15',
                iconColor: 'text-teal-400',
                badgeBg: 'bg-teal-500',
              },
              {
                step: 2,
                title: 'Use',
                desc: 'Hold, send to anyone, or spend. Your crypto, your keys — always.',
                icon: <ArrowUpRight className="w-5 h-5" />,
                gradient: 'from-white/10 to-white/5',
                borderColor: 'border-white/10',
                iconBg: 'bg-white/10',
                iconColor: 'text-white/80',
                badgeBg: 'bg-white/20',
              },
              {
                step: 3,
                title: 'Cash out',
                desc: 'Convert back to ZMW. Funds arrive in your mobile wallet instantly.',
                icon: <Smartphone className="w-5 h-5" />,
                gradient: 'from-amber-500/20 to-amber-500/5',
                borderColor: 'border-amber-500/20',
                iconBg: 'bg-amber-500/15',
                iconColor: 'text-amber-400',
                badgeBg: 'bg-amber-500',
              },
            ].map((item) => (
              <article
                key={item.step}
                className={`group relative rounded-3xl border ${item.borderColor} bg-gradient-to-b ${item.gradient} p-8 lg:p-10 transition-all duration-300 hover:border-white/20 hover:-translate-y-1 hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)]`}
              >
                <div className="flex items-center gap-4 mb-6">
                  <span
                    className={`flex w-10 h-10 shrink-0 items-center justify-center rounded-full ${item.badgeBg} text-white text-sm font-bold`}
                  >
                    {item.step}
                  </span>
                  <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center ${item.iconColor}`}>
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white font-heading">{item.title}</h3>
                <p className="mt-3 text-white/40 text-sm sm:text-base leading-relaxed">
                  {item.desc}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features bento grid ── */}
      <section className="relative py-28 lg:py-36 bg-[#050a0e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <header className="text-center max-w-2xl mx-auto mb-20">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-teal-400 mb-4">
              Benefits
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-heading tracking-tight">
              Built for{' '}
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                Africa.
              </span>
            </h2>
            <p className="mt-5 text-white/40 text-lg leading-relaxed">
              Designed for real money, real people.
            </p>
          </header>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Large card: Mobile Money First */}
            <article className="lg:col-span-2 group relative rounded-3xl border border-teal-500/15 bg-gradient-to-br from-teal-500/10 via-teal-500/5 to-transparent p-8 sm:p-10 transition-all hover:border-teal-500/30 hover:shadow-[0_8px_40px_rgba(20,184,166,0.1)]">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/15 flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-semibold text-white font-heading">Mobile Money First</h3>
              <p className="mt-4 text-white/40 leading-relaxed max-w-md">
                MTN, Airtel Money, Zamtel. Cash in and out to your phone — no bank needed. Built for how Zambia pays.
              </p>
              <div className="flex gap-3 mt-6">
                {['MTN', 'Airtel', 'Zamtel'].map((op) => (
                  <span key={op} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-white/60">
                    {op}
                  </span>
                ))}
              </div>
            </article>

            {/* Fast & Low Cost */}
            <article className="group relative rounded-3xl border border-white/8 bg-gradient-to-b from-white/5 to-transparent p-8 transition-all hover:border-white/15 hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-white font-heading">Fast & Low Cost</h3>
              <p className="mt-3 text-white/40 text-sm leading-relaxed">
                Stellar: near-zero fees, 5-second finality. No slow confirmations.
              </p>
            </article>

            {/* Secure */}
            <article className="group relative rounded-3xl border border-white/8 bg-gradient-to-b from-white/5 to-transparent p-8 transition-all hover:border-white/15 hover:shadow-[0_8px_40px_rgba(0,0,0,0.3)]">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                <Shield className="w-6 h-6 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white font-heading">Secure & Yours</h3>
              <p className="mt-3 text-white/40 text-sm leading-relaxed">
                Your keys, your crypto. We never custody your funds.
              </p>
            </article>

            {/* Stats bar */}
            <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: <Globe className="w-5 h-5 text-teal-400" />, label: 'Network', value: 'Stellar' },
                { icon: <Clock className="w-5 h-5 text-amber-400" />, label: 'Settlement', value: '~5 sec' },
                { icon: <Shield className="w-5 h-5 text-emerald-400" />, label: 'Custody', value: 'Non-custodial' },
                { icon: <Zap className="w-5 h-5 text-teal-400" />, label: 'Assets', value: 'XLM · USDC' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    {s.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-white/30 uppercase tracking-wider">{s.label}</p>
                    <p className="text-sm font-semibold text-white truncate">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-28 lg:py-36 overflow-hidden">
        {/* Mesh gradient background */}
        <div className="absolute inset-0 bg-[#050a0e]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(20,184,166,0.12),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,rgba(217,119,6,0.06),transparent)]" />

        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white font-heading tracking-tight">
            Ready to move{' '}
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              forward?
            </span>
          </h2>
          <p className="mt-5 text-white/40 text-lg sm:text-xl max-w-lg mx-auto">
            Join thousands moving between ZMW and crypto. No bank account required.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup?next=/dashboard"
              className="group relative inline-flex items-center justify-center gap-2.5 min-h-[56px] w-full sm:w-auto px-10 bg-gradient-to-r from-teal-500 to-teal-400 text-white rounded-2xl text-base font-semibold transition-all hover:shadow-[0_0_40px_rgba(20,184,166,0.35)] active:scale-[0.98]"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          <p className="mt-6 text-sm text-white/25">
            Non-custodial · No monthly fees · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 bg-[#050a0e]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            <div className="lg:col-span-2">
              <Link href="/" className="inline-flex items-center text-white hover:opacity-90 transition-opacity">
                <Logo iconOnly={false} size="lg" variant="dark" />
              </Link>
              <p className="mt-4 text-white/30 text-sm leading-relaxed max-w-sm">
                Deposit and cash out XLM and USDC with Mobile Money. Built on Stellar for Zambia.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Legal</h4>
              <nav className="flex flex-col gap-3">
                <Link href="/terms" className="text-white/30 hover:text-white text-sm transition-colors">
                  Terms of Service
                </Link>
                <Link href="/privacy" className="text-white/30 hover:text-white text-sm transition-colors">
                  Privacy Policy
                </Link>
              </nav>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Network</h4>
              <p className="text-white/30 text-sm">
                Stellar · Zambia
              </p>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-white/20 text-sm">
              © 2026 Stepay. All rights reserved.
            </p>
            <p className="text-white/10 text-sm">
              Built on Stellar for Zambia.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
