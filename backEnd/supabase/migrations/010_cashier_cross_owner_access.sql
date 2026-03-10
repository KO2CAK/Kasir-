-- Migration 010: Allow Cashiers to Access Admin/Owner Data
-- Purpose: Enable cashiers to view products, categories owned by their admin
-- This is needed because cashiers have their admin's ID in profiles.owner_id

-- =====================
-- PRODUCTS TABLE
-- =====================
-- Drop existing RLS policies for products
DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

-- Create new RLS policies that allow cashiers to view owner's products
CREATE POLICY "Users can view own products" ON products
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() 
        OR 
        user_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert own products" ON products
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own products" ON products
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own products" ON products
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- =====================
-- CATEGORIES TABLE
-- =====================
-- Drop existing RLS policies for categories
DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

-- Create new RLS policies that allow cashiers to view owner's categories
CREATE POLICY "Users can view own categories" ON categories
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() 
        OR 
        user_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert own categories" ON categories
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own categories" ON categories
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own categories" ON categories
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- =====================
-- TRANSACTIONS TABLE
-- =====================
-- Allow cashiers to view transactions created by their owner as well
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;

CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() 
        OR 
        cashier_id = auth.uid()
        OR 
        user_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
    );

-- =====================
-- STOCK HISTORY TABLE
-- =====================
-- Allow cashiers to view stock history for products owned by their admin
DROP POLICY IF EXISTS "Users can view stock history for own products" ON stock_history;

CREATE POLICY "Users can view stock history for own products" ON stock_history
    FOR SELECT TO authenticated
    USING (
        product_id IN (
            SELECT id FROM products 
            WHERE user_id = auth.uid() 
            OR user_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
        )
    );

-- =====================
-- EXPENSES TABLE (Admin only - cashiers typically shouldn't see expenses)
-- =====================
-- Keep existing policies - expenses are typically admin-only
-- Uncomment below to allow cashiers to view owner's expenses:
-- DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
-- CREATE POLICY "Users can view own expenses" ON expenses
--     FOR SELECT TO authenticated
--     USING (
--         user_id = auth.uid() 
--         OR 
--         user_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
--     );

COMMENT ON POLICY "Users can view own products" ON products 
    IS 'Allows users to view products they own or products owned by their admin (via owner_id)';
COMMENT ON POLICY "Users can view own categories" ON categories 
    IS 'Allows users to view categories they own or categories owned by their admin (via owner_id)';

