-- ============================================================================
-- MIGRACIÓN 002: Agregar tabla flotilleros y modificar relaciones
-- FacturaFlow AI - Soporte para flotilleros y drivers asociados
-- ============================================================================

-- 1. Crear tipo enum para tipo de facturador (si no existe)
DO $$ BEGIN
    CREATE TYPE biller_type AS ENUM ('flotillero', 'independiente');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Crear tabla flotilleros
CREATE TABLE IF NOT EXISTS flotilleros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Información fiscal (quien factura)
    rfc VARCHAR(13) UNIQUE NOT NULL,
    fiscal_name VARCHAR(300) NOT NULL,
    trade_name VARCHAR(255),                    -- Nombre comercial (opcional)
    fiscal_regime_code VARCHAR(10),
    fiscal_zip_code VARCHAR(10),
    
    -- Contacto
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    
    -- Tipo y configuración
    type biller_type NOT NULL DEFAULT 'independiente',
    max_drivers INTEGER DEFAULT 1,              -- Límite de drivers (1 para independiente)
    
    -- Estado
    status driver_status DEFAULT 'active',
    is_verified BOOLEAN DEFAULT false,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Crear índices para flotilleros
CREATE INDEX IF NOT EXISTS idx_flotilleros_rfc ON flotilleros(rfc);
CREATE INDEX IF NOT EXISTS idx_flotilleros_type ON flotilleros(type);
CREATE INDEX IF NOT EXISTS idx_flotilleros_status ON flotilleros(status);

-- 4. Modificar tabla drivers para agregar relación con flotillero
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS flotillero_id UUID REFERENCES flotilleros(id) ON DELETE SET NULL;

-- Índice para buscar drivers por flotillero
CREATE INDEX IF NOT EXISTS idx_drivers_flotillero ON drivers(flotillero_id);

-- 5. Modificar tabla invoices para separar biller (quien factura) de driver (quien operó)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS biller_id UUID REFERENCES flotilleros(id),
ADD COLUMN IF NOT EXISTS operated_by_driver_id UUID REFERENCES drivers(id);

-- Índices para invoices
CREATE INDEX IF NOT EXISTS idx_invoices_biller ON invoices(biller_id);
CREATE INDEX IF NOT EXISTS idx_invoices_operated_by ON invoices(operated_by_driver_id);

-- 6. Migrar datos existentes: crear flotilleros a partir de drivers con RFC
INSERT INTO flotilleros (rfc, fiscal_name, fiscal_regime_code, fiscal_zip_code, email, phone, type, status)
SELECT DISTINCT 
    d.rfc,
    COALESCE(d.fiscal_name, CONCAT(d.first_name, ' ', d.last_name)),
    d.fiscal_regime_code,
    d.fiscal_zip_code,
    d.email,
    d.phone,
    'independiente'::biller_type,
    d.status
FROM drivers d
WHERE d.rfc IS NOT NULL
ON CONFLICT (rfc) DO NOTHING;

-- 7. Asociar drivers existentes a sus flotilleros (como independientes)
UPDATE drivers d
SET flotillero_id = f.id
FROM flotilleros f
WHERE d.rfc = f.rfc
AND d.flotillero_id IS NULL;

-- 8. Migrar invoices existentes para asociar biller_id
UPDATE invoices i
SET biller_id = f.id
FROM flotilleros f
JOIN drivers d ON d.rfc = f.rfc
WHERE i.driver_id = d.id
AND i.biller_id IS NULL;

-- 9. Crear vista útil para consultas de facturas con detalles completos
CREATE OR REPLACE VIEW v_invoice_details AS
SELECT 
    i.id,
    i.uuid,
    i.folio,
    i.series,
    i.invoice_date,
    i.subtotal,
    i.total_tax,
    i.total_amount,
    i.currency,
    i.payment_method,
    i.status AS invoice_status,
    i.created_at,
    -- Datos del facturador (flotillero o independiente)
    f.id AS biller_id,
    f.rfc AS biller_rfc,
    f.fiscal_name AS biller_name,
    f.type AS biller_type,
    f.email AS biller_email,
    -- Datos del driver que operó (si aplica)
    d.id AS operator_driver_id,
    CONCAT(d.first_name, ' ', d.last_name) AS operator_driver_name,
    d.curp AS operator_driver_curp,
    d.rfc AS operator_driver_rfc,
    -- Proyecto
    p.id AS project_id,
    p.name AS project_name,
    p.code AS project_code
FROM invoices i
LEFT JOIN flotilleros f ON i.biller_id = f.id
LEFT JOIN drivers d ON i.operated_by_driver_id = d.id
LEFT JOIN projects p ON i.project_id = p.id;

-- 10. Crear vista de flotilleros con sus drivers
CREATE OR REPLACE VIEW v_flotilleros_drivers AS
SELECT 
    f.id AS flotillero_id,
    f.rfc AS flotillero_rfc,
    f.fiscal_name AS flotillero_name,
    f.type AS flotillero_type,
    f.status AS flotillero_status,
    COUNT(DISTINCT d.id) AS total_drivers,
    COUNT(DISTINCT i.id) AS total_invoices,
    COALESCE(SUM(i.total_amount), 0) AS total_facturado
FROM flotilleros f
LEFT JOIN drivers d ON d.flotillero_id = f.id
LEFT JOIN invoices i ON i.biller_id = f.id
GROUP BY f.id, f.rfc, f.fiscal_name, f.type, f.status;

-- 11. Trigger para actualizar updated_at en flotilleros
CREATE OR REPLACE FUNCTION update_flotillero_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flotilleros_updated_at ON flotilleros;
CREATE TRIGGER trg_flotilleros_updated_at
BEFORE UPDATE ON flotilleros
FOR EACH ROW
EXECUTE FUNCTION update_flotillero_timestamp();

-- 12. Función para validar que driver pertenece al flotillero que factura
CREATE OR REPLACE FUNCTION validate_invoice_driver_flotillero()
RETURNS TRIGGER AS $$
BEGIN
    -- Si hay driver operador, verificar que pertenece al biller
    IF NEW.operated_by_driver_id IS NOT NULL AND NEW.biller_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM drivers d 
            WHERE d.id = NEW.operated_by_driver_id 
            AND d.flotillero_id = NEW.biller_id
        ) THEN
            RAISE EXCEPTION 'El driver operador no pertenece a este flotillero/facturador';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_invoice_driver ON invoices;
CREATE TRIGGER trg_validate_invoice_driver
BEFORE INSERT OR UPDATE ON invoices
FOR EACH ROW
EXECUTE FUNCTION validate_invoice_driver_flotillero();

-- 13. Comentarios para documentación
COMMENT ON TABLE flotilleros IS 'Entidades que pueden emitir facturas: flotilleros (con múltiples drivers) o independientes';
COMMENT ON COLUMN flotilleros.type IS 'flotillero: puede tener múltiples drivers asociados. independiente: driver que factura por sí mismo';
COMMENT ON COLUMN flotilleros.max_drivers IS 'Límite de drivers que puede tener asociados (1 para independientes)';
COMMENT ON COLUMN drivers.flotillero_id IS 'Flotillero al que pertenece el driver. NULL si es independiente';
COMMENT ON COLUMN invoices.biller_id IS 'Flotillero o independiente que emite la factura';
COMMENT ON COLUMN invoices.operated_by_driver_id IS 'Driver que realizó el trabajo/entrega (opcional)';
