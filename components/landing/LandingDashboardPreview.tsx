'use client';

import { alpha } from '@mui/material/styles';
import {
  ArrowLeftRight,
  BarChart3,
  ChevronDown,
  History,
  Home,
  LayoutGrid,
  Send,
  Wallet,
} from 'lucide-react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AssetIcon } from '@/components/AssetIcon';
import { BRAND } from '@/lib/brand';

const ACCENT = BRAND.accent;
const SURFACE = '#121212';
const BORDER = alpha('#fff', 0.08);

const navItems = [
  { label: 'Dashboard', icon: LayoutGrid, active: false },
  { label: 'Wallet', icon: Wallet, active: true },
  { label: 'Transactions', icon: History, active: false },
  { label: 'Deposit', icon: ArrowLeftRight, active: false },
  { label: 'Send', icon: Send, active: false },
  { label: 'Rates', icon: BarChart3, active: false },
];

function MiniChart() {
  return (
    <Box sx={{ position: 'relative', height: 72, mt: 2 }}>
      <svg viewBox="0 0 280 72" width="100%" height="72" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.35" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M0 58 L40 52 L80 48 L120 44 L160 38 L200 32 L240 22 L280 14 L280 72 L0 72 Z"
          fill="url(#chartFill)"
        />
        <path
          d="M0 58 L40 52 L80 48 L120 44 L160 38 L200 32 L240 22 L280 14"
          fill="none"
          stroke={ACCENT}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="280" cy="14" r="6" fill={ACCENT} />
        <circle cx="280" cy="14" r="12" fill={ACCENT} fillOpacity="0.25" />
      </svg>
    </Box>
  );
}

export function LandingDashboardPreview() {
  return (
    <Box
      sx={{
        borderRadius: { xs: '20px', md: '28px' },
        border: `1px solid ${BORDER}`,
        bgcolor: alpha('#0a0a0a', 0.85),
        backdropFilter: 'blur(24px)',
        overflow: 'hidden',
        boxShadow: `0 40px 120px ${alpha('#000', 0.65)}, 0 0 0 1px ${alpha('#fff', 0.04)} inset`,
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '200px 1fr 280px' },
          minHeight: { xs: 420, md: 480 },
        }}
      >
        {/* Sidebar */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            flexDirection: 'column',
            borderRight: `1px solid ${BORDER}`,
            p: 2,
            gap: 0.5,
          }}
        >
          <Typography sx={{ px: 1.5, py: 1, fontWeight: 800, fontSize: '0.95rem', color: '#fff', mb: 1 }}>
            Stepay
          </Typography>
          {navItems.map(({ label, icon: Icon, active }) => (
            <Stack
              key={label}
              sx={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 1.25,
                px: 1.5,
                py: 1.1,
                borderRadius: 2.5,
                bgcolor: active ? ACCENT : 'transparent',
                color: active ? BRAND.accentContrast : alpha('#fff', 0.55),
                fontWeight: active ? 700 : 500,
                fontSize: '0.8125rem',
              }}
            >
              <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
              <span>{label}</span>
            </Stack>
          ))}
        </Box>

        {/* Wallet main */}
        <Box sx={{ p: { xs: 2, md: 3 }, borderRight: { lg: `1px solid ${BORDER}` } }}>
          <Stack sx={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1.125rem', color: '#fff' }}>Wallet</Typography>
            <Chip
              icon={<ChevronDown size={14} />}
              label="GABC…TYOU45"
              size="small"
              sx={{
                bgcolor: alpha('#fff', 0.06),
                color: alpha('#fff', 0.7),
                border: `1px solid ${BORDER}`,
                fontFamily: 'monospace',
                fontSize: '0.7rem',
                '& .MuiChip-icon': { color: 'inherit', ml: 0.5 },
              }}
            />
          </Stack>

          <Box
            sx={{
              borderRadius: 3,
              border: `1px solid ${BORDER}`,
              bgcolor: SURFACE,
              p: 2.5,
            }}
          >
            <Typography sx={{ fontSize: '0.75rem', color: alpha('#fff', 0.45), fontWeight: 500 }}>
              Current balance (local equiv.)
            </Typography>
            <Typography sx={{ mt: 0.75, fontSize: { xs: '1.75rem', md: '2.125rem' }, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>
              12,450.00
            </Typography>
            <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1, mt: 1 }}>
              <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600, color: ACCENT }}>+ 2.4% (1d)</Typography>
              <Typography sx={{ fontSize: '0.8125rem', color: alpha('#fff', 0.45) }}>+ 290 today</Typography>
            </Stack>
            <MiniChart />
          </Box>

          <Typography sx={{ mt: 3, mb: 1.5, fontSize: '0.8125rem', fontWeight: 600, color: alpha('#fff', 0.5) }}>
            Top assets
          </Typography>
          <Stack spacing={1}>
            {[
              { id: 'xlm' as const, val: '1,240.50', zmw: '4,340 local' },
              { id: 'usdc' as const, val: '320.00', zmw: '8,000 local' },
            ].map((a) => (
              <Stack
                key={a.id}
                sx={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.25,
                  borderRadius: 2,
                  bgcolor: alpha('#fff', 0.03),
                  border: `1px solid ${BORDER}`,
                }}
              >
                <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 1.25 }}>
                  <AssetIcon asset={a.id} size="sm" />
                  <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>
                    {a.id === 'usdc' ? 'USDC' : 'XLM'}
                  </Typography>
                </Stack>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>{a.val}</Typography>
                  <Typography sx={{ fontSize: '0.7rem', color: alpha('#fff', 0.4) }}>{a.zmw}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Swap / deposit panel */}
        <Box sx={{ p: { xs: 2, md: 3 }, bgcolor: alpha('#fff', 0.02) }}>
          <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography sx={{ fontWeight: 700, color: '#fff' }}>Deposit</Typography>
            <Typography sx={{ fontSize: '0.75rem', color: alpha('#fff', 0.4) }}>Mobile Money → Crypto</Typography>
          </Stack>

          {['FROM', 'TO'].map((label, i) => (
            <Box
              key={label}
              sx={{
                mb: 1.5,
                p: 2,
                borderRadius: 2.5,
                border: `1px solid ${BORDER}`,
                bgcolor: SURFACE,
              }}
            >
              <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', color: alpha('#fff', 0.35), mb: 1.5 }}>
                {label}
              </Typography>
              <Stack sx={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Stack sx={{ flexDirection: 'row', alignItems: 'center', gap: 0.75 }}>
                    <Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem' }}>
                      {i === 0 ? 'Local' : 'XLM'}
                    </Typography>
                    <ChevronDown size={14} color={alpha('#fff', 0.4)} />
                  </Stack>
                  <Typography sx={{ fontSize: '0.7rem', color: alpha('#fff', 0.4), mt: 0.5 }}>
                    {i === 0 ? 'Available: 2,400' : 'Rate: 1 XLM ≈ 3.50 local'}
                  </Typography>
                </Box>
                <Typography sx={{ fontWeight: 700, fontSize: '1.25rem', color: '#fff' }}>
                  {i === 0 ? '500.00' : '142.86'}
                </Typography>
              </Stack>
            </Box>
          ))}

          <Box
            sx={{
              mt: 2,
              py: 1.5,
              borderRadius: 999,
              bgcolor: ACCENT,
              color: BRAND.accentContrast,
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '0.9375rem',
            }}
          >
            Confirm deposit
          </Box>
        </Box>
      </Box>

      {/* Mobile nav strip */}
      <Stack
        sx={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          display: { xs: 'flex', lg: 'none' },
          borderTop: `1px solid ${BORDER}`,
          py: 1.25,
          bgcolor: alpha('#000', 0.4),
        }}
      >
        {[Home, Wallet, ArrowLeftRight, Send].map((Icon, i) => (
          <Box key={i} sx={{ color: i === 1 ? ACCENT : alpha('#fff', 0.45), p: 1 }}>
            <Icon size={20} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
