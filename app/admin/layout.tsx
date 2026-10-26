'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
    Settings,
    Users,
    History,
    LayoutDashboard,
    Menu,
    X,
    Scale,
    FileSearch,
    Wrench,
    Wallet,
    Store,
    Download,
    UserCog,
    Landmark,
    Banknote,
    ShieldAlert,
    Moon,
    Sun,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { mainDashboardUrl } from '@/lib/hosts';
import { adminRoleLabel, canChangeSettings, canExportPii, canManageTeam, canRunOps } from '@/lib/admin-roles';

type NavItem = {
    href: string;
    label: string;
    icon: typeof LayoutDashboard;
    exact?: boolean;
    visible?: (role: string) => boolean;
};

type NavGroup = { id: string; label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
    {
        id: 'main',
        label: 'Overview',
        items: [
            { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
            { href: '/admin/users', label: 'Users', icon: Users },
            { href: '/admin/transactions', label: 'Transactions', icon: History },
            { href: '/admin/merchants', label: 'Merchants', icon: Store },
            { href: '/admin/treasury', label: 'Treasury', icon: Wallet, visible: (r) => canRunOps(r) },
            { href: '/admin/operations', label: 'Operations', icon: Wrench },
        ],
    },
    {
        id: 'manage',
        label: 'Manage',
        items: [
            { href: '/admin/transactions?type=SELL', label: 'Payouts', icon: Banknote },
            { href: '/admin/operations', label: 'Settlements', icon: Landmark },
            { href: '/admin/compliance', label: 'Compliance', icon: Scale },
            { href: '/admin/audit', label: 'Security', icon: FileSearch },
            { href: '/admin/reports', label: 'Reports', icon: Download, visible: (r) => canExportPii(r) || canRunOps(r) },
            { href: '/admin/team', label: 'Team', icon: UserCog, visible: (r) => canManageTeam(r) },
            { href: '/admin/settings', label: 'Settings', icon: Settings, visible: (r) => canChangeSettings(r) },
            { href: '/admin/compliance', label: 'Disputes', icon: ShieldAlert },
        ],
    },
];

function isNavActive(pathname: string, href: string, exact?: boolean) {
    const pathOnly = href.split('?')[0];
    if (exact) return pathname === pathOnly;
    return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

function initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return (parts[0] || 'A').slice(0, 2).toUpperCase();
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [authChecked, setAuthChecked] = useState(false);
    const [adminRole, setAdminRole] = useState<string>('admin_support');
    const [adminName, setAdminName] = useState('Admin');
    const [adminEmail, setAdminEmail] = useState('');
    const [dark, setDark] = useState(false);

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
                const role = data?.user?.role;
                if (data && !['admin', 'admin_ops', 'admin_support'].includes(role)) {
                    window.location.href = mainDashboardUrl();
                    return;
                }
                if (role) setAdminRole(role);
                const name = String(data?.user?.full_name || data?.user?.email || 'Admin');
                setAdminName(name);
                setAdminEmail(String(data?.user?.email || ''));
            })
            .catch(() => {
                window.location.href = mainDashboardUrl();
            })
            .finally(() => setAuthChecked(true));
    }, [router, pathname]);

    const visibleGroups = useMemo(
        () =>
            navGroups
                .map((g) => ({
                    ...g,
                    items: g.items.filter((item) => !item.visible || item.visible(adminRole)),
                }))
                .filter((g) => g.items.length > 0),
        [adminRole]
    );

    if (!authChecked) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#F6F5F2]">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--brand-accent)]" />
            </div>
        );
    }

    return (
        <div
            className={`admin-shell min-h-screen ${
                dark
                    ? 'admin-dark bg-[#0C0E12] text-slate-100'
                    : 'bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(201,169,98,0.12),transparent),linear-gradient(180deg,#F8F7F4_0%,#F3F2EF_100%)] text-slate-900'
            }`}
            data-theme={dark ? 'dark' : 'light'}
        >
            <header
                className={`sticky top-0 z-50 flex items-center justify-between border-b px-4 py-3 backdrop-blur-xl sm:hidden ${
                    dark ? 'border-white/10 bg-[#12151C]/90' : 'border-slate-200/60 bg-white/80'
                }`}
            >
                <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    className={`rounded-xl p-2 ${dark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}`}
                    aria-label="Open menu"
                >
                    <Menu className="h-5 w-5" />
                </button>
                <Link href="/admin" className="flex items-center gap-2">
                    <Logo iconOnly size="sm" variant="light" />
                    <span className="font-heading text-base font-semibold tracking-tight text-slate-800">
                        stepay
                    </span>
                </Link>
                <button
                    type="button"
                    onClick={() => setDark((v) => !v)}
                    className={`rounded-xl p-2 ${dark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-600'}`}
                    aria-label="Toggle theme"
                >
                    {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
            </header>

            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] sm:hidden"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 flex w-[248px] transform flex-col border-r transition-transform duration-200 sm:translate-x-0 ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } ${
                    dark
                        ? 'border-white/[0.06] bg-[#10131A]/95 backdrop-blur-xl'
                        : 'border-slate-200/50 bg-white/75 backdrop-blur-xl'
                }`}
            >
                <div className="flex items-center justify-between px-5 py-5">
                    <Link href="/admin" className="flex items-center gap-2.5" onClick={() => setSidebarOpen(false)}>
                        <Logo iconOnly size="sm" variant="light" />
                        <div>
                            <span className="block font-heading text-[15px] font-semibold tracking-tight text-slate-900">
                                stepay
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-400">
                                Admin
                            </span>
                        </div>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setSidebarOpen(false)}
                        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 sm:hidden"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
                    {visibleGroups.map((group) => (
                        <div key={group.id}>
                            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                                {group.label}
                            </p>
                            <div className="space-y-0.5">
                                {group.items.map(({ href, label, icon: Icon, exact }) => {
                                    const active = isNavActive(pathname, href, exact);
                                    return (
                                        <Link
                                            key={`${group.id}-${href}-${label}`}
                                            href={href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-all ${
                                                active
                                                    ? 'bg-[var(--brand-accent-muted)] text-[#8B7344] shadow-[inset_0_0_0_1px_var(--brand-accent-border)]'
                                                    : dark
                                                      ? 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                                                      : 'text-slate-550 text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                                            }`}
                                        >
                                            <Icon
                                                className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--brand-accent)]' : 'opacity-70'}`}
                                                strokeWidth={1.75}
                                            />
                                            {label}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className={`mt-auto border-t p-4 ${dark ? 'border-white/[0.06]' : 'border-slate-100/80'}`}>
                    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-slate-50/80 p-2.5 ring-1 ring-slate-100">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--brand-accent-muted)] text-xs font-semibold text-[#8B7344]">
                            {initials(adminName)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-slate-800">
                                {adminName.split('@')[0]}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">{adminRoleLabel(adminRole)}</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setDark((v) => !v)}
                            className="hidden rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 sm:inline-flex"
                            aria-label="Toggle theme"
                        >
                            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                        </button>
                    </div>
                    <a
                        href={mainDashboardUrl()}
                        className="block text-center text-[11px] font-medium text-slate-400 transition hover:text-slate-700"
                    >
                        Open user app →
                    </a>
                    {adminEmail && <p className="sr-only">{adminEmail}</p>}
                    <p className="mt-2 text-center text-[10px] text-slate-300">© 2026 Stepay</p>
                </div>
            </aside>

            <main className="min-h-screen sm:pl-[248px]">
                <div className="p-4 sm:p-6 lg:p-8">
                    <div className="mx-auto max-w-[1400px]">{children}</div>
                </div>
            </main>
        </div>
    );
}
