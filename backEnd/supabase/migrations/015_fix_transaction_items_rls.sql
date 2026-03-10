-- Migration 015: Fix Transaction Items RLS for Multi-Tenant Access
-- Purpose: Ensure transaction_items only shows items for transactions the user can see

-- Drop existing RLS policy for transaction_items SELECT
DROP POLICY IF EXISTS "Transaction items are viewable by authenticated users" ON transaction_items;

-- Create new RLS policy for transaction_items:
-- User can only see items if they can see the parent transaction
-- This is done by checking if the transaction_id exists in a subquery
-- that the user has access to
CREATE POLICY "Transaction items are viewable by authenticated users" ON transaction_items
    FOR SELECT TO authenticated
    USING (
        -- User can see items if they can see the parent transaction
        EXISTS (
            SELECT 1 FROM transactions t
            WHERE t.id = transaction_id
            AND (
                -- Admin: see all transactions from their business
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND role = 'admin'
                    AND (
                        t.user_id = auth.uid()
                        OR t.user_id IN (SELECT id FROM profiles WHERE owner_id = auth.uid())
                    )
                )
                OR
                -- Cashier: see their own transactions
                t.cashier_id = auth.uid()
                OR
                -- Cashier: see transactions from their admin's business
                EXISTS (
                    SELECT 1 FROM profiles 
                    WHERE id = auth.uid() 
                    AND role = 'cashier'
                    AND t.user_id = owner_id
                )
            )
        )
    );

COMMENT ON POLICY "Transaction items are viewable by authenticated users" ON transaction_items 
    IS 'Users can only see transaction items for transactions they have access to';

