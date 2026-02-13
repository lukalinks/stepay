'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Home, ArrowLeftRight, Wallet, LogOut, Loader2, Menu, Send, History, X } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useEffect, useState } from 'react';

const navItems = [
    { href: '/dashboard', label: 'Home', icon: Home },
    { href: '/dashboard/buy', label: 'Deposit', icon: ArrowLeftRight },
    { href: '/dashboard/sell', label: 'Cash Out', icon: Wallet },
    { href: '/dashboard/send', label: 'Send', icon: Send },
    { href: '/dashboard/transactions', label: 'Transactions', icon: History },
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
            .then((res) => {
                if (res.status === 401) {
                    const returnTo = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '';
                    router.replace(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login');
                    return;
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
                    className="absolute inset-0 bg-slate-900/50 backdrop-blur-md transition-opacity duration-300"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-hidden
                />
                <div
                    className={`absolute right-0 top-0 h-full w-80 max-w-[90vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
                        mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 shrink-0">
                        <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center text-slate-900">
                            <Logo iconOnly={false} size="md" variant="light" />
                        </Link>
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="p-2.5 -m-2 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition-colors"
                            aria-label="Close menu"
                        >
                            <X className="h-5 w-5 text-slate-600" />
                        </button>
                    </div>
                    <nav className="flex-1 overflow-auto p-4 space-y-1">
                        {navItems.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`flex items-center gap-4 rounded-xl px-4 py-3.5 min-h-[52px] transition-colors ${
                                    pathname === href
                                        ? 'bg-teal-50 text-teal-700 font-semibold'
                                        : 'text-slate-700 hover:bg-slate-50 active:bg-slate-100'
                                }`}
                            >
                                <div className={`p-2 rounded-lg shrink-0 ${pathname === href ? 'bg-teal-200/50' : 'bg-slate-100'}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                {label}
                            </Link>
                        ))}
                    </nav>
                    <div className="border-t border-slate-200/60 p-4">
                        <button
                            onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                            className="flex w-full items-center gap-4 rounded-xl px-4 py-3.5 min-h-[52px] text-left text-red-600 hover:bg-red-50 active:bg-red-100 font-medium transition-colors"
                        >
                            <div className="p-2 rounded-lg bg-red-100 shrink-0">
                                <LogOut className="h-5 w-5" />
                            </div>
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 overflow-auto pb-24 md:pb-0 min-h-screen">
                <div className="mx-auto max-w-5xl p-4 sm:p-6 md:p-8">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Nav - Sleek pill style */}
            <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around gap-1 px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden bg-white/90 backdrop-blur-xl border-t border-slate-200/60">
                {navItems.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`flex flex-col items-center gap-1 px-4 py-2 min-h-[52px] justify-center rounded-2xl transition-all duration-200 ${
                            pathname === href
                                ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/25'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                    >
                        <Icon className="h-5 w-5" />
                        <span className="text-[10px] font-medium">{label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
