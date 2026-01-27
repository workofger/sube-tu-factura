-- ============================================================================
-- MIGRACIÓN 008: Tabla de API Keys
-- FacturaFlow AI - Sistema de API Keys para acceso programático
-- ============================================================================

-- 1. Crear tabla de API Keys
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificación
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Seguridad
    key_hash VARCHAR(64) NOT NULL,        -- SHA-256 del key completo
    key_prefix VARCHAR(12) NOT NULL,       -- Primeros chars para identificación (pk_xxxxxxxx)
    
    -- Permisos
    scopes TEXT[] DEFAULT ARRAY['public'], -- ['public', 'admin', 'export', 'user']
    
    -- Rate limiting
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 10000,
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoría
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    last_used_ip VARCHAR(45),
    total_requests INTEGER DEFAULT 0,
    
    -- Expiración opcional
    expires_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT unique_key_prefix UNIQUE(key_prefix)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_created_by ON api_keys(created_by);

-- 3. Tabla de logs de uso de API Keys
CREATE TABLE IF NOT EXISTS api_key_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Request info
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para consultas de uso
CREATE INDEX IF NOT EXISTS idx_api_key_usage_key ON api_key_usage_log(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_date ON api_key_usage_log(created_at);

-- Partición por mes (opcional, para alto volumen)
-- CREATE INDEX idx_api_key_usage_month ON api_key_usage_log(date_trunc('month', created_at));

-- 4. Función para incrementar contador de uso
CREATE OR REPLACE FUNCTION increment_api_key_usage(
    p_key_id UUID,
    p_ip VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE api_keys
    SET 
        last_used_at = NOW(),
        last_used_ip = COALESCE(p_ip, last_used_ip),
        total_requests = total_requests + 1
    WHERE id = p_key_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para verificar rate limit
CREATE OR REPLACE FUNCTION check_api_key_rate_limit(
    p_key_id UUID
)
RETURNS TABLE(
    allowed BOOLEAN,
    requests_minute INTEGER,
    requests_day INTEGER,
    limit_minute INTEGER,
    limit_day INTEGER
) AS $$
DECLARE
    v_rate_limit_minute INTEGER;
    v_rate_limit_day INTEGER;
    v_requests_minute INTEGER;
    v_requests_day INTEGER;
BEGIN
    -- Get rate limits
    SELECT rate_limit_per_minute, rate_limit_per_day
    INTO v_rate_limit_minute, v_rate_limit_day
    FROM api_keys
    WHERE id = p_key_id;
    
    -- Count requests in last minute
    SELECT COUNT(*)
    INTO v_requests_minute
    FROM api_key_usage_log
    WHERE api_key_id = p_key_id
    AND created_at > NOW() - INTERVAL '1 minute';
    
    -- Count requests today
    SELECT COUNT(*)
    INTO v_requests_day
    FROM api_key_usage_log
    WHERE api_key_id = p_key_id
    AND created_at > date_trunc('day', NOW());
    
    RETURN QUERY SELECT 
        (v_requests_minute < v_rate_limit_minute AND v_requests_day < v_rate_limit_day) AS allowed,
        v_requests_minute AS requests_minute,
        v_requests_day AS requests_day,
        v_rate_limit_minute AS limit_minute,
        v_rate_limit_day AS limit_day;
END;
$$ LANGUAGE plpgsql;

-- 6. Vista de API Keys para admin (sin mostrar hash)
CREATE OR REPLACE VIEW v_api_keys_admin AS
SELECT 
    id,
    name,
    description,
    key_prefix,
    scopes,
    rate_limit_per_minute,
    rate_limit_per_day,
    is_active,
    created_at,
    last_used_at,
    total_requests,
    expires_at,
    CASE 
        WHEN expires_at IS NOT NULL AND expires_at < NOW() THEN 'expired'
        WHEN NOT is_active THEN 'revoked'
        ELSE 'active'
    END AS status
FROM api_keys;

-- 7. Comentarios
COMMENT ON TABLE api_keys IS 'API Keys para acceso programático a la API';
COMMENT ON COLUMN api_keys.key_hash IS 'Hash SHA-256 del API key completo (nunca almacenar key en texto plano)';
COMMENT ON COLUMN api_keys.key_prefix IS 'Prefijo del key para identificación (ej: pk_abc12345)';
COMMENT ON COLUMN api_keys.scopes IS 'Permisos: public, admin, export, user';
COMMENT ON TABLE api_key_usage_log IS 'Log de uso de API keys para auditoría y rate limiting';
