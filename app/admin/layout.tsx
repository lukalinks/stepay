'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Settings, ArrowLeft, Users, History, LayoutDashboard, Menu, X, Scale, FileSearch } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { mainDashboardUrl } from '@/lib/hosts';

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/transactions', label: 'Transactions', icon: History },
    { href: '/admin/audit', label: 'Security', icon: FileSearch },
    { href: '/admin/compliance', label: 'Compliance', icon: Scale },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
];

function isNavActive(pathname: string, href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);

    useEffect(() => {
        fetch('/api/user')
            .then((res) => {
                if (res.status === 401) {
                    router.replace('/login?next=' + encodeURIComponent(pathname || '/admin'));
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (data && data.user?.role !== 'admin') {
                    window.location.href = mainDashboardUrl();
                }
            })
            .catch(() => { window.location.href = mainDashboardUrl(); })
            .finally(() => setAuthChecked(true));
    }, [router, pathname]);

    if (!authChecked) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-100">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--brand-accent)]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100">
            {/* Mobile header */}
            <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:hidden">
                <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                    aria-label="Open menu"
                >
                    <Menu className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-2">
                    <Logo iconOnly size="sm" variant="light" />
                    <span className="font-semibold text-slate-800">Admin</span>
                </div>
                <a href={mainDashboardUrl()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Back to dashboard">
                    <ArrowLeft className="h-5 w-5" />
                </a>
            </header>

            {/* Sidebar overlay (mobile) */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/50 sm:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white shadow-lg transition-transform duration-200 sm:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 sm:px-5">
                        <Link href="/admin" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
                            <Logo iconOnly size="sm" variant="light" />
                            <span className="font-bold text-slate-800">Stepay Admin</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setSidebarOpen(false)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:hidden"
                            aria-label="Close menu"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
                        {navItems.map(({ href, label, icon: Icon, exact }) => (
                            <Link
                                key={href}
                                href={href}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                                    isNavActive(pathname, href, exact)
                                        ? 'bg-[var(--brand-accent-muted)] text-[#8B7344]'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <Icon className="h-5 w-5 shrink-0" />
                                {label}
                            </Link>
                        ))}
                    </nav>
                    <div className="border-t border-slate-200 p-3">
                        <a
                            href={mainDashboardUrl()}
                            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            Back to Dashboard
                        </a>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="min-h-screen sm:pl-64">
                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-6xl">{children}</div>
                </div>
            </main>
        </div>
    );
}
