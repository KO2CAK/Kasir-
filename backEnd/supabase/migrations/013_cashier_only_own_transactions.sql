-- Migration 013: Cashier only sees their own transactions
-- Purpose: Admin sees all transactions, Cashier sees only transactions they made

-- Drop existing RLS policy for transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;

-- Create new RLS policy:
-- 1. Admin (role = 'admin') sees ALL transactions
-- 2. Cashier sees ONLY transactions they made (cashier_id = auth.uid())
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT TO authenticated
    USING (
        -- Admin sees all transactions
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        -- Cashier sees ONLY their own transactions (they are the cashier)
        cashier_id = auth.uid()
    );

COMMENT ON POLICY "Users can view own transactions" ON transactions 
    IS 'Admins see all transactions, cashiers see only their own transactions';

