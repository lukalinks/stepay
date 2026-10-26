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
import { LandingPhoneFrame } from '@/components/landing/LandingPhoneFrame';
import { BRAND } from '@/lib/brand';
import { dash } from '@/lib/dashboard-ui';
import {
  LANDING_MOCK_BALANCE,
  LANDING_MOCK_CURRENCY,
  LANDING_MOCK_PORTFOLIO,
  LANDING_MOCK_TODAY_CHANGE,
  LANDING_MOCK_USER,
} from '@/lib/landing-mock-data';

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
    <LandingPhoneFrame>
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
    </LandingPhoneFrame>
  );
}
