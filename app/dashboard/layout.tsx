'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    ArrowLeftRight,
    ArrowDownUp,
    ArrowUpRight,
    Wallet,
    LogOut,
    Menu,
    Send,
    History,
    UserCircle,
    HandCoins,
    Store,
    MoreHorizontal,
    BarChart3,
    Settings,
    X as CloseIcon,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { DashboardWelcomeToast } from '@/components/DashboardWelcomeToast';
import { UserAvatar } from '@/components/UserAvatar';
import { getDisplayName } from '@/lib/user-display';
import { BRAND } from '@/lib/brand';
import { PAGE_META } from '@/lib/dashboard-ui';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { WalletProvider } from '@/components/wallet/WalletProvider';
import { DashboardWalletExtras } from '@/components/wallet/DashboardWalletExtras';
import { clearAccountLocalState } from '@/lib/client-wallet';
import { isStaleSessionAfterSignup, syncClientAccountSession } from '@/lib/client-account-sync';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MuiLink from '@mui/material/Link';

const SIDEBAR_WIDTH = 240;

type NavItem = { href: string; label: string; icon: typeof Wallet };
type NavSection = { label: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
    {
        label: 'Overview',
        items: [{ href: '/dashboard', label: 'Wallet', icon: Wallet }],
    },
    {
        label: 'Activity',
        items: [{ href: '/dashboard/transactions', label: 'Transactions', icon: History }],
    },
    {
        label: 'Transfer',
        items: [
            { href: '/dashboard/buy', label: 'Deposit', icon: ArrowLeftRight },
            { href: '/dashboard/swap', label: 'Swap', icon: ArrowDownUp },
            { href: '/dashboard/send', label: 'Phone Pay', icon: Send },
            { href: '/dashboard/request', label: 'Request', icon: HandCoins },
            { href: '/dashboard/sell', label: 'Cash Out', icon: ArrowUpRight },
        ],
    },
    {
        label: 'Account',
        items: [
            { href: '/dashboard/merchant', label: 'Merchant', icon: Store },
            { href: '/dashboard/rates', label: 'Rates', icon: BarChart3 },
            { href: '/dashboard/profile', label: 'Profile', icon: UserCircle },
            { href: '/dashboard/settings', label: 'Settings', icon: Settings },
        ],
    },
];

const mobileBottomNavItems = [
    { href: '/dashboard', label: 'Wallet', icon: Wallet },
    { href: '/dashboard/buy', label: 'Deposit', icon: ArrowLeftRight },
    { href: '/dashboard/send', label: 'Send', icon: Send },
    { href: null, label: 'More', icon: MoreHorizontal, isMenu: true },
];

type UserSummary = {
    email?: string | null;
    fullName?: string | null;
    phone?: string | null;
    role?: string;
    walletCustody?: 'self' | 'hosted';
    hasCloudBackup?: boolean;
    cloudBackupEnabled?: boolean;
    walletPublic?: string | null;
    isProfileComplete?: boolean;
};

function NavIcon({ Icon, active }: { Icon: typeof Wallet; active?: boolean }) {
    return <Icon strokeWidth={active ? 2.25 : 1.75} style={{ width: 20, height: 20 }} />;
}

function navItemSx(active: boolean) {
    return {
        borderRadius: 2,
        mb: 0.125,
        py: 0.75,
        px: 1.25,
        color: active ? BRAND.accentContrast : BRAND.textMuted,
        transition: 'all 0.2s ease',
        '&.Mui-selected': {
            bgcolor: BRAND.accent,
            color: BRAND.accentContrast,
            boxShadow: `0 4px 16px ${BRAND.accentMuted}`,
            '&:hover': { bgcolor: BRAND.accentHover },
        },
        '&:hover': { bgcolor: active ? BRAND.accentHover : 'rgba(255,255,255,0.05)' },
    };
}

function SidebarNav({
    pathname,
    onNavigate,
    showSections = true,
}: {
    pathname: string;
    onNavigate?: () => void;
    showSections?: boolean;
}) {
    return (
        <>
            {NAV_SECTIONS.map((section) => (
                <Box key={section.label} sx={{ mb: 1.25 }}>
                    {showSections && (
                        <Typography
                            sx={{
                                px: 1.5,
                                mb: 0.75,
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                letterSpacing: '0.14em',
                                textTransform: 'uppercase',
                                color: 'rgba(255,255,255,0.28)',
                            }}
                        >
                            {section.label}
                        </Typography>
                    )}
                    <List disablePadding sx={{ px: 1 }}>
                        {section.items.map(({ href, label, icon: Icon }) => {
                            const active = pathname === href;
                            return (
                                <ListItemButton
                                    key={href}
                                    component={Link}
                                    href={href}
                                    selected={active}
                                    onClick={onNavigate}
                                    sx={navItemSx(active)}
                                >
                                    <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                                        <NavIcon Icon={Icon} active={active} />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={label}
                                        sx={{
                                            '& .MuiListItemText-primary': {
                                                fontWeight: active ? 700 : 500,
                                                fontSize: '0.8125rem',
                                            },
                                        }}
                                    />
                                </ListItemButton>
                            );
                        })}
                    </List>
                </Box>
            ))}
        </>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authChecked, setAuthChecked] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileIncomplete, setProfileIncomplete] = useState(false);
    const [userSummary, setUserSummary] = useState<UserSummary | null>(null);

    const bottomNav = useMemo(() => {
        const match = mobileBottomNavItems.find((i) => i.href === pathname);
        return match?.href ?? false;
    }, [pathname]);

    const pageMeta = PAGE_META[pathname] ?? { title: 'Dashboard', subtitle: '' };
    const displayName = userSummary ? getDisplayName(userSummary) : 'there';

    useEffect(() => {
        document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileMenuOpen]);

    useEffect(() => {
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 15_000);

        // Lightweight profile fetch — full /api/user hits Stellar and can exceed the abort timeout.
        fetch(`/api/user/profile?_=${Date.now()}`, { signal: controller.signal, credentials: 'include', cache: 'no-store' })
            .then(async (res) => {
                if (res.status === 401) {
                    const returnTo =
                        typeof window !== 'undefined'
                            ? window.location.pathname + window.location.search
                            : '';
                    router.replace(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login');
                    return;
                }
                if (res.ok) {
                    const data = await res.json();
                    if (typeof data.userId === 'string') {
                        if (isStaleSessionAfterSignup(data.userId)) {
                            clearAccountLocalState();
                            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                            window.location.href = '/login?error=session';
                            return;
                        }
                        syncClientAccountSession(data.userId);
                    }
                    setProfileIncomplete(data.isProfileComplete === false);
                    setUserSummary({
                        email: data.email,
                        fullName: data.fullName,
                        phone: data.phone,
                        walletCustody: data.walletCustody ?? 'self',
                        hasCloudBackup: Boolean(data.hasCloudBackup),
                        cloudBackupEnabled: data.cloudBackupEnabled !== false,
                        walletPublic: data.walletPublic ?? null,
                        isProfileComplete: data.isProfileComplete !== false,
                    });
                }
                setAuthChecked(true);
            })
            .catch(() => {
                // Session is already validated by middleware; don't sign the user out on slow network.
                setAuthChecked(true);
            })
            .finally(() => window.clearTimeout(timeout));

        return () => {
            controller.abort();
            window.clearTimeout(timeout);
        };
    }, [router, pathname]);

    const handleSignOut = async () => {
        try {
            clearAccountLocalState();
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
            window.location.href = '/login';
        } catch {
            clearAccountLocalState();
            window.location.href = '/login';
        }
    };

    if (!authChecked) {
        return (
            <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: BRAND.bg }}>
                <Box sx={{ display: { xs: 'none', lg: 'block' }, width: SIDEBAR_WIDTH, borderRight: `1px solid ${BRAND.border}`, p: 3 }}>
                    <Skeleton variant="rounded" width={100} height={28} sx={{ bgcolor: 'rgba(255,255,255,0.06)', mb: 4 }} />
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} variant="rounded" height={40} sx={{ bgcolor: 'rgba(255,255,255,0.06)', mb: 0.75 }} />
                    ))}
                </Box>
                <Box sx={{ flex: 1, p: { xs: 2, lg: 4 } }}>
                    <Skeleton variant="rounded" height={32} sx={{ mb: 1, maxWidth: 240, bgcolor: 'rgba(255,255,255,0.06)' }} />
                    <Skeleton variant="rounded" height={20} sx={{ mb: 4, maxWidth: 360, bgcolor: 'rgba(255,255,255,0.04)' }} />
                    <Skeleton variant="rounded" height={120} sx={{ mb: 3, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)' }} />
                    <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3, bgcolor: 'rgba(255,255,255,0.06)' }} />
                </Box>
            </Box>
        );
    }

    const userBlock = userSummary && (
        <Box sx={{ px: 1.5, py: 1.5, borderTop: `1px solid ${BRAND.border}` }}>
            <ListItemButton
                component={Link}
                href="/dashboard/profile"
                sx={{
                    borderRadius: 2,
                    py: 1.25,
                    px: 1.5,
                    bgcolor: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${BRAND.border}`,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.06)' },
                }}
            >
                <ListItemIcon sx={{ minWidth: 40 }}>
                    <UserAvatar fullName={userSummary.fullName} email={userSummary.email} size={32} />
                </ListItemIcon>
                <ListItemText
                    primary={getDisplayName(userSummary)}
                    secondary={userSummary.email || userSummary.phone || 'Account'}
                    sx={{
                        '& .MuiListItemText-primary': { fontWeight: 600, fontSize: '0.8125rem', color: '#fff' },
                        '& .MuiListItemText-secondary': { fontSize: '0.6875rem', color: BRAND.textSubtle },
                    }}
                />
            </ListItemButton>
            <ListItemButton
                onClick={handleSignOut}
                sx={{
                    mt: 0.5,
                    borderRadius: 2,
                    py: 1,
                    color: BRAND.textSubtle,
                    '&:hover': { bgcolor: 'rgba(239,68,68,0.1)', color: '#f87171' },
                }}
            >
                <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
                    <LogOut style={{ width: 18, height: 18 }} />
                </ListItemIcon>
                <ListItemText primary="Sign out" sx={{ '& .MuiListItemText-primary': { fontSize: '0.8125rem' } }} />
            </ListItemButton>
        </Box>
    );

    return (
        <WalletProvider
            walletCustody={userSummary?.walletCustody ?? null}
            serverWalletPublic={userSummary?.walletPublic}
            hasCloudBackup={Boolean(userSummary?.hasCloudBackup)}
        >
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: BRAND.bg }} className="dashboard-grain">
            {/* Desktop sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', lg: 'block' },
                    width: SIDEBAR_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: SIDEBAR_WIDTH,
                        boxSizing: 'border-box',
                        bgcolor: BRAND.surface,
                        borderRight: `1px solid ${BRAND.border}`,
                    },
                }}
                open
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Toolbar sx={{ px: 2, py: 2, minHeight: 56 }}>
                        <MuiLink component={Link} href="/" sx={{ display: 'flex', '&:hover': { opacity: 0.9 } }}>
                            <Logo iconOnly={false} size="md" variant="neon" className="text-white" />
                        </MuiLink>
                    </Toolbar>
                    <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
                        <SidebarNav pathname={pathname} />
                    </Box>
                    {userBlock}
                </Box>
            </Drawer>

            <Suspense fallback={null}>
                <DashboardWelcomeToast displayName={displayName} />
            </Suspense>

            {/* Mobile top bar */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <AppBar
                    position="sticky"
                    elevation={0}
                    sx={{
                        display: { xs: 'flex', lg: 'none' },
                        bgcolor: 'rgba(5,5,5,0.92)',
                        backdropFilter: 'blur(12px)',
                        borderBottom: `1px solid ${BRAND.border}`,
                        pt: 'env(safe-area-inset-top)',
                        color: '#fff',
                    }}
                >
                    <Toolbar sx={{ justifyContent: 'space-between', minHeight: 56, px: { xs: 1.5, sm: 2 } }}>
                        <Box sx={{ minWidth: 0, flex: 1, pr: 1 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }} noWrap>
                                {pageMeta.title}
                            </Typography>
                            {pageMeta.subtitle && pathname !== '/dashboard' && (
                                <Typography
                                    sx={{
                                        fontSize: '0.6875rem',
                                        color: BRAND.textSubtle,
                                        mt: 0.25,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {pageMeta.subtitle}
                                </Typography>
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {userSummary && (
                                <IconButton component={Link} href="/dashboard/profile" aria-label="Profile" sx={{ p: 0.5 }}>
                                    <UserAvatar fullName={userSummary.fullName} email={userSummary.email} size={32} />
                                </IconButton>
                            )}
                            <IconButton aria-label="Menu" onClick={() => setMobileMenuOpen(true)} sx={{ color: BRAND.textMuted }}>
                                <Menu style={{ width: 22, height: 22 }} />
                            </IconButton>
                        </Box>
                    </Toolbar>
                </AppBar>

                {/* Mobile drawer */}
                <Drawer
                    anchor="right"
                    open={mobileMenuOpen}
                    onClose={() => setMobileMenuOpen(false)}
                    slotProps={{
                        paper: {
                            sx: {
                                width: 'min(300px, 88vw)',
                                bgcolor: BRAND.surface,
                                color: '#fff',
                                pt: 'env(safe-area-inset-top)',
                            },
                        },
                    }}
                    sx={{ display: { xs: 'block', lg: 'none' } }}
                >
                    <Toolbar sx={{ justifyContent: 'space-between', borderBottom: `1px solid ${BRAND.border}`, px: 2 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Menu</Typography>
                        <IconButton onClick={() => setMobileMenuOpen(false)} edge="end" sx={{ color: BRAND.textMuted }}>
                            <CloseIcon style={{ width: 20, height: 20 }} />
                        </IconButton>
                    </Toolbar>
                    <Box sx={{ overflow: 'auto', py: 2, flex: 1 }}>
                        <SidebarNav pathname={pathname} onNavigate={() => setMobileMenuOpen(false)} showSections={false} />
                    </Box>
                    <Box sx={{ p: 2, borderTop: `1px solid ${BRAND.border}` }}>
                        <Button
                            fullWidth
                            color="error"
                            variant="text"
                            startIcon={<LogOut style={{ width: 18, height: 18 }} />}
                            onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                            sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600 }}
                        >
                            Sign out
                        </Button>
                    </Box>
                </Drawer>

                {/* Main content */}
                <Box
                    component="main"
                    className="dashboard-shell"
                    sx={{
                        flex: 1,
                        overflow: 'auto',
                        overflowX: 'hidden',
                        pb: { xs: 'calc(64px + env(safe-area-inset-bottom, 0px))', lg: 0 },
                        WebkitOverflowScrolling: 'touch',
                        position: 'relative',
                        zIndex: 1,
                    }}
                >
                    {/* Desktop page header */}
                    <Box
                        sx={{
                            display: { xs: 'none', lg: 'block' },
                            borderBottom: `1px solid ${BRAND.border}`,
                            bgcolor: BRAND.bg,
                        }}
                    >
                        <Box
                            sx={{
                                maxWidth: 1280,
                                mx: 'auto',
                                px: 4,
                                py: 2,
                                display: 'flex',
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                                gap: 2,
                            }}
                        >
                            <Box>
                                <Typography
                                    className="font-heading"
                                    sx={{ fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.03em', color: '#fff', lineHeight: 1.2 }}
                                >
                                    {pageMeta.title}
                                </Typography>
                                {pageMeta.subtitle && pathname !== '/dashboard' && (
                                    <Typography sx={{ mt: 0.5, fontSize: '0.875rem', color: BRAND.textMuted, maxWidth: 520, lineHeight: 1.5 }}>
                                        {pageMeta.subtitle}
                                    </Typography>
                                )}
                            </Box>
                            {userSummary && (
                                <Button
                                    component={Link}
                                    href="/dashboard/profile"
                                    variant="outlined"
                                    size="small"
                                    startIcon={<UserAvatar fullName={userSummary.fullName} email={userSummary.email} size={28} />}
                                    sx={{
                                        borderRadius: 999,
                                        py: 0.75,
                                        px: 2,
                                        borderColor: BRAND.borderStrong,
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        fontSize: '0.8125rem',
                                        color: '#fff',
                                        flexShrink: 0,
                                        '&:hover': { borderColor: BRAND.accent, bgcolor: BRAND.accentMuted },
                                    }}
                                >
                                    {getDisplayName(userSummary)}
                                </Button>
                            )}
                        </Box>
                    </Box>

                    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 1.5, sm: 2.5, lg: 3 }, py: { xs: 1.5, sm: 2, lg: 3 }, width: '100%', minWidth: 0 }}>
                        <DashboardWalletExtras profileIncomplete={profileIncomplete} />
                        {profileIncomplete && (
                            <Paper
                                component={Link}
                                href={`/profile/complete?next=${encodeURIComponent(pathname)}`}
                                elevation={0}
                                sx={{
                                    mb: 2,
                                    display: 'flex',
                                    flexDirection: { xs: 'column', sm: 'row' },
                                    alignItems: { sm: 'center' },
                                    gap: 1.5,
                                    p: 2,
                                    borderRadius: 2,
                                    border: `1px solid ${BRAND.accentBorder}`,
                                    bgcolor: BRAND.accentSubtle,
                                    textDecoration: 'none',
                                    color: '#fff',
                                    '&:hover': { borderColor: BRAND.accent },
                                }}
                            >
                                <Box
                                    sx={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 1.5,
                                        bgcolor: BRAND.accentMuted,
                                        display: 'grid',
                                        placeItems: 'center',
                                        flexShrink: 0,
                                    }}
                                >
                                    <UserCircle style={{ width: 18, height: 18, color: BRAND.accent }} />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: '0.875rem' }}>Complete your profile</Typography>
                                    <Typography sx={{ mt: 0.25, fontSize: '0.75rem', color: BRAND.textMuted }}>
                                        Required for deposits and cash outs.
                                    </Typography>
                                </Box>
                                <Typography
                                    sx={{
                                        px: 2,
                                        py: 1,
                                        borderRadius: 999,
                                        bgcolor: BRAND.accent,
                                        color: BRAND.bg,
                                        fontWeight: 700,
                                        fontSize: '0.8125rem',
                                        flexShrink: 0,
                                    }}
                                >
                                    Continue →
                                </Typography>
                            </Paper>
                        )}
                        {children}
                    </Box>
                </Box>

                {/* Mobile bottom nav */}
                <Paper
                    sx={{
                        display: { xs: 'block', lg: 'none' },
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: (t) => t.zIndex.appBar - 1,
                        pb: 'max(10px, env(safe-area-inset-bottom))',
                        borderRadius: 0,
                        borderTop: `1px solid ${BRAND.border}`,
                        bgcolor: 'rgba(5,5,5,0.96)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: `0 -8px 32px rgba(0,0,0,0.4), inset 0 1px 0 ${BRAND.accentSubtle}`,
                    }}
                    elevation={0}
                    component="nav"
                >
                    <BottomNavigation
                        showLabels
                        value={bottomNav}
                        onChange={(_, v) => { if (v === 'more') setMobileMenuOpen(true); }}
                        sx={{
                            bgcolor: 'transparent',
                            height: { xs: 60, sm: 56 },
                            '& .MuiBottomNavigationAction-root': {
                                minWidth: 0,
                                minHeight: 48,
                                py: 0.5,
                                px: 0.5,
                                color: BRAND.textSubtle,
                                '& .MuiBottomNavigationAction-label': {
                                    fontSize: '0.625rem',
                                    fontWeight: 600,
                                    '&.Mui-selected': { fontSize: '0.625rem' },
                                },
                                '&.Mui-selected': { color: BRAND.accent },
                            },
                        }}
                    >
                        {mobileBottomNavItems.map((item) => {
                            const { href, label, icon: Icon, isMenu } = item as {
                                href: string | null;
                                label: string;
                                icon: typeof Wallet;
                                isMenu?: boolean;
                            };
                            if (isMenu) {
                                return (
                                    <BottomNavigationAction
                                        key="more"
                                        label={label}
                                        icon={<MoreHorizontal style={{ width: 22, height: 22 }} />}
                                        value="more"
                                        onClick={() => setMobileMenuOpen(true)}
                                    />
                                );
                            }
                            return (
                                <BottomNavigationAction
                                    key={href}
                                    label={label}
                                    icon={<NavIcon Icon={Icon} active={pathname === href} />}
                                    value={href}
                                    component={Link}
                                    href={href!}
                                />
                            );
                        })}
                    </BottomNavigation>
                </Paper>
            </Box>
        </Box>
        </WalletProvider>
    );
}
