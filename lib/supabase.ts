import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key-for-build';

// Server-side client with service role (bypasses RLS)
// Uses placeholder values during build when env vars may be missing
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

// Types matching our schema
export interface DbUser {
  id: string;
  email?: string | null;
  auth_id?: string | null;
  phone_number?: string | null;
  full_name?: string | null;
  address?: string | null;
  id_document_type?: string | null;
  id_document_number?: string | null;
  pin_hash: string;
  wallet_secret: string;
  wallet_public: string;
  created_at: string;
  updated_at: string;
}

export interface DbTransaction {
  id: string;
  user_id: string;
  type: string;
  amount_fiat: number;
  amount_xlm: number;
  status: string;
  reference: string;
  tx_hash: string | null;
  created_at: string;
  updated_at: string;
}
