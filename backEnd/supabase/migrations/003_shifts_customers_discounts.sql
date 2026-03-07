-- Migration 003: Shift Management, Customers & Loyalty, Discounts & Promotions

-- ============================================
-- SHIFTS TABLE - Track store opening/closing
-- ============================================
CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cashier_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  end_time TIMESTAMPTZ,
  starting_cash DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  total_expected_cash DECIMAL(15, 2) DEFAULT 0,
  total_actual_cash DECIMAL(15, 2),
  total_sales DECIMAL(15, 2) DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  cash_difference DECIMAL(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX idx_shifts_cashier ON shifts(cashier_id);
CREATE INDEX idx_shifts_status ON shifts(status);
CREATE INDEX idx_shifts_start_time ON shifts(start_time);

-- RLS for shifts
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shifts"
  ON shifts FOR SELECT
  USING (auth.uid() = cashier_id);

CREATE POLICY "Users can insert own shifts"
  ON shifts FOR INSERT
  WITH CHECK (auth.uid() = cashier_id);

CREATE POLICY "Users can update own shifts"
  ON shifts FOR UPDATE
  USING (auth.uid() = cashier_id);

-- ============================================
-- CUSTOMERS TABLE - Customer & Loyalty System
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  points INTEGER DEFAULT 0 NOT NULL,
  total_spent DECIMAL(15, 2) DEFAULT 0 NOT NULL,
  visits INTEGER DEFAULT 0 NOT NULL,
  last_visit TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for phone lookup
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_points ON customers(points DESC);

-- RLS for customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true);

-- ============================================
-- DISCOUNTS TABLE - Promotions System
-- ============================================
CREATE TABLE IF NOT EXISTS discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')) NOT NULL,
  value DECIMAL(15, 2) NOT NULL,
  min_purchase DECIMAL(15, 2) DEFAULT 0,
  max_discount DECIMAL(15, 2),
  applicable_products UUID[] DEFAULT '{}',
  applicable_categories UUID[] DEFAULT '{}',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for active discounts lookup
CREATE INDEX idx_discounts_active ON discounts(is_active) WHERE is_active = true;

-- RLS for discounts
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active discounts"
  ON discounts FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated users can manage discounts"
  ON discounts FOR ALL
  TO authenticated
  USING (true);

-- ============================================
-- UPDATE TRANSACTIONS TABLE - Add customer & shift references
-- ============================================
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id),
ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES shifts(id),
ADD COLUMN IF NOT EXISTS discount_id UUID REFERENCES discounts(id),
ADD COLUMN IF NOT EXISTS loyalty_points_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS loyalty_points_redeemed INTEGER DEFAULT 0;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_shift ON transactions(shift_id);

-- ============================================
-- SEED DATA - Sample discounts
-- ============================================
INSERT INTO discounts (name, description, type, value, min_purchase, is_active, start_date, end_date)
VALUES 
  ('Welcome Discount', 'New customer special discount', 'percentage', 10, 0, true, NOW(), NOW() + INTERVAL '30 days'),
  ('Weekend Special', 'Weekend promo discount', 'percentage', 15, 50000, true, NOW() + INTERVAL '1 day', NOW() + INTERVAL '7 days'),
  ('Fixed Rp 10.000 Off', 'Fixed discount for purchases above Rp 100.000', 'fixed', 10000, 100000, true, NOW(), NOW() + INTERVAL '90 days'),
  ('Member Bonus', 'Special discount for loyal customers', 'percentage', 20, 200000, true, NOW(), NULL)
ON CONFLICT DO NOTHING;
