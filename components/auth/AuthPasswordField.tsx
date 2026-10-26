'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { Check, Circle, Eye, EyeOff } from 'lucide-react';
import { authTextFieldSx, BRAND } from '@/lib/brand';
import { getPasswordStrength, MIN_PASSWORD_LENGTH } from '@/lib/password-policy';

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
  const [touched, setTouched] = useState(false);
  const strength = getPasswordStrength(value);
  const matches = showMatch && value.length > 0 && value === matchValue;
  const mismatch = showMatch && matchValue.length > 0 && value.length > 0 && value !== matchValue;
  const tooShort = showStrength && value.length > 0 && !strength.ok;
  const showErrorState = (touched && tooShort) || mismatch;

  return (
    <Box>
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
        onBlur={() => setTouched(true)}
        placeholder="••••••••"
        required
        fullWidth
        error={showErrorState}
        sx={authTextFieldSx}
        slotProps={{
          htmlInput: {
            minLength,
            autoComplete,
            'aria-label': headerRight ? label : undefined,
            'aria-describedby': showStrength ? `${id}-strength` : undefined,
            'aria-invalid': showErrorState || undefined,
          },
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

      {helperText && !showStrength && (
        <Typography variant="caption" sx={{ mt: 0.75, display: 'block', color: BRAND.textSubtle }}>
          {helperText}
        </Typography>
      )}

      {showStrength && (
        <Box id={`${id}-strength`} sx={{ mt: 1.25 }} aria-live="polite">
          {value.length > 0 ? (
            <>
              <Box sx={{ display: 'flex', gap: 0.75, mb: 0.75 }}>
                {[1, 2, 3, 4].map((i) => (
                  <Box
                    key={i}
                    sx={{
                      flex: 1,
                      height: 5,
                      borderRadius: 999,
                      bgcolor: i <= strength.score ? strength.color : 'rgba(255,255,255,0.1)',
                      boxShadow:
                        i <= strength.score && strength.level === 'too_short'
                          ? `0 0 8px ${strength.color}55`
                          : 'none',
                      transition: 'background-color 0.2s, box-shadow 0.2s',
                    }}
                  />
                ))}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  color: strength.color,
                }}
              >
                {strength.label}
                {strength.level === 'too_short' ? ' — not strong enough yet' : ' password'}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  mt: 0.35,
                  display: 'block',
                  color: strength.ok ? BRAND.textSubtle : '#fecaca',
                  lineHeight: 1.45,
                }}
              >
                {strength.hint}
              </Typography>
            </>
          ) : (
            <Typography variant="caption" sx={{ display: 'block', color: BRAND.textSubtle, lineHeight: 1.45 }}>
              {helperText || strength.hint}
            </Typography>
          )}

          <Box
            component="ul"
            sx={{
              listStyle: 'none',
              m: 0,
              mt: 1.25,
              p: 1.25,
              borderRadius: 2,
              border: '1px solid',
              borderColor: tooShort ? 'rgba(248,113,113,0.35)' : 'rgba(255,255,255,0.08)',
              bgcolor: tooShort ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.03)',
              display: 'grid',
              gap: 0.75,
              transition: 'border-color 0.2s, background-color 0.2s',
            }}
          >
            {strength.requirements.map((req) => (
              <Box
                component="li"
                key={req.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  fontSize: '0.75rem',
                  fontWeight: req.met ? 600 : 500,
                  color: req.met ? '#86efac' : value.length > 0 && req.id === 'length' ? '#fecaca' : BRAND.textMuted,
                }}
              >
                {req.met ? (
                  <Check size={14} strokeWidth={2.5} aria-hidden />
                ) : (
                  <Circle size={12} strokeWidth={2} aria-hidden style={{ opacity: 0.55 }} />
                )}
                <span>
                  {req.label}
                  {req.id === 'length' && value.length > 0 && !req.met
                    ? ` (${value.length}/${MIN_PASSWORD_LENGTH})`
                    : ''}
                </span>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {showMatch && matchValue.length > 0 && (
        <Typography
          variant="caption"
          sx={{
            mt: 0.75,
            display: 'block',
            fontWeight: matches || mismatch ? 600 : 400,
            color: matches ? '#86efac' : mismatch ? '#f87171' : BRAND.textSubtle,
          }}
        >
          {matches ? 'Passwords match' : mismatch ? 'Passwords do not match' : 'Confirm your password'}
        </Typography>
      )}
    </Box>
  );
}
