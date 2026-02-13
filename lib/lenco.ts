/**
 * Lenco API Integration
 * Based on https://api.lenco.co/access/v2
 * Auth: Bearer LENCO_SECRET_KEY
 */

const LENCO_API_URL = (process.env.LENCO_API_URL || 'https://api.lenco.co/access/v2').trim();
const LENCO_SECRET_KEY = process.env.LENCO_SECRET_KEY?.trim();
const LENCO_ACCOUNT_ID = process.env.LENCO_ACCOUNT_ID?.trim();

export type LencoOperator = 'mtn' | 'airtel' | 'zamtel';

export interface LencoResponse<T> {
  status: boolean;
  message: string;
  data: T;
}

export interface CollectionRequest {
  amount: number;
  phone: string; // +260971234567
  operator: LencoOperator;
  reference: string;
  country?: string;
}

export interface PayoutRequest {
  amount: number;
  phone: string;
  operator: LencoOperator;
  reference: string;
  narration?: string;
}

function ensureZambianPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, '').replace(/^0/, '');
  if (cleaned.startsWith('+260')) return cleaned;
  if (cleaned.startsWith('260')) return `+${cleaned}`;
  return `+260${cleaned}`;
}

export class LencoService {
  private static getHeaders() {
    if (!LENCO_SECRET_KEY) {
      throw new Error('LENCO_SECRET_KEY not configured');
    }
    return {
      Authorization: `Bearer ${LENCO_SECRET_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Initiate mobile money collection (user pays ZMW to buy crypto)
   */
  static async createCollection(data: CollectionRequest) {
    const phone = ensureZambianPhone(data.phone);
    const payload = {
      amount: parseFloat(String(data.amount)),
      reference: data.reference,
      phone,
      operator: data.operator.toLowerCase(),
      country: (data.country || 'zm').toLowerCase(),
      bearer: 'customer',
    };

    try {
      const response = await fetch(`${LENCO_API_URL}/collections/mobile-money`, {
        method: 'POST',
        headers: LencoService.getHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Lenco Collection Error:', result);
        throw new Error(result.message || 'Failed to initiate mobile money collection');
      }

      if (!result.status) {
        throw new Error(result.message || 'Collection request failed');
      }

      return result as LencoResponse<{ reference?: string; status?: string }>;
    } catch (error: any) {
      console.error('Lenco Collection Error:', error.message);
      throw error;
    }
  }

  /**
   * Send mobile money payout (user sells crypto, receives ZMW)
   */
  static async createPayout(data: PayoutRequest) {
    if (!LENCO_ACCOUNT_ID) {
      throw new Error('LENCO_ACCOUNT_ID not configured');
    }

    const phone = ensureZambianPhone(data.phone);
    const payload = {
      accountId: LENCO_ACCOUNT_ID,
      amount: parseFloat(String(data.amount)),
      reference: data.reference,
      narration: data.narration || `Sell XLM Payout - ${data.reference}`,
      phone,
      operator: data.operator.toLowerCase(),
      country: 'zm',
    };

    try {
      const response = await fetch(`${LENCO_API_URL}/transfers/mobile-money`, {
        method: 'POST',
        headers: LencoService.getHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      const errMsg = result?.message ?? result?.data?.message ?? (Array.isArray(result?.errors) ? result.errors.map((e: { message?: string }) => e.message).join('; ') : null) ?? 'Failed to initiate payout';

      if (!response.ok) {
        console.error('Lenco Payout Error:', result);
        throw new Error(errMsg);
      }

      if (result && result.status === false) {
        throw new Error(errMsg);
      }

      return result as LencoResponse<{ reference?: string; id?: string }>;
    } catch (error: any) {
      console.error('Lenco Payout Error:', error.message);
      throw error;
    }
  }
}
