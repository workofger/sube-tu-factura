-- ============================================================================
-- MIGRACIÓN 009: Autenticación de usuarios (flotilleros/drivers)
-- FacturaFlow AI - Login para flotilleros y drivers independientes
-- ============================================================================

-- 1. Agregar campos de autenticación a flotilleros
ALTER TABLE flotilleros
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS magic_link_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS magic_link_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS email_verification_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- 2. Índices para autenticación
CREATE INDEX IF NOT EXISTS idx_flotilleros_email_auth ON flotilleros(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flotilleros_magic_link ON flotilleros(magic_link_token) WHERE magic_link_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_flotilleros_auth_user ON flotilleros(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- 3. Tabla de sesiones de usuario
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flotillero_id UUID NOT NULL REFERENCES flotilleros(id) ON DELETE CASCADE,
    
    -- Token de sesión
    token_hash VARCHAR(64) NOT NULL,  -- SHA-256 del token
    
    -- Metadata de sesión
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(100)
);

-- Índices para sesiones
CREATE INDEX IF NOT EXISTS idx_user_sessions_flotillero ON user_sessions(flotillero_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at) 
WHERE is_active = true;

-- 4. Tabla de auditoría de autenticación
CREATE TABLE IF NOT EXISTS user_auth_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flotillero_id UUID REFERENCES flotilleros(id) ON DELETE SET NULL,
    
    -- Tipo de evento
    event_type VARCHAR(50) NOT NULL, -- login, logout, failed_login, password_reset, magic_link, etc
    
    -- Resultado
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsqueda de logs
CREATE INDEX IF NOT EXISTS idx_user_auth_log_flotillero ON user_auth_log(flotillero_id);
CREATE INDEX IF NOT EXISTS idx_user_auth_log_event ON user_auth_log(event_type);
CREATE INDEX IF NOT EXISTS idx_user_auth_log_date ON user_auth_log(created_at);

-- 5. Función para registrar evento de autenticación
CREATE OR REPLACE FUNCTION log_auth_event(
    p_flotillero_id UUID,
    p_event_type VARCHAR,
    p_success BOOLEAN,
    p_failure_reason TEXT DEFAULT NULL,
    p_ip_address VARCHAR DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO user_auth_log (
        flotillero_id, event_type, success, failure_reason, 
        ip_address, user_agent, metadata
    )
    VALUES (
        p_flotillero_id, p_event_type, p_success, p_failure_reason,
        p_ip_address, p_user_agent, p_metadata
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Función para limpiar tokens expirados (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_auth_tokens()
RETURNS INTEGER AS $$
DECLARE
    v_cleaned INTEGER := 0;
BEGIN
    -- Limpiar magic links expirados
    UPDATE flotilleros
    SET magic_link_token = NULL, magic_link_expires_at = NULL
    WHERE magic_link_expires_at < NOW();
    GET DIAGNOSTICS v_cleaned = ROW_COUNT;
    
    -- Limpiar password reset tokens expirados
    UPDATE flotilleros
    SET password_reset_token = NULL, password_reset_expires_at = NULL
    WHERE password_reset_expires_at < NOW();
    
    -- Limpiar email verification tokens expirados
    UPDATE flotilleros
    SET email_verification_token = NULL, email_verification_expires_at = NULL
    WHERE email_verification_expires_at < NOW();
    
    -- Marcar sesiones expiradas como inactivas
    UPDATE user_sessions
    SET is_active = false, revoked_reason = 'expired'
    WHERE expires_at < NOW() AND is_active = true;
    
    -- Desbloquear cuentas con lock expirado
    UPDATE flotilleros
    SET locked_until = NULL, failed_login_attempts = 0
    WHERE locked_until < NOW();
    
    RETURN v_cleaned;
END;
$$ LANGUAGE plpgsql;

-- 7. Función para verificar intentos fallidos y bloquear cuenta
CREATE OR REPLACE FUNCTION check_and_lock_account(p_flotillero_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_attempts INTEGER;
    v_max_attempts INTEGER := 5;
    v_lock_duration INTERVAL := '15 minutes';
BEGIN
    -- Obtener intentos fallidos
    SELECT failed_login_attempts INTO v_attempts
    FROM flotilleros
    WHERE id = p_flotillero_id;
    
    -- Si excede el límite, bloquear cuenta
    IF v_attempts >= v_max_attempts THEN
        UPDATE flotilleros
        SET locked_until = NOW() + v_lock_duration
        WHERE id = p_flotillero_id;
        
        RETURN true; -- Cuenta bloqueada
    END IF;
    
    RETURN false; -- Cuenta no bloqueada
END;
$$ LANGUAGE plpgsql;

-- 8. Vista de usuarios con información de autenticación (para admin)
CREATE OR REPLACE VIEW v_users_auth_status AS
SELECT 
    f.id,
    f.rfc,
    f.fiscal_name,
    f.email,
    f.type,
    f.status,
    f.email_verified,
    f.last_login_at,
    f.failed_login_attempts,
    f.locked_until,
    CASE 
        WHEN f.locked_until IS NOT NULL AND f.locked_until > NOW() THEN 'locked'
        WHEN f.password_hash IS NULL AND f.email_verified = false THEN 'pending_setup'
        WHEN f.email_verified = false THEN 'pending_verification'
        ELSE 'active'
    END AS auth_status,
    (SELECT COUNT(*) FROM user_sessions s WHERE s.flotillero_id = f.id AND s.is_active = true AND s.expires_at > NOW()) AS active_sessions
FROM flotilleros f;

-- 9. Comentarios
COMMENT ON COLUMN flotilleros.password_hash IS 'Hash bcrypt de la contraseña del usuario';
COMMENT ON COLUMN flotilleros.magic_link_token IS 'Token para login sin contraseña (magic link)';
COMMENT ON COLUMN flotilleros.email_verified IS 'Indica si el email ha sido verificado';
COMMENT ON COLUMN flotilleros.locked_until IS 'Fecha hasta la cual la cuenta está bloqueada por intentos fallidos';
COMMENT ON TABLE user_sessions IS 'Sesiones activas de usuarios (flotilleros/drivers)';
COMMENT ON TABLE user_auth_log IS 'Log de eventos de autenticación para auditoría';
