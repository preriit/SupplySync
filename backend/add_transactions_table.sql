-- Add product_transactions table for quantity tracking
-- This table logs all quantity changes for analytics and history

CREATE TABLE IF NOT EXISTS product_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    merchant_id UUID REFERENCES merchants(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    
    -- Transaction details
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('add', 'subtract')),
    quantity INT NOT NULL,  -- Always positive number representing amount changed
    quantity_before INT NOT NULL,  -- Quantity before transaction
    quantity_after INT NOT NULL,   -- Quantity after transaction
    
    -- Additional context
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes for performance
    CONSTRAINT positive_quantity CHECK (quantity > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_product ON product_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON product_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON product_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON product_transactions(created_at DESC);
