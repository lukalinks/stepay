'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Settings, ArrowLeft, Users, History, LayoutDashboard } from 'lucide-react';
import { Logo } from '@/components/Logo';

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/transactions', label: 'Transactions', icon: History },
    { href: '/admin/settings', label: 'Fees & Rates', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        fetch('/api/user')
            .then((res) => {
                if (res.status === 401) {
                    router.replace('/login?next=' + encodeURIComponent('/admin'));
                    return null;
                }
                return res.json();
            })
            .then((data) => {
                if (data && data.user?.role !== 'admin') {
                    router.replace('/dashboard');
                }
            })
            .catch(() => router.replace('/dashboard'));
    }, [router]);

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-slate-500 hover:text-slate-700" title="Back to Dashboard">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <Logo iconOnly size="sm" variant="light" />
                        <span className="font-semibold text-slate-800">Admin</span>
                    </div>
                    <nav className="flex flex-wrap gap-1">
                        {navItems.map(({ href, label, icon: Icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                    pathname === href ? 'bg-teal-100 text-teal-800' : 'text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </header>
            <main className="mx-auto max-w-5xl p-4 sm:p-6">{children}</main>
        </div>
    );
}
