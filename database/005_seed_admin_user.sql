-- =============================================
-- SEED: Crear usuario admin inicial
-- Ejecutar después de 004_add_admin_users.sql
-- =============================================

-- Insertar super admin: Gerardo Sánchez
INSERT INTO admin_users (
    id,
    auth_user_id,
    email,
    full_name,
    role,
    is_active,
    created_at
) VALUES (
    gen_random_uuid(),
    gen_random_uuid(),  -- Placeholder, no usamos Supabase Auth
    'g.sanchez@partrunner.com',
    'Gerardo Sánchez',
    'super_admin',
    true,
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = 'super_admin',
    is_active = true;

-- Verificar inserción
SELECT id, email, full_name, role, is_active, created_at 
FROM admin_users 
WHERE email = 'g.sanchez@partrunner.com';
