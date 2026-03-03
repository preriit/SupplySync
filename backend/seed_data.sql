-- Seed data for reference tables
-- Based on existing Django choices

-- =====================================================
-- BODY TYPES
-- =====================================================
INSERT INTO body_types (name, display_order) VALUES
('VITRIFIED', 1),
('CERAMIC', 2)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- MAKE TYPES
-- =====================================================
INSERT INTO make_types (name, display_order) VALUES
('Double Charge', 1),
('GVT', 2),
('Nano', 3),
('Ceramic', 4),
('Digital', 5),
('HD', 6),
('Full Body', 7)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- SURFACE TYPES
-- =====================================================
INSERT INTO surface_types (name, display_order) VALUES
('GLOSSY', 1),
('MATT', 2),
('SUGAR', 3),
('HIGH GLOSS', 4),
('RUSTIC', 5)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- APPLICATION TYPES
-- =====================================================
INSERT INTO application_types (name, display_order) VALUES
('WALL', 1),
('FLOOR', 2),
('WALL & FLOOR', 3)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- QUALITIES
-- =====================================================
INSERT INTO qualities (name, display_order) VALUES
('PREMIUM', 1),
('STANDARD', 2),
('COMMERCIAL', 3)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- CATEGORIES (High-level)
-- =====================================================
INSERT INTO categories (name, slug, description, display_order) VALUES
('Tiles', 'tiles', 'Ceramic and Vitrified Tiles', 1)
ON CONFLICT (slug) DO NOTHING;

-- Note: Future categories can be added:
-- ('Plywood', 'plywood', 'Plywood and Wood Products', 2),
-- ('Laminate', 'laminate', 'Laminate Sheets', 3),
-- ('Sanitary', 'sanitary', 'Sanitary Ware', 4)
