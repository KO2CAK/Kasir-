-- Migration 006: Multi-tenant User Isolation
-- Date: 2024
-- Purpose: Each user (admin) has their own separate data

-- 1. Add user_id to categories table (links to profiles)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Add user_id to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Add user_id to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 4. Update expenses to populate user_id from created_by for existing records
UPDATE expenses SET user_id = created_by WHERE user_id IS NULL;

-- 5. Add user_id to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 6. Update transactions to populate user_id from cashier_id for existing records
UPDATE transactions SET user_id = cashier_id WHERE user_id IS NULL;

-- 7. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_products_user ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);

-- 8. Categories RLS
DROP POLICY IF EXISTS "Categories are viewable by authenticated users" ON categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
DROP POLICY IF EXISTS "Admins can update categories" ON categories;
DROP POLICY IF EXISTS "Admins can delete categories" ON categories;

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

-- Products RLS
DROP POLICY IF EXISTS "Products are viewable by authenticated users" ON products;
DROP POLICY IF EXISTS "Admins can insert products" ON products;
DROP POLICY IF EXISTS "Admins can update products" ON products;
DROP POLICY IF EXISTS "Admins can delete products" ON products;

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

-- Expenses RLS
DROP POLICY IF EXISTS "Allow read access to expenses" ON expenses;
DROP POLICY IF EXISTS "Allow insert access to expenses" ON expenses;
DROP POLICY IF EXISTS "Allow admin update expenses" ON expenses;
DROP POLICY IF EXISTS "Allow admin delete expenses" ON expenses;

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

-- Transactions RLS
DROP POLICY IF EXISTS "Transactions are viewable by authenticated users" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can insert transactions" ON transactions;

CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR cashier_id = auth.uid());

CREATE POLICY "Users can insert own transactions" ON transactions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR cashier_id = auth.uid());

-- Stock history RLS
DROP POLICY IF EXISTS "Stock history is viewable by authenticated users" ON stock_history;

CREATE POLICY "Users can view stock history for own products" ON stock_history
    FOR SELECT TO authenticated
    USING (
        product_id IN (SELECT id FROM products WHERE user_id = auth.uid())
    );

COMMENT ON COLUMN categories.user_id IS 'The admin user who owns this category';
COMMENT ON COLUMN products.user_id IS 'The admin user who owns this product';
COMMENT ON COLUMN expenses.user_id IS 'The admin user who owns this expense';
COMMENT ON COLUMN transactions.user_id IS 'The admin user who owns this transaction';

