'use client';

import { alpha, keyframes } from '@mui/material/styles';
import Box from '@mui/material/Box';
import { BRAND } from '@/lib/brand';

const ACCENT = BRAND.accent;

/** Stylized Africa + horn + Madagascar (viewBox 0 0 500 520) */
const AFRICA_PATH =
  'M 248 42 C 285 44 318 58 342 82 L 362 108 C 378 132 386 162 390 192 L 394 228 C 396 262 388 296 372 326 L 352 358 C 332 386 302 406 272 416 L 242 422 C 212 424 188 414 168 394 L 148 368 C 132 342 122 312 118 280 L 114 244 C 112 210 118 176 132 146 L 148 118 C 164 92 188 72 214 58 L 232 48 C 240 44 244 42 248 42 Z';

const HORN_PATH =
  'M 390 192 L 412 172 C 428 160 442 168 444 186 L 438 210 C 432 226 414 232 400 222 L 388 206 Z';

const MADAGASCAR_PATH =
  'M 408 328 L 422 322 C 432 328 436 342 430 358 L 418 372 C 406 378 396 370 398 354 L 404 338 Z';

const ROUTES: { from: [number, number]; to: [number, number]; delay: number }[] = [
  { from: [168, 278], to: [252, 318], delay: 0 },
  { from: [252, 318], to: [322, 348], delay: 0.7 },
  { from: [322, 348], to: [272, 398], delay: 1.4 },
  { from: [252, 128], to: [322, 348], delay: 2.1 },
  { from: [168, 278], to: [252, 128], delay: 2.8 },
];

const HUBS = [
  { x: 168, y: 278 },
  { x: 252, y: 318 },
  { x: 322, y: 348 },
  { x: 272, y: 398 },
  { x: 252, y: 128 },
];

const dashFlow = keyframes`
  from { stroke-dashoffset: 28; opacity: 0.4; }
  to { stroke-dashoffset: 0; opacity: 1; }
`;

const mapGlow = keyframes`
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.85; }
`;

function routePath(from: [number, number], to: [number, number]) {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const cx = (x1 + x2) / 2;
  const cy = Math.min(y1, y2) - 32;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

export function LandingAfricaMap() {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        inset: { xs: '-2% -15%', md: '-5% -18%' },
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 500 520"
        sx={{
          width: '100%',
          height: '100%',
          display: 'block',
          animation: `${mapGlow} 7s ease-in-out infinite`,
        }}
      >
        <defs>
          <linearGradient id="africaFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.14" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0.02" />
          </linearGradient>
          <filter id="hubGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <Box component="path" d={AFRICA_PATH} fill="url(#africaFill)" stroke={alpha(ACCENT, 0.4)} strokeWidth="1.5" />
        <Box component="path" d={HORN_PATH} fill="url(#africaFill)" stroke={alpha(ACCENT, 0.32)} strokeWidth="1.2" />
        <Box component="path" d={MADAGASCAR_PATH} fill="url(#africaFill)" stroke={alpha(ACCENT, 0.28)} strokeWidth="1" />

        {ROUTES.map((route, i) => (
          <Box
            key={i}
            component="path"
            d={routePath(route.from, route.to)}
            fill="none"
            stroke={ACCENT}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="5 5"
            sx={{
              animation: `${dashFlow} 2.2s ease-in-out infinite alternate`,
              animationDelay: `${route.delay}s`,
            }}
          />
        ))}

        {HUBS.map((hub, i) => (
          <g key={i} filter="url(#hubGlow)">
            <circle cx={hub.x} cy={hub.y} r="3.5" fill={ACCENT} />
            <circle cx={hub.x} cy={hub.y} r="3.5" fill={ACCENT} fillOpacity="0.5">
              <animate attributeName="r" values="3.5;12;3.5" dur="2.8s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
              <animate attributeName="fill-opacity" values="0.5;0;0.5" dur="2.8s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
            </circle>
          </g>
        ))}
      </Box>
    </Box>
  );
}
