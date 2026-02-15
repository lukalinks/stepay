'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeftRight, Wallet, LogOut, Loader2, Menu, Send, History, X, UserCircle, MoreHorizontal } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useEffect, useState } from 'react';

const navItems = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/dashboard/buy', label: 'Deposit', icon: ArrowLeftRight },
    { href: '/dashboard/sell', label: 'Cash Out', icon: Wallet },
    { href: '/dashboard/send', label: 'Send', icon: Send },
    { href: '/dashboard/transactions', label: 'Transactions', icon: History },
    { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
];

// Mobile bottom nav: Home, Deposit, Send, Cash Out, More (Send easily accessible)
const mobileBottomNavItems = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/dashboard/buy', label: 'Deposit', icon: ArrowLeftRight },
    { href: '/dashboard/send', label: 'Send', icon: Send },
    { href: '/dashboard/sell', label: 'Cash Out', icon: Wallet },
    { href: null, label: 'More', icon: MoreHorizontal, isMenu: true },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [authChecked, setAuthChecked] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileIncomplete, setProfileIncomplete] = useState(false);

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    useEffect(() => {
        fetch('/api/user')
            .then(async (res) => {
                if (res.status === 401) {
                    const returnTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
                    router.replace(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login');
                    return;
                }
                if (res.ok) {
                    const data = await res.json();
                    setProfileIncomplete(data.user?.isProfileComplete === false);
                }
                setAuthChecked(true);
            })
            .catch(() => router.replace('/login'));
    }, [router]);

    const handleSignOut = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.replace('/login');
        } catch {
            router.replace('/login');
        }
    };

    if (!authChecked) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#faf9f7]">
                <Loader2 className="h-8 w-8 animate-spin text-teal-500" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#faf9f7] md:flex-row">
            {/* Desktop Sidebar - Sleek dark */}
            <aside className="hidden w-64 flex-col bg-slate-900 md:flex shrink-0">
                <div className="p-6 border-b border-slate-700/50">
                    <Link href="/" className="flex items-center text-white group">
                        <Logo iconOnly={false} size="md" variant="dark" className="text-white" />
                    </Link>
                </div>
                <nav className="flex-1 space-y-1 p-4">
                    {navItems.map(({ href, label, icon: Icon }) => (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                                pathname === href
                                    ? 'bg-teal-500/15 text-teal-400 shadow-sm'
                                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                            }`}
                        >
                            <Icon className="h-5 w-5 shrink-0" />
                            {label}
                        </Link>
                    ))}
                </nav>
                <div className="border-t border-slate-700/50 p-4">
                    <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200">
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header
              className="flex min-h-14 items-center justify-between gap-4 px-4 pb-3 sm:min-h-16 sm:px-6 sm:pb-4 md:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/60"
              style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
            >
                <Link href="/" className="flex min-h-10 min-w-10 -m-2 items-center justify-center rounded-xl text-slate-900 transition-opacity hover:opacity-80 active:opacity-90">
                    <Logo iconOnly={false} size="md" variant="light" />
                </Link>
                <button
                    type="button"
                    onClick={() => setMobileMenuOpen((o) => !o)}
                    className="flex min-h-10 min-w-10 -m-2 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 active:bg-slate-200"
                    aria-label="Menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
            </header>

            {/* Mobile Slide Menu */}
            <div
                className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ease-out ${
                    mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                aria-hidden={!mobileMenuOpen}
            >
                <div
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-hidden
                />
                <div
                    className={`absolute right-0 top-0 bottom-0 w-[min(320px,85vw)] flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
                        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                    style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
                        <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Menu</span>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-2.5 -m-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            aria-label="Close menu"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Nav: Main */}
                    <nav className="flex-1 overflow-auto py-4">
                        <div className="px-3 pb-3">
                            <p className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Main</p>
                            <div className="space-y-0.5 rounded-2xl bg-slate-50/80 p-1.5">
                                {[navItems[0], navItems[1], navItems[3], navItems[2]].map(({ href, label, icon: Icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 rounded-xl px-4 py-3.5 transition-colors ${
                                            pathname === href
                                                ? 'bg-white text-teal-700 font-semibold shadow-sm'
                                                : 'text-slate-700 active:bg-white/80'
                                        }`}
                                    >
                                        <Icon className={`h-5 w-5 shrink-0 ${pathname === href ? 'text-teal-600' : 'text-slate-400'}`} />
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        </div>

                        {/* Nav: More */}
                        <div className="px-3">
                            <p className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">More</p>
                            <div className="space-y-0.5 rounded-2xl bg-slate-50/80 p-1.5">
                                {[navItems[4], navItems[5]].map(({ href, label, icon: Icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 rounded-xl px-4 py-3.5 transition-colors ${
                                            pathname === href
                                                ? 'bg-white text-teal-700 font-semibold shadow-sm'
                                                : 'text-slate-700 active:bg-white/80'
                                        }`}
                                    >
                                        <Icon className={`h-5 w-5 shrink-0 ${pathname === href ? 'text-teal-600' : 'text-slate-400'}`} />
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </nav>

                    {/* Sign out */}
                    <div className="p-4 pt-2 border-t border-slate-100 shrink-0">
                        <button
                            onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                            className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-red-600 hover:bg-red-50 active:bg-red-100 font-medium transition-colors"
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            Sign out
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto pb-24 md:pb-0 min-h-screen">
                <div className="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
                    {profileIncomplete && (
                        <Link
                            href={`/profile/complete?next=${encodeURIComponent(pathname)}`}
                            className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 hover:border-teal-200 transition-colors group"
                        >
                            <div className="flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-teal-100 flex items-center justify-center group-hover:bg-teal-200/80 transition-colors">
                                <UserCircle className="w-6 h-6 sm:w-7 sm:h-7 text-teal-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-base sm:text-lg font-semibold text-slate-800">
                                    You&apos;re almost set!
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                    Add your name, phone, and address so you can easily deposit and cash out. It only takes a minute.
                                </p>
                            </div>
                            <span className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium group-hover:bg-teal-700 transition-colors">
                                Add my details
                                <span aria-hidden>→</span>
                            </span>
                        </Link>
                    )}
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Nav - 4 main + More (opens menu: Send, Profile, Sign out) */}
            <nav
                className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-0 px-2 sm:px-4 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200/80 shadow-[0_-2px_10px_-2px_rgba(0,0,0,0.05)]"
                aria-label="Main navigation"
            >
                {mobileBottomNavItems.map((item) => {
                    const { href, label, icon: Icon, isMenu } = item as { href: string | null; label: string; icon: typeof Home; isMenu?: boolean };
                    const isActive = !isMenu && pathname === href;
                    if (isMenu) {
                        return (
                            <button
                                key="more"
                                type="button"
                                onClick={() => setMobileMenuOpen(true)}
                                className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-2.5 px-2 rounded-xl transition-all duration-200 text-slate-500 active:bg-slate-100"
                                aria-label="More options: Send, Profile, Sign out"
                            >
                                <Icon className="w-6 h-6 shrink-0" strokeWidth={1.75} />
                                <span className="text-[11px] font-medium truncate w-full text-center leading-tight text-slate-600">
                                    {label}
                                </span>
                            </button>
                        );
                    }
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex flex-col items-center justify-center gap-1 flex-1 min-w-0 py-2.5 px-2 rounded-xl transition-all duration-200 ${
                                isActive
                                    ? 'text-teal-600 bg-teal-50'
                                    : 'text-slate-500 active:bg-slate-100'
                            }`}
                        >
                            <Icon className={`w-6 h-6 shrink-0 ${isActive ? 'text-teal-600' : ''}`} strokeWidth={isActive ? 2.25 : 1.75} />
                            <span className={`text-[11px] font-medium truncate w-full text-center leading-tight ${isActive ? 'text-teal-700' : 'text-slate-600'}`}>
                                {label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
