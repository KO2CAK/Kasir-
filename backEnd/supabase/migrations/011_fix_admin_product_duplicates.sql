-- Migration 011: Fix duplicate products issue for admin users
-- Problem: Admin users have owner_id set to themselves, causing RLS to match
--          both conditions (user_id = auth.uid() OR user_id = owner_id) and 
--          return duplicate rows

-- =====================
-- PRODUCTS TABLE
-- =====================
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own products" ON products;

-- Create new RLS policy that handles admin users correctly
-- Admin users (role = 'admin') can see all their products
-- Cashier users can see products owned by their admin (via owner_id)
CREATE POLICY "Users can view own products" ON products
    FOR SELECT TO authenticated
    USING (
        -- User is admin: show products where user_id = auth.uid()
        user_id = auth.uid()
        OR
        -- User is cashier: show products where user_id = owner's user_id
        -- Only apply this condition if the current user is NOT an admin
        (
            user_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
            AND 
            (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin'
        )
    );

-- =====================
-- CATEGORIES TABLE
-- =====================
-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own categories" ON products;

-- Apply same fix to categories
DROP POLICY IF EXISTS "Users can view own categories" ON categories;

CREATE POLICY "Users can view own categories" ON categories
    FOR SELECT TO authenticated
    USING (
        -- User is admin: show categories where user_id = auth.uid()
        user_id = auth.uid()
        OR
        -- User is cashier: show categories where user_id = owner's user_id
        (
            user_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
            AND 
            (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin'
        )
    );

-- =====================
-- EXPENSES TABLE
-- =====================
-- Apply same fix to expenses (only admins should see expenses)
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;

CREATE POLICY "Users can view own expenses" ON expenses
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
    );

-- =====================
-- TRANSACTIONS TABLE
-- =====================
-- Apply same fix to transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;

CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT TO authenticated
    USING (
        -- User owns the transaction
        user_id = auth.uid()
        OR
        -- User is the cashier for this transaction
        cashier_id = auth.uid()
        OR
        -- User is a cashier: show transactions owned by their admin
        (
            user_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
            AND 
            (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin'
        )
    );

-- =====================
-- STOCK HISTORY TABLE
-- =====================
-- Apply same fix to stock history
DROP POLICY IF EXISTS "Users can view stock history for own products" ON stock_history;

CREATE POLICY "Users can view stock history for own products" ON stock_history
    FOR SELECT TO authenticated
    USING (
        product_id IN (
            SELECT id FROM products 
            WHERE 
                -- Admin can see their own products
                user_id = auth.uid()
                OR
                -- Cashier can see products owned by their admin
                (
                    user_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
                    AND 
                    (SELECT role FROM profiles WHERE id = auth.uid()) != 'admin'
                )
        )
    );

COMMENT ON POLICY "Users can view own products" ON products 
    IS 'Allows admins to view their products, cashiers to view admin''s products';

