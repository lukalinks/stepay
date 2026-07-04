/** Types matching PostgreSQL schema (users, transactions). */

export interface DbUser {
    id: string;
    email?: string | null;
    auth_id?: string | null;
    phone_number?: string | null;
    phone_normalized?: string | null;
    country_code?: string | null;
    preferred_operator?: string | null;
    full_name?: string | null;
    address?: string | null;
    id_document_type?: string | null;
    id_document_number?: string | null;
    pin_hash: string;
    password_hash?: string | null;
    wallet_secret?: string | null;
    wallet_secret_enc?: string | null;
    wallet_key_version?: number | null;
    wallet_public: string;
    role?: string | null;
    push_token?: string | null;
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
    deposit_memo?: string | null;
    asset?: string | null;
    created_at: string;
    updated_at: string;
}
