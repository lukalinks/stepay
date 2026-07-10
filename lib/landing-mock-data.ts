import type { TxRow } from '@/components/dashboard/TransactionRow';

export const LANDING_MOCK_USER = {
  fullName: 'Amara Okonkwo',
  email: 'amara@email.com',
  walletPublic: 'GDT5X7X8K9L2M3N4P5Q6R7S8T9U0V1W2X3Y4Z5A6B7C8D9E0F1G2',
};

export const LANDING_MOCK_BALANCE = {
  xlm: 842.15,
  usdc: 1920,
  xlmLocalEquiv: 2947,
  usdcLocalEquiv: 48000,
  usdPrimary: '1920.00',
  fiatTotal: '50947.00',
};

export const LANDING_MOCK_PORTFOLIO = '50947.00';
export const LANDING_MOCK_CURRENCY = 'ZMW';
export const LANDING_MOCK_TODAY_CHANGE = { percent: 2.4, amount: 1200 };

export const LANDING_MOCK_TRANSACTIONS: TxRow[] = [
  {
    id: 'mock-1',
    type: 'SEND',
    asset: 'usdc',
    amountXLM: 120,
    amountFiat: 15600,
    status: 'COMPLETED',
    reference: 'send_ke_240608_a1',
    txHash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    createdAt: '2026-06-08T09:14:00.000Z',
  },
  {
    id: 'mock-2',
    type: 'RECEIVE',
    asset: 'usdc',
    amountXLM: 450,
    amountFiat: 58500,
    status: 'COMPLETED',
    reference: 'recv_ng_240607_b2',
    txHash: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678',
    createdAt: '2026-06-07T16:42:00.000Z',
  },
  {
    id: 'mock-3',
    type: 'BUY',
    asset: 'usdc',
    amountXLM: 200,
    amountFiat: 26000,
    status: 'COMPLETED',
    reference: 'dep_240606_c3',
    txHash: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
    createdAt: '2026-06-06T11:20:00.000Z',
  },
];
