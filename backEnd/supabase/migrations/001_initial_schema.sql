-- ============================================
-- Cashier/POS Application - Database Schema
-- Supabase PostgreSQL Migration
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- Linked to Supabase Auth (auth.users)
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'cashier' CHECK (role IN ('admin', 'cashier')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies: Users can read all profiles, but only update their own
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Trigger: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'cashier')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. CATEGORIES TABLE
-- ============================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can read; only admins can insert/update/delete
CREATE POLICY "Categories are viewable by authenticated users"
    ON public.categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can insert categories"
    ON public.categories FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update categories"
    ON public.categories FOR UPDATE
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

CREATE POLICY "Admins can delete categories"
    ON public.categories FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- 3. PRODUCTS TABLE
-- ============================================
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can read; only admins can insert/update/delete
CREATE POLICY "Products are viewable by authenticated users"
    ON public.products FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can insert products"
    ON public.products FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update products"
    ON public.products FOR UPDATE
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

CREATE POLICY "Admins can delete products"
    ON public.products FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Index for faster product searches
CREATE INDEX idx_products_name ON public.products USING gin(to_tsvector('english', name));
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_category ON public.products(category_id);

-- ============================================
-- 4. TRANSACTIONS TABLE
-- ============================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number TEXT NOT NULL UNIQUE,
    cashier_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'e-wallet')),
    amount_paid DECIMAL(12, 2) NOT NULL DEFAULT 0,
    change_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can read all; cashiers can insert
CREATE POLICY "Transactions are viewable by authenticated users"
    ON public.transactions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert transactions"
    ON public.transactions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = cashier_id);

-- Index for faster lookups
CREATE INDEX idx_transactions_number ON public.transactions(transaction_number);
CREATE INDEX idx_transactions_cashier ON public.transactions(cashier_id);
CREATE INDEX idx_transactions_created ON public.transactions(created_at DESC);

-- ============================================
-- 5. TRANSACTION ITEMS TABLE
-- ============================================
CREATE TABLE public.transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    product_price DECIMAL(12, 2) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Transaction items are viewable by authenticated users"
    ON public.transaction_items FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert transaction items"
    ON public.transaction_items FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Index
CREATE INDEX idx_transaction_items_transaction ON public.transaction_items(transaction_id);

-- ============================================
-- 6. STOCK HISTORY TABLE
-- Tracks every stock movement
-- ============================================
CREATE TABLE public.stock_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    change_type TEXT NOT NULL CHECK (change_type IN ('sale', 'restock', 'adjustment', 'initial')),
    quantity_change INTEGER NOT NULL, -- positive for restock, negative for sale
    stock_before INTEGER NOT NULL,
    stock_after INTEGER NOT NULL,
    reference_id UUID, -- transaction_id for sales, NULL for manual adjustments
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Stock history is viewable by authenticated users"
    ON public.stock_history FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can insert stock history"
    ON public.stock_history FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Index
CREATE INDEX idx_stock_history_product ON public.stock_history(product_id);
CREATE INDEX idx_stock_history_created ON public.stock_history(created_at DESC);
CREATE INDEX idx_stock_history_type ON public.stock_history(change_type);

-- ============================================
-- 7. HELPER FUNCTIONS & TRIGGERS
-- ============================================

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to profiles
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Apply updated_at trigger to products
CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function: Deduct stock after transaction item is inserted
-- Also logs to stock_history
CREATE OR REPLACE FUNCTION public.handle_stock_deduction()
RETURNS TRIGGER AS $$
DECLARE
    current_stock INTEGER;
BEGIN
    -- Get current stock
    SELECT stock INTO current_stock
    FROM public.products
    WHERE id = NEW.product_id;

    -- Deduct stock
    UPDATE public.products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;

    -- Log to stock_history
    INSERT INTO public.stock_history (
        product_id,
        change_type,
        quantity_change,
        stock_before,
        stock_after,
        reference_id,
        notes
    ) VALUES (
        NEW.product_id,
        'sale',
        -NEW.quantity,
        current_stock,
        current_stock - NEW.quantity,
        NEW.transaction_id,
        'Auto-deducted from sale'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_transaction_item_created
    AFTER INSERT ON public.transaction_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_stock_deduction();

-- ============================================
-- 8. SEED DATA (Optional - Default Categories)
-- ============================================
INSERT INTO public.categories (name, description) VALUES
    ('Food', 'Food items and snacks'),
    ('Beverages', 'Drinks and beverages'),
    ('Household', 'Household and cleaning items'),
    ('Personal Care', 'Personal care and hygiene products'),
    ('Others', 'Miscellaneous items')
ON CONFLICT (name) DO NOTHING;
