-- Migration 009: Fix RLS policies to use user_id instead of account_id
-- Run this in Supabase SQL Editor to fix products, categories, expenses tables

-- =====================
-- PRODUCTS TABLE
-- =====================
-- Drop old account_id based policies
DROP POLICY IF EXISTS "Account users can view products" ON products;
DROP POLICY IF EXISTS "Account users can insert products" ON products;
DROP POLICY IF EXISTS "Account users can update products" ON products;
DROP POLICY IF EXISTS "Account users can delete products" ON products;

-- Create user_id based policies
CREATE POLICY "Users can view own products" ON products
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

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
-- Drop old account_id based policies
DROP POLICY IF EXISTS "Account users can view categories" ON categories;
DROP POLICY IF EXISTS "Account users can insert categories" ON categories;
DROP POLICY IF EXISTS "Account users can update categories" ON categories;
DROP POLICY IF EXISTS "Account users can delete categories" ON categories;

-- Create user_id based policies
CREATE POLICY "Users can view own categories" ON categories
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

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
-- EXPENSES TABLE
-- =====================
-- Drop old policies
DROP POLICY IF EXISTS "Account users can view expenses" ON expenses;
DROP POLICY IF EXISTS "Account users can insert expenses" ON expenses;
DROP POLICY IF EXISTS "Account users can update expenses" ON expenses;
DROP POLICY IF EXISTS "Account users can delete expenses" ON expenses;

-- Create user_id based policies
CREATE POLICY "Users can view own expenses" ON expenses
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own expenses" ON expenses
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own expenses" ON expenses
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own expenses" ON expenses
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- =====================
-- TRANSACTIONS TABLE
-- =====================
-- Keep existing policies as they use cashier_id which is fine

-- =====================
-- STOCK HISTORY
-- =====================
DROP POLICY IF EXISTS "Account users can view stock history" ON stock_history;

CREATE POLICY "Users can view stock history for own products" ON stock_history
    FOR SELECT TO authenticated
    USING (
        product_id IN (SELECT id FROM products WHERE user_id = auth.uid())
    );

