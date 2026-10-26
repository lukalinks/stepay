export const MIN_PASSWORD_LENGTH = 12;

export type PasswordStrengthLevel = 'empty' | 'too_short' | 'weak' | 'fair' | 'good' | 'strong';

export type PasswordRequirement = {
  id: string;
  label: string;
  met: boolean;
};

export type PasswordStrength = {
  level: PasswordStrengthLevel;
  /** 0–4 for meter segments */
  score: number;
  label: string;
  /** Hex color for meter / label */
  color: string;
  ok: boolean;
  requirements: PasswordRequirement[];
  hint: string;
};

const COLORS = {
  empty: 'rgba(255,255,255,0.08)',
  too_short: '#f87171',
  weak: '#ef4444',
  fair: '#f59e0b',
  good: '#84cc16',
  strong: '#34d399',
} as const;

export function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  const pwd = password || '';
  return [
    {
      id: 'length',
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: pwd.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: 'case',
      label: 'Upper & lowercase letters',
      met: /[a-z]/.test(pwd) && /[A-Z]/.test(pwd),
    },
    {
      id: 'number',
      label: 'A number',
      met: /\d/.test(pwd),
    },
    {
      id: 'symbol',
      label: 'A symbol (!@#$…)',
      met: /[^A-Za-z0-9]/.test(pwd),
    },
  ];
}

/** Live strength for signup UI. Length is required; variety improves the score. */
export function getPasswordStrength(password: string): PasswordStrength {
  const pwd = password || '';
  const requirements = getPasswordRequirements(pwd);

  if (!pwd) {
    return {
      level: 'empty',
      score: 0,
      label: '',
      color: COLORS.empty,
      ok: false,
      requirements,
      hint: `Use at least ${MIN_PASSWORD_LENGTH} characters to encrypt your wallet.`,
    };
  }

  if (pwd.length < MIN_PASSWORD_LENGTH) {
    const remaining = MIN_PASSWORD_LENGTH - pwd.length;
    return {
      level: 'too_short',
      score: 1,
      label: 'Too short',
      color: COLORS.too_short,
      ok: false,
      requirements,
      hint: `${remaining} more character${remaining === 1 ? '' : 's'} needed (minimum ${MIN_PASSWORD_LENGTH}).`,
    };
  }

  let variety = 0;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) variety++;
  if (/\d/.test(pwd)) variety++;
  if (/[^A-Za-z0-9]/.test(pwd)) variety++;
  if (pwd.length >= MIN_PASSWORD_LENGTH + 4) variety++;

  if (variety <= 1) {
    return {
      level: 'weak',
      score: 2,
      label: 'Weak',
      color: COLORS.weak,
      ok: true,
      requirements,
      hint: 'Accepted, but add letters, numbers, or symbols for a stronger password.',
    };
  }
  if (variety === 2) {
    return {
      level: 'fair',
      score: 3,
      label: 'Fair',
      color: COLORS.fair,
      ok: true,
      requirements,
      hint: 'Decent — a symbol or longer password makes it stronger.',
    };
  }
  if (variety === 3) {
    return {
      level: 'good',
      score: 4,
      label: 'Good',
      color: COLORS.good,
      ok: true,
      requirements,
      hint: 'Solid password for wallet encryption.',
    };
  }
  return {
    level: 'strong',
    score: 4,
    label: 'Strong',
    color: COLORS.strong,
    ok: true,
    requirements,
    hint: 'Strong password — good for protecting your wallet.',
  };
}
