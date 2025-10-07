-- Simple User Seeding for Testing
-- Database: attendance-management
-- User: root/root

-- Insert test user (matches your JWT token)
INSERT INTO users (
    id,
    external_user_id,
    name,
    email,
    phone,
    is_active,
    created_at,
    updated_at
) VALUES (
    'afc70db3-6f43-4882-92fd-4715f25ffc95',
    'U-8C695E',
    'Test User',
    'test.user@company.com',
    '+1234567890',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    updated_at = NOW();

-- Check if user was created
SELECT 'User created successfully' as status, id, name, email FROM users WHERE id = 'afc70db3-6f43-4882-92fd-4715f25ffc95';