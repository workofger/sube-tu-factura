-- ============================================================================
-- MIGRACIÓN 007: Tabla de configuración del sistema
-- FacturaFlow AI - Configuraciones globales administrables
-- ============================================================================

-- 1. Crear tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    is_sensitive BOOLEAN DEFAULT false,  -- Para ocultar valores sensibles en UI
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES admin_users(id)
);

-- 2. Crear índice por categoría
CREATE INDEX IF NOT EXISTS idx_system_config_category ON system_config(category);

-- 3. Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_system_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_system_config_updated_at ON system_config;
CREATE TRIGGER trg_system_config_updated_at
BEFORE UPDATE ON system_config
FOR EACH ROW
EXECUTE FUNCTION update_system_config_timestamp();

-- 4. Insertar configuraciones iniciales

-- 4.1 Cuenta origen para pagos
INSERT INTO system_config (key, value, description, category) VALUES
('payment_source_account', '{
    "account_number": "012180001182078281",
    "institution_id": "BBVA_MEXICO_MX",
    "institution_name": "BBVA Mexico",
    "account_type": "clabe"
}', 'Cuenta bancaria origen para dispersión de pagos a drivers', 'payments')
ON CONFLICT (key) DO NOTHING;

-- 4.2 Configuración de Pronto Pago
INSERT INTO system_config (key, value, description, category) VALUES
('pronto_pago_config', '{
    "fee_rate": 0.08,
    "processing_days": 1,
    "enabled": true
}', 'Configuración del programa Pronto Pago', 'payments')
ON CONFLICT (key) DO NOTHING;

-- 4.3 Configuración de semanas de pago
INSERT INTO system_config (key, value, description, category) VALUES
('payment_week_config', '{
    "allowed_weeks_behind": 3,
    "payment_day": "monday",
    "cutoff_day": "friday"
}', 'Configuración de ventanas de pago por semana', 'payments')
ON CONFLICT (key) DO NOTHING;

-- 4.4 Configuración de exportación
INSERT INTO system_config (key, value, description, category) VALUES
('export_config', '{
    "xlsx_template": "shinkansen",
    "include_pending": false,
    "default_currency": "MXN"
}', 'Configuración para exportación de archivos de pago', 'export')
ON CONFLICT (key) DO NOTHING;

-- 4.5 Configuración de notificaciones (para futuro)
INSERT INTO system_config (key, value, description, category) VALUES
('notification_config', '{
    "email_enabled": false,
    "whatsapp_enabled": false,
    "notify_on_payment": true,
    "notify_on_rejection": true
}', 'Configuración de notificaciones a usuarios', 'notifications')
ON CONFLICT (key) DO NOTHING;

-- 5. Función helper para obtener configuración
CREATE OR REPLACE FUNCTION get_system_config(config_key VARCHAR)
RETURNS JSONB AS $$
DECLARE
    config_value JSONB;
BEGIN
    SELECT value INTO config_value
    FROM system_config
    WHERE key = config_key;
    
    RETURN config_value;
END;
$$ LANGUAGE plpgsql;

-- 6. Función helper para actualizar configuración
CREATE OR REPLACE FUNCTION set_system_config(
    config_key VARCHAR,
    config_value JSONB,
    admin_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE system_config
    SET value = config_value,
        updated_by = admin_id,
        updated_at = NOW()
    WHERE key = config_key;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 7. Comentarios
COMMENT ON TABLE system_config IS 'Configuraciones globales del sistema administrables desde el panel de admin';
COMMENT ON COLUMN system_config.key IS 'Identificador único de la configuración';
COMMENT ON COLUMN system_config.value IS 'Valor de la configuración en formato JSON';
COMMENT ON COLUMN system_config.category IS 'Categoría para agrupar configuraciones (payments, export, notifications, etc)';
COMMENT ON COLUMN system_config.is_sensitive IS 'Indica si el valor debe ocultarse en la UI';
