-- Add SIZES reference table (admin-managed)
CREATE TABLE IF NOT EXISTS sizes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    height_inches INT NOT NULL,
    width_inches INT NOT NULL,
    height_mm INT NOT NULL,
    width_mm INT NOT NULL,
    display_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_sizes_active ON sizes(is_active);
CREATE INDEX IF NOT EXISTS idx_sizes_order ON sizes(display_order);

-- Seed initial common tile sizes
INSERT INTO sizes (name, height_inches, width_inches, height_mm, width_mm, display_order) VALUES
('8x12', 8, 12, 200, 300, 1),
('10x10', 10, 10, 250, 250, 2),
('10x15', 10, 15, 250, 375, 3),
('10x20', 10, 20, 250, 500, 4),
('10x24', 10, 24, 250, 600, 5),
('12x12', 12, 12, 300, 300, 6),
('12x18', 12, 18, 300, 450, 7),
('12x24', 12, 24, 300, 600, 8),
('16x16', 16, 16, 400, 400, 9),
('16x24', 16, 24, 400, 600, 10),
('18x18', 18, 18, 450, 450, 11),
('20x20', 20, 20, 500, 500, 12),
('24x24', 24, 24, 600, 600, 13),
('24x48', 24, 48, 600, 1200, 14),
('32x32', 32, 32, 800, 800, 15)
ON CONFLICT (name) DO NOTHING;
