CREATE TABLE IF NOT EXISTS public.participaciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cedula TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    correo TEXT NOT NULL,
    premio_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitamos Row Level Security (RLS) para proteger la tabla.
-- Al no crear políticas públicas, solo el Service Role (desde nuestra Edge Function) podrá leer/escribir.
ALTER TABLE public.participaciones ENABLE ROW LEVEL SECURITY;
