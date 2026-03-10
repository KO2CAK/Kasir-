-- Migration 007: Fix account_id for shared data (Simplified)
-- Run this in Supabase SQL Editor

-- 1. Add account_id to products table (without FK constraint)
ALTER TABLE products ADD COLUMN IF NOT EXISTS account_id UUID;

-- 2. Add account_id to categories table
ALTER TABLE categories ADD COLUMN IF NOT EXISTS account_id UUID;

-- 3. Populate account_id from user_id for existing records
UPDATE products SET account_id = (SELECT account_id FROM profiles WHERE id = products.user_id) WHERE account_id IS NULL AND user_id IS NOT NULL;
UPDATE categories SET account_id = (SELECT account_id FROM profiles WHERE id = categories.user_id) WHERE account_id IS NULL AND user_id IS NOT NULL;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_products_account ON products(account_id);
CREATE INDEX IF NOT EXISTS idx_categories_account ON categories(account_id);

-- 5. Drop old RLS policies for products
DROP POLICY IF EXISTS "Users can view own products" ON products;
DROP POLICY IF EXISTS "Users can insert own products" ON products;
DROP POLICY IF EXISTS "Users can update own products" ON products;
DROP POLICY IF EXISTS "Users can delete own products" ON products;

-- 6. Create new RLS policies for products
CREATE POLICY "Account users can view products" ON products FOR SELECT TO authenticated USING (account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Account users can insert products" ON products FOR INSERT TO authenticated WITH CHECK (account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Account users can update products" ON products FOR UPDATE TO authenticated USING (account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid())) WITH CHECK (account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Account users can delete products" ON products FOR DELETE TO authenticated USING (account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid()));

-- 7. Drop old RLS policies for categories
DROP POLICY IF EXISTS "Users can view own categories" ON categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

-- 8. Create new RLS policies for categories
CREATE POLICY "Account users can view categories" ON categories FOR SELECT TO authenticated USING (account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Account users can insert categories" ON categories FOR INSERT TO authenticated WITH CHECK (account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Account users can update categories" ON categories FOR UPDATE TO authenticated USING (account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid())) WITH CHECK (account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Account users can delete categories" ON categories FOR DELETE TO authenticated USING (account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid()));

-- 9. Update stock history policy
DROP POLICY IF EXISTS "Users can view stock history for own products" ON stock_history;
CREATE POLICY "Account users can view stock history" ON stock_history FOR SELECT TO authenticated USING (product_id IN (SELECT id FROM products WHERE account_id IN (SELECT account_id FROM profiles WHERE id = auth.uid())));
