-- Migration 004: Expenses, Product Cost, and Transaction Status
-- Date: 2024

-- 1. Add cost_price column to products table for gross profit calculation
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(12, 2) DEFAULT 0;

-- 2. Add status column to transactions table (default 'completed', can be 'void')
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'void'));

-- 3. Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount DECIMAL(12, 2) NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- 4. Add RLS policies for expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read expenses
CREATE POLICY "Allow read access to expenses" ON expenses
  FOR SELECT TO authenticated
  USING (true);

-- Allow all authenticated users to insert expenses
CREATE POLICY "Allow insert access to expenses" ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Allow only admins to update/delete expenses
CREATE POLICY "Allow admin update expenses" ON expenses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Allow admin delete expenses" ON expenses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 5. Update existing transactions to have status = 'completed'
UPDATE transactions SET status = 'completed' WHERE status IS NULL;

-- 6. Create function to void transaction and restore stock
CREATE OR REPLACE FUNCTION void_transaction(p_transaction_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction RECORD;
  v_item RECORD;
BEGIN
  -- Get transaction details
  SELECT * INTO v_transaction
  FROM transactions
  WHERE id = p_transaction_id;

  IF v_transaction IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  IF v_transaction.status = 'void' THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  -- Restore stock for each item
  FOR v_item IN
    SELECT product_id, quantity
    FROM transaction_items
    WHERE transaction_id = p_transaction_id
  LOOP
    UPDATE products
    SET stock = stock + v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- Update transaction status to void
  UPDATE transactions
  SET status = 'void'
  WHERE id = p_transaction_id;
END;
$$;

-- 7. Create function to get top products
CREATE OR REPLACE FUNCTION get_top_products(p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  product_name TEXT,
  total_sold BIGINT,
  total_revenue DECIMAL(12, 2)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ti.product_name,
    SUM(ti.quantity)::BIGINT AS total_sold,
    SUM(ti.subtotal)::DECIMAL(12, 2) AS total_revenue
  FROM transaction_items ti
  JOIN transactions t ON t.id = ti.transaction_id
  WHERE t.status = 'completed'
    AND t.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY ti.product_name
  ORDER BY total_sold DESC
  LIMIT 5;
END;
$$;

-- 8. Create function to get profit analytics
CREATE OR REPLACE FUNCTION get_profit_analytics(p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  total_revenue DECIMAL(12, 2),
  total_cost DECIMAL(12, 2),
  gross_profit DECIMAL(12, 2),
  total_expenses DECIMAL(12, 2),
  net_profit DECIMAL(12, 2)
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_revenue DECIMAL(12, 2);
  v_total_cost DECIMAL(12, 2);
  v_total_expenses DECIMAL(12, 2);
BEGIN
  -- Get total revenue from completed transactions
  SELECT COALESCE(SUM(total), 0)::DECIMAL(12, 2)
  INTO v_total_revenue
  FROM transactions
  WHERE status = 'completed'
    AND created_at >= NOW() - (p_days || ' days')::INTERVAL;

  -- Get total cost (cost_price * quantity sold)
  SELECT COALESCE(SUM(ti.quantity * p.cost_price), 0)::DECIMAL(12, 2)
  INTO v_total_cost
  FROM transaction_items ti
  JOIN transactions t ON t.id = ti.transaction_id
  JOIN products p ON p.id = ti.product_id
  WHERE t.status = 'completed'
    AND t.created_at >= NOW() - (p_days || ' days')::INTERVAL;

  -- Get total expenses
  SELECT COALESCE(SUM(amount), 0)::DECIMAL(12, 2)
  INTO v_total_expenses
  FROM expenses
  WHERE created_at >= NOW() - (p_days || ' days')::INTERVAL;

  RETURN QUERY SELECT
    v_total_revenue,
    v_total_cost,
    v_total_revenue - v_total_cost AS gross_profit,
    v_total_expenses,
    (v_total_revenue - v_total_cost) - v_total_expenses AS net_profit;
END;
$$;

-- 9. Add expense categories (can be expanded later)
COMMENT ON COLUMN expenses.category IS 'Categories: electricity, water, supplies, rent, salaries, other';
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
