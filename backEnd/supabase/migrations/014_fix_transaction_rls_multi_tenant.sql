-- Migration 014: Fix Transaction RLS for Multi-Tenant Access
-- Purpose: Allow admins to see all transactions from their business (owner_id),
-- and cashiers to see transactions they made OR from their owner's business

-- First, check if user_id column exists in transactions table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    END IF;
END $$;

-- Drop existing RLS policy for transactions SELECT
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;

-- Create new RLS policy:
-- Admin: sees all transactions where user_id = their owner_id (their business)
-- Cashier: sees transactions where:
--   - cashier_id = auth.uid() (they made the transaction), OR
--   - user_id = their owner_id (their admin's business)
CREATE POLICY "Users can view own transactions" ON transactions
    FOR SELECT TO authenticated
    USING (
        -- Admin: see all transactions from their business (user_id = their owner_id)
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND (
                -- Admin's own transactions
                user_id = auth.uid()
                OR
                -- Transactions from cashiers under their ownership
                user_id IN (SELECT id FROM profiles WHERE owner_id = auth.uid())
            )
        )
        OR
        -- Cashier: see their own transactions
        cashier_id = auth.uid()
        OR
        -- Cashier: see transactions from their admin's business
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role = 'cashier'
            AND user_id = owner_id
        )
    );

COMMENT ON POLICY "Users can view own transactions" ON transactions 
    IS 'Admins see all transactions from their business; cashiers see their own and admin business transactions';

