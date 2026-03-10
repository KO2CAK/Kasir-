-- Migration 012: Fix Admin Transaction Access
-- Purpose: Allow admins to see all transactions (from themselves and cashiers)
-- Allow cashiers to see transactions they made

-- Drop existing RLS policy for transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;

-- Create new RLS policy that:
-- 1. Admin (role = 'admin') sees ALL transactions
-- 2. Cashier sees transactions where they are the cashier OR transactions owned by their admin
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT TO authenticated
    USING (
        -- Admin sees all transactions
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
        OR
        -- User sees their own transactions (where user_id matches their auth id)
        user_id = auth.uid()
        OR
        -- Cashier sees transactions they made
        cashier_id = auth.uid()
        OR
        -- Cashier sees transactions owned by their admin
        user_id = (SELECT owner_id FROM profiles WHERE id = auth.uid())
    );

COMMENT ON POLICY "Users can view own transactions" ON transactions 
    IS 'Admins see all transactions, cashiers see transactions they made or owned by their admin';

