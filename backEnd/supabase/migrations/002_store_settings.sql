-- ============================================
-- Migration 002: Store Settings & QRIS Support
-- ============================================

-- ============================================
-- 1. STORE SETTINGS TABLE
-- Single-row table for store configuration
-- ============================================
CREATE TABLE public.store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name TEXT NOT NULL DEFAULT 'My Store',
    address TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    footer_message TEXT DEFAULT 'Thank you for your purchase!',
    logo_url TEXT,
    currency TEXT NOT NULL DEFAULT 'IDR',
    tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can read; only admins can update/insert
CREATE POLICY "Store settings are viewable by authenticated users"
    ON public.store_settings FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can insert store settings"
    ON public.store_settings FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update store settings"
    ON public.store_settings FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Apply updated_at trigger
CREATE TRIGGER set_store_settings_updated_at
    BEFORE UPDATE ON public.store_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Seed default store settings (single row)
INSERT INTO public.store_settings (store_name, address, phone, footer_message, currency, tax_rate)
VALUES ('KasirPOS Store', '123 Main Street, Jakarta', '+62 812-3456-7890', 'Thank you for shopping with us!', 'IDR', 0.00);

-- ============================================
-- 2. UPDATE TRANSACTIONS PAYMENT METHOD
-- Add 'qris' to the allowed payment methods
-- ============================================

-- Drop the existing check constraint
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;

-- Add new check constraint with 'qris' included
ALTER TABLE public.transactions ADD CONSTRAINT transactions_payment_method_check
    CHECK (payment_method IN ('cash', 'card', 'e-wallet', 'qris'));
