-- Profile completion: full name, address, ID document
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id_document_type TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id_document_number TEXT;
