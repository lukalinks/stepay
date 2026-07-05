'use client';

import { alpha } from '@mui/material/styles';
import { Menu, MoreHorizontal, Wallet, ArrowLeftRight, Send } from 'lucide-react';
import AppBar from '@mui/material/AppBar';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { QuickActionsBar } from '@/components/dashboard/QuickActionsBar';
import { WalletOverview } from '@/components/dashboard/WalletOverview';
import { UserAvatar } from '@/components/UserAvatar';
import { BRAND } from '@/lib/brand';
import { dash } from '@/lib/dashboard-ui';
import {
  LANDING_MOCK_BALANCE,
  LANDING_MOCK_CURRENCY,
  LANDING_MOCK_PORTFOLIO,
  LANDING_MOCK_TODAY_CHANGE,
  LANDING_MOCK_USER,
} from '@/lib/landing-mock-data';

const PHONE_W = 272;
const PHONE_H = 460;

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: PHONE_W,
        mx: 'auto',
        p: '7px',
        borderRadius: '36px',
        bgcolor: '#1a1a1a',
        border: `1px solid ${BRAND.borderStrong}`,
        boxShadow: `
          0 32px 64px rgba(0,0,0,0.55),
          inset 0 1px 0 rgba(255,255,255,0.12),
          inset 0 -1px 0 rgba(0,0,0,0.4)
        `,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <Box
        className="dashboard-grain"
        sx={{
          position: 'relative',
          width: '100%',
          height: PHONE_H,
          borderRadius: '28px',
          bgcolor: BRAND.bg,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${BRAND.borderStrong}`,
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1.25,
            pt: 0.5,
            pb: 0.15,
            bgcolor: BRAND.bg,
          }}
        >
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: alpha('#fff', 0.5) }}>9:41</Typography>
          <Box sx={{ width: 64, height: 18, borderRadius: 999, bgcolor: '#000', border: `1px solid ${BRAND.border}` }} />
          <Typography sx={{ fontSize: '0.625rem', fontWeight: 600, color: alpha('#fff', 0.5) }}>●●●</Typography>
        </Box>
        {children}
        <Box sx={{ flexShrink: 0, py: 0.35, display: 'flex', justifyContent: 'center', bgcolor: BRAND.bg }}>
          <Box sx={{ width: 72, height: 3, borderRadius: 999, bgcolor: alpha('#fff', 0.2) }} />
        </Box>
      </Box>
    </Box>
  );
}

function HomeAppBar() {
  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ flexShrink: 0, bgcolor: BRAND.bg, borderBottom: `1px solid ${BRAND.border}`, color: '#fff' }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: 36, px: 1, py: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.8125rem', lineHeight: 1.2 }} noWrap>
          Overview
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton aria-hidden tabIndex={-1} sx={{ p: 0.35 }}>
            <UserAvatar fullName={LANDING_MOCK_USER.fullName} email={LANDING_MOCK_USER.email} size={24} />
          </IconButton>
          <IconButton aria-hidden tabIndex={-1} sx={{ color: BRAND.textMuted, p: 0.5 }}>
            <Menu style={{ width: 17, height: 17 }} />
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function HomeBottomNav() {
  const icon = (Icon: typeof Wallet) => <Icon style={{ width: 17, height: 17 }} />;
  return (
    <Paper
      elevation={0}
      component="nav"
      sx={{
        flexShrink: 0,
        borderTop: `1px solid ${BRAND.border}`,
        bgcolor: 'rgba(5,5,5,0.98)',
        borderRadius: 0,
      }}
    >
      <BottomNavigation
        showLabels
        value="/dashboard"
        sx={{
          bgcolor: 'transparent',
          height: 40,
          '& .MuiBottomNavigationAction-root': {
            minWidth: 0,
            minHeight: 36,
            py: 0,
            color: BRAND.textSubtle,
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.5rem',
              fontWeight: 600,
              '&.Mui-selected': { fontSize: '0.5rem' },
            },
            '&.Mui-selected': { color: BRAND.accent },
          },
        }}
      >
        <BottomNavigationAction label="Wallet" value="/dashboard" icon={icon(Wallet)} />
        <BottomNavigationAction label="Deposit" value="/dashboard/buy" icon={icon(ArrowLeftRight)} />
        <BottomNavigationAction label="Send" value="/dashboard/send" icon={icon(Send)} />
        <BottomNavigationAction label="More" value="more" icon={icon(MoreHorizontal)} />
      </BottomNavigation>
    </Paper>
  );
}

/** Landing hero — dashboard home (/dashboard) in a compact phone frame. */
export function LandingDashboardPreview() {
  return (
    <PhoneFrame>
      <HomeAppBar />

      <Box component="main" sx={{ flex: 1, minHeight: 0, overflow: 'hidden', bgcolor: BRAND.bg }}>
        <Box sx={{ px: 0.75, py: 0.5, height: '100%', overflow: 'hidden' }}>
          <div className={`${dash.panel} overflow-hidden`}>
            <WalletOverview
              compact
              portfolioLocal={LANDING_MOCK_PORTFOLIO}
              localCurrency={LANDING_MOCK_CURRENCY}
              walletAddr={LANDING_MOCK_USER.walletPublic}
              balance={LANDING_MOCK_BALANCE}
              todayChange={LANDING_MOCK_TODAY_CHANGE}
            />
            <QuickActionsBar
              compact
              variant="responsive"
              className="border-t border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent px-2.5 pb-2.5 pt-1.5"
            />
          </div>
        </Box>
      </Box>

      <HomeBottomNav />
    </PhoneFrame>
  );
}
