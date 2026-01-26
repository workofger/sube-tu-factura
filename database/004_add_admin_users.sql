-- ============================================================================
-- MIGRACIÓN 004: Agregar tabla de usuarios administrativos
-- FacturaFlow AI - Sistema de administración con autenticación
-- ============================================================================

-- 1. Crear tipo enum para roles de administrador
DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('super_admin', 'finance', 'operations', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Crear tabla de usuarios administrativos
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Vinculación con Supabase Auth
    auth_user_id UUID UNIQUE NOT NULL,  -- Referencia a auth.users en Supabase
    
    -- Información del usuario
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    
    -- Rol y permisos
    role admin_role DEFAULT 'viewer',
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 3. Comentarios para documentación
COMMENT ON TABLE admin_users IS 'Usuarios administrativos del sistema FacturaFlow';
COMMENT ON COLUMN admin_users.auth_user_id IS 'ID del usuario en Supabase Auth (auth.users.id)';
COMMENT ON COLUMN admin_users.role IS 'Rol del administrador: super_admin (todo), finance (reportes y pagos), operations (facturas), viewer (solo lectura)';
COMMENT ON COLUMN admin_users.is_active IS 'Si el usuario puede acceder al sistema';
COMMENT ON COLUMN admin_users.last_login_at IS 'Última vez que el usuario inició sesión';

-- 4. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_auth_id ON admin_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;

-- 5. Trigger para updated_at
CREATE OR REPLACE FUNCTION update_admin_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON admin_users;
CREATE TRIGGER trg_admin_users_updated_at
BEFORE UPDATE ON admin_users
FOR EACH ROW
EXECUTE FUNCTION update_admin_users_updated_at();

-- 6. Tabla de auditoría de acciones de admin
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),  -- 'invoice', 'driver', 'flotillero', etc.
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE admin_audit_log IS 'Registro de acciones realizadas por administradores';
COMMENT ON COLUMN admin_audit_log.action IS 'Tipo de acción: login, logout, view, export, update_status, etc.';
COMMENT ON COLUMN admin_audit_log.entity_type IS 'Tipo de entidad afectada';
COMMENT ON COLUMN admin_audit_log.entity_id IS 'ID de la entidad afectada';
COMMENT ON COLUMN admin_audit_log.details IS 'Detalles adicionales de la acción en formato JSON';

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);

-- 7. Función para registrar acciones de admin
CREATE OR REPLACE FUNCTION log_admin_action(
    p_admin_id UUID,
    p_action VARCHAR(100),
    p_entity_type VARCHAR(50) DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO admin_audit_log (
        admin_user_id, action, entity_type, entity_id, details, ip_address, user_agent
    ) VALUES (
        p_admin_id, p_action, p_entity_type, p_entity_id, p_details, p_ip_address, p_user_agent
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Vista de administradores activos
CREATE OR REPLACE VIEW v_active_admins AS
SELECT 
    au.id,
    au.email,
    au.full_name,
    au.role,
    au.last_login_at,
    au.created_at,
    (
        SELECT COUNT(*) 
        FROM admin_audit_log aal 
        WHERE aal.admin_user_id = au.id 
        AND aal.created_at > NOW() - INTERVAL '30 days'
    ) AS actions_last_30_days
FROM admin_users au
WHERE au.is_active = true
ORDER BY au.full_name;

-- 9. RLS (Row Level Security) policies para admin_users
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Policy: Admins solo pueden ver otros admins si son super_admin
CREATE POLICY admin_users_select_policy ON admin_users
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM admin_users WHERE is_active = true
        )
    );

-- Policy: Solo super_admin puede insertar nuevos admins
CREATE POLICY admin_users_insert_policy ON admin_users
    FOR INSERT
    WITH CHECK (
        auth.uid() IN (
            SELECT auth_user_id FROM admin_users WHERE role = 'super_admin' AND is_active = true
        )
    );

-- Policy: Solo super_admin puede actualizar admins
CREATE POLICY admin_users_update_policy ON admin_users
    FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM admin_users WHERE role = 'super_admin' AND is_active = true
        )
    );

-- 10. RLS para admin_audit_log
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins pueden ver el log
CREATE POLICY admin_audit_select_policy ON admin_audit_log
    FOR SELECT
    USING (
        auth.uid() IN (
            SELECT auth_user_id FROM admin_users WHERE is_active = true
        )
    );

-- Policy: El sistema puede insertar logs
CREATE POLICY admin_audit_insert_policy ON admin_audit_log
    FOR INSERT
    WITH CHECK (true);  -- Permite inserción desde el backend

-- ============================================================================
-- FIN DE LA MIGRACIÓN 004
-- ============================================================================
