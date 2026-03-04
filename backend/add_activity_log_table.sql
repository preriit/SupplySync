-- Product Activity Log for comprehensive audit trail
-- Tracks ALL changes: creation, edits, transactions, deletion

CREATE TABLE IF NOT EXISTS product_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
    merchant_id UUID REFERENCES merchants(id) NOT NULL,
    user_id UUID REFERENCES users(id) NOT NULL,
    
    -- Activity details
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
        'created', 'edited', 'quantity_add', 'quantity_subtract', 'deleted', 'restored'
    )),
    
    -- Store changes as JSON
    changes JSONB,  -- {"field": "brand", "old_value": "Kajaria", "new_value": "Somany"}
    
    -- Additional context
    description TEXT,  -- Human-readable description
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_log_product ON product_activity_log(product_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_merchant ON product_activity_log(merchant_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON product_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON product_activity_log(activity_type);
