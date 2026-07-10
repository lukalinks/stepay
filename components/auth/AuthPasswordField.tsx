'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Eye, EyeOff } from 'lucide-react';
import { authTextFieldSx, BRAND } from '@/lib/brand';

import { MIN_PASSWORD_LENGTH } from '@/lib/password-policy';

type AuthPasswordFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  showStrength?: boolean;
  showMatch?: boolean;
  matchValue?: string;
  helperText?: string;
  headerRight?: React.ReactNode;
  minLength?: number;
};

function getStrength(pwd: string): { score: number; label: string } {
  if (!pwd) return { score: 0, label: '' };
  let score = 0;
  if (pwd.length >= MIN_PASSWORD_LENGTH) score++;
  if (pwd.length >= MIN_PASSWORD_LENGTH + 4) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const capped = Math.min(4, score);
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score: capped, label: labels[capped] };
}

const strengthColors = ['transparent', '#ef4444', '#f59e0b', '#84cc16', BRAND.accent];

export function AuthPasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  showStrength = false,
  showMatch = false,
  matchValue = '',
  helperText,
  headerRight,
  minLength = MIN_PASSWORD_LENGTH,
}: AuthPasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const strength = getStrength(value);
  const matches = showMatch && value.length > 0 && value === matchValue;
  const mismatch = showMatch && matchValue.length > 0 && value !== matchValue;

  return (
    <>
      {headerRight ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
          <Box
            component="label"
            htmlFor={id}
            sx={{ fontSize: '0.875rem', fontWeight: 500, color: BRAND.textMuted }}
          >
            {label}
          </Box>
          {headerRight}
        </Box>
      ) : null}
      <TextField
        id={id}
        label={headerRight ? undefined : label}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        required
        fullWidth
        sx={authTextFieldSx}
        slotProps={{
          htmlInput: { minLength, autoComplete, 'aria-label': headerRight ? label : undefined },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={visible ? 'Hide password' : 'Show password'}
                  onClick={() => setVisible((v) => !v)}
                  edge="end"
                  sx={{ color: BRAND.textMuted, '&:hover': { color: '#fff' } }}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      {helperText && (
        <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: BRAND.textSubtle }}>
          {helperText}
        </Typography>
      )}
      {showStrength && value.length > 0 && (
        <Box sx={{ mt: 1.25 }}>
          <Box sx={{ display: 'flex', gap: 0.75 }}>
            {[1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  height: 4,
                  borderRadius: 999,
                  bgcolor: i <= strength.score ? strengthColors[strength.score] : 'rgba(255,255,255,0.08)',
                  transition: 'background-color 0.2s',
                }}
              />
            ))}
          </Box>
          {strength.label && (
            <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: strengthColors[strength.score] }}>
              {strength.label} password
            </Typography>
          )}
        </Box>
      )}
      {showMatch && matchValue.length > 0 && (
        <Typography
          variant="caption"
          sx={{ mt: 0.75, display: 'block', color: matches ? '#84cc16' : mismatch ? '#f87171' : BRAND.textSubtle }}
        >
          {matches ? 'Passwords match' : mismatch ? 'Passwords do not match' : 'Confirm your password'}
        </Typography>
      )}
    </>
  );
}