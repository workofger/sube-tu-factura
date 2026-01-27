-- ============================================================================
-- MIGRACIÓN 010: Campos de Onboarding para Usuarios
-- FacturaFlow AI - Wizard de configuración inicial para flotilleros/drivers
-- ============================================================================

-- 1. Agregar campos de onboarding a flotilleros
ALTER TABLE flotilleros
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS temp_password_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES admin_users(id),
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS invite_method VARCHAR(20); -- 'magic_link' | 'temp_password'

-- 2. Índice para consultas de onboarding pendiente
CREATE INDEX IF NOT EXISTS idx_flotilleros_onboarding ON flotilleros(onboarding_completed) 
WHERE onboarding_completed = false;

-- 3. Índice para usuarios creados por admin
CREATE INDEX IF NOT EXISTS idx_flotilleros_created_by ON flotilleros(created_by_admin) 
WHERE created_by_admin IS NOT NULL;

-- 4. Vista para admin - lista de usuarios con estado de onboarding
CREATE OR REPLACE VIEW v_admin_users_list AS
SELECT 
    f.id,
    f.rfc,
    f.fiscal_name,
    f.trade_name,
    f.email,
    f.phone,
    f.type,
    f.status,
    f.email_verified,
    f.onboarding_completed,
    f.onboarding_completed_at,
    f.onboarding_step,
    f.requires_password_change,
    f.last_login_at,
    f.created_at,
    f.created_by_admin,
    f.invite_sent_at,
    f.invite_method,
    -- Datos bancarios completos?
    CASE 
        WHEN f.bank_clabe IS NOT NULL AND f.bank_name IS NOT NULL THEN true
        ELSE false
    END AS has_bank_info,
    -- Datos fiscales completos?
    CASE 
        WHEN f.rfc IS NOT NULL AND f.fiscal_name IS NOT NULL AND f.phone IS NOT NULL THEN true
        ELSE false
    END AS has_fiscal_info,
    -- Estado de autenticación
    CASE 
        WHEN f.locked_until IS NOT NULL AND f.locked_until > NOW() THEN 'locked'
        WHEN f.password_hash IS NULL AND f.email_verified = false THEN 'pending_setup'
        WHEN f.email_verified = false THEN 'pending_verification'
        WHEN f.onboarding_completed = false THEN 'pending_onboarding'
        ELSE 'active'
    END AS auth_status,
    -- Conteo de drivers (si es flotillero)
    (SELECT COUNT(*) FROM drivers d WHERE d.flotillero_id = f.id) AS drivers_count,
    -- Conteo de facturas
    (SELECT COUNT(*) FROM invoices i WHERE i.biller_id = f.id) AS invoices_count,
    -- Admin que lo creó
    (SELECT au.full_name FROM admin_users au WHERE au.id = f.created_by_admin) AS created_by_name
FROM flotilleros f;

-- 5. Función para obtener el siguiente paso de onboarding
CREATE OR REPLACE FUNCTION get_onboarding_next_step(p_flotillero_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_flotillero RECORD;
BEGIN
    SELECT 
        email_verified,
        bank_clabe,
        bank_name,
        rfc,
        fiscal_name,
        phone,
        address,
        requires_password_change,
        onboarding_completed
    INTO v_flotillero
    FROM flotilleros
    WHERE id = p_flotillero_id;
    
    IF v_flotillero IS NULL THEN
        RETURN 'not_found';
    END IF;
    
    IF v_flotillero.onboarding_completed THEN
        RETURN 'completed';
    END IF;
    
    -- Paso 1: Verificar email
    IF NOT v_flotillero.email_verified THEN
        RETURN 'verify_email';
    END IF;
    
    -- Paso 2: Datos bancarios
    IF v_flotillero.bank_clabe IS NULL OR v_flotillero.bank_name IS NULL THEN
        RETURN 'bank_info';
    END IF;
    
    -- Paso 3: Información de perfil completa
    IF v_flotillero.rfc IS NULL OR v_flotillero.fiscal_name IS NULL 
       OR v_flotillero.phone IS NULL OR v_flotillero.address IS NULL THEN
        RETURN 'profile_info';
    END IF;
    
    -- Paso 4: Cambio de contraseña (si es requerido)
    IF v_flotillero.requires_password_change THEN
        RETURN 'change_password';
    END IF;
    
    RETURN 'ready_to_complete';
END;
$$ LANGUAGE plpgsql;

-- 6. Función para marcar onboarding como completado
CREATE OR REPLACE FUNCTION complete_onboarding(p_flotillero_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_next_step VARCHAR;
BEGIN
    -- Verificar que todos los pasos estén completos
    v_next_step := get_onboarding_next_step(p_flotillero_id);
    
    IF v_next_step != 'ready_to_complete' AND v_next_step != 'completed' THEN
        RETURN false;
    END IF;
    
    -- Marcar como completado
    UPDATE flotilleros
    SET 
        onboarding_completed = true,
        onboarding_completed_at = NOW(),
        onboarding_step = 'completed',
        status = 'active'
    WHERE id = p_flotillero_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- 7. Comentarios
COMMENT ON COLUMN flotilleros.onboarding_completed IS 'Indica si el usuario completó el wizard de onboarding';
COMMENT ON COLUMN flotilleros.onboarding_step IS 'Paso actual del onboarding: pending, verify_email, bank_info, profile_info, change_password, completed';
COMMENT ON COLUMN flotilleros.requires_password_change IS 'Si true, el usuario debe cambiar su contraseña temporal';
COMMENT ON COLUMN flotilleros.created_by_admin IS 'ID del admin que creó este usuario';
COMMENT ON COLUMN flotilleros.invite_method IS 'Método de invitación: magic_link o temp_password';
COMMENT ON VIEW v_admin_users_list IS 'Vista para el panel admin con lista de usuarios y su estado de onboarding';
COMMENT ON FUNCTION get_onboarding_next_step IS 'Retorna el siguiente paso pendiente del onboarding para un usuario';
COMMENT ON FUNCTION complete_onboarding IS 'Marca el onboarding como completado si todos los pasos están completos';
