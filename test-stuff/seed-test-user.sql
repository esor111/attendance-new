-- Seed Test User Data for Testing Without External APIs
-- This bypasses the handshake process by creating user data directly

-- Insert test user (matches your JWT token user ID)
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

-- Insert test department
INSERT INTO departments (
    id,
    name,
    description,
    is_active,
    created_at,
    updated_at
) VALUES (
    'dept-test-001',
    'Test Department',
    'Department for testing purposes',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Insert test business entity
INSERT INTO entities (
    id,
    name,
    description,
    is_active,
    created_at,
    updated_at
) VALUES (
    'entity-test-001',
    'Test Company',
    'Test company for API testing',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

-- Link user to department
INSERT INTO user_department_assignments (
    id,
    user_id,
    department_id,
    is_primary,
    created_at,
    updated_at
) VALUES (
    'user-dept-001',
    'afc70db3-6f43-4882-92fd-4715f25ffc95',
    'dept-test-001',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    is_primary = EXCLUDED.is_primary,
    updated_at = NOW();

-- Link user to entity for attendance access
INSERT INTO user_entity_assignments (
    id,
    user_id,
    entity_id,
    is_primary,
    created_at,
    updated_at
) VALUES (
    'user-entity-001',
    'afc70db3-6f43-4882-92fd-4715f25ffc95',
    'entity-test-001',
    true,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    is_primary = EXCLUDED.is_primary,
    updated_at = NOW();

-- Verify the data
SELECT 'Users' as table_name, count(*) as count FROM users WHERE id = 'afc70db3-6f43-4882-92fd-4715f25ffc95'
UNION ALL
SELECT 'Departments', count(*) FROM departments WHERE id = 'dept-test-001'
UNION ALL
SELECT 'Entities', count(*) FROM entities WHERE id = 'entity-test-001'
UNION ALL
SELECT 'User-Dept Links', count(*) FROM user_department_assignments WHERE user_id = 'afc70db3-6f43-4882-92fd-4715f25ffc95'
UNION ALL
SELECT 'User-Entity Links', count(*) FROM user_entity_assignments WHERE user_id = 'afc70db3-6f43-4882-92fd-4715f25ffc95';