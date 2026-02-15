-- Disable RLS on transactions table - managed exclusively by backend (service role)
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
