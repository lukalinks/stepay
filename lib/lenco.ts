/**
 * Lenco API Integration
 * Based on https://api.lenco.co/access/v2
 * Auth: Bearer LENCO_SECRET_KEY
 */

import { diagnoseLencoSecretKey, formatPhoneForLenco, mapLencoCollectionError } from '@/lib/lenco-config';

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
  currency?: string;
}

export interface PayoutRequest {
  amount: number;
  phone: string;
  operator: LencoOperator;
  reference: string;
  narration?: string;
}

function ensureZambianPhone(phone: string): string {
  return formatPhoneForLenco(phone);
}

export class LencoService {
  private static getHeaders() {
    const diagnosis = diagnoseLencoSecretKey(LENCO_SECRET_KEY);
    if (diagnosis) {
      throw new Error(diagnosis);
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
      amount: Math.round(parseFloat(String(data.amount)) * 100) / 100,
      currency: (data.currency || 'ZMW').toUpperCase(),
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

      const result = await response.json().catch(() => ({}));
      const rawMsg =
        result?.message ??
        (Array.isArray(result?.errors)
          ? result.errors.map((e: { message?: string }) => e.message).join('; ')
          : null) ??
        'Failed to initiate mobile money collection';
      const errorCode = result?.errorCode != null ? String(result.errorCode) : undefined;
      const errMsg = mapLencoCollectionError(rawMsg, errorCode, data.operator);

      if (!response.ok) {
        console.error('Lenco Collection Error:', result);
        if (response.status === 401 || String(result?.errorCode) === '09') {
          const hint = diagnoseLencoSecretKey(LENCO_SECRET_KEY);
          throw new Error(
            hint ??
              'Lenco rejected the API token (Unauthorized). In Lenco Pay → APIs, copy your Secret Key into LENCO_SECRET_KEY — not the webhook SHA256 hash.'
          );
        }
        throw new Error(errMsg);
      }

      if (result && result.status === false) {
        console.error('Lenco Collection Error:', result);
        if (String(result?.errorCode) === '09' || String(rawMsg).toLowerCase() === 'unauthorized') {
          const hint = diagnoseLencoSecretKey(LENCO_SECRET_KEY);
          throw new Error(
            hint ??
              'Lenco rejected the API token (Unauthorized). In Lenco Pay → APIs, copy your Secret Key into LENCO_SECRET_KEY — not the webhook SHA256 hash.'
          );
        }
        throw new Error(errMsg);
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

  /**
   * Fetch transaction by client reference (v1) - used for some transaction types.
   * Returns { status: 'successful' | 'failed' | ..., type: 'credit' | 'debit' }.
   */
  static async getTransactionByReference(reference: string): Promise<{ status: string; type: string } | null> {
    if (!LENCO_SECRET_KEY) return null;
    try {
      const baseUrl = (LENCO_API_URL || '').replace(/\/access\/v\d+$/, '/access/v1');
      const url = `${baseUrl}/transaction-by-reference/${encodeURIComponent(reference)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: LencoService.getHeaders(),
      });
      const result = await response.json().catch(() => ({}));
      const data = result?.data;
      if (!data) return null;
      return { status: (data.status || '').toLowerCase(), type: (data.type || '').toLowerCase() };
    } catch (error: any) {
      console.error('Lenco getTransactionByReference:', error?.message);
      return null;
    }
  }

  /**
   * Fetch mobile money collection status by reference (v2).
   * Use this for deposits - status is 'pending' | 'successful' | 'failed' | 'pay-offline' etc.
   */
  static async getCollectionByReference(reference: string): Promise<{ status: string } | null> {
    if (!LENCO_SECRET_KEY) return null;
    try {
      const url = `${LENCO_API_URL}/collections/status/${encodeURIComponent(reference)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: LencoService.getHeaders(),
      });
      const result = await response.json().catch(() => ({}));
      const data = result?.data;
      if (!data) return null;
      return { status: (data.status || '').toLowerCase() };
    } catch (error: any) {
      console.error('Lenco getCollectionByReference:', error?.message);
      return null;
    }
  }
}
