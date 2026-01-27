-- ============================================================================
-- MIGRACIÓN 006: Agregar información bancaria a flotilleros
-- FacturaFlow AI - Soporte para exportación de pagos bancarios
-- ============================================================================

-- 1. Agregar campos bancarios a la tabla flotilleros
-- Estos campos son necesarios para generar el archivo de pagos XLSX
ALTER TABLE flotilleros
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS bank_clabe VARCHAR(18),
ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS bank_institution_id VARCHAR(50); -- ej: BBVA_MEXICO_MX

-- 2. Agregar constraint para CLABE válido (18 dígitos)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_flotillero_clabe'
    ) THEN
        ALTER TABLE flotilleros
        ADD CONSTRAINT valid_flotillero_clabe 
        CHECK (bank_clabe IS NULL OR LENGTH(bank_clabe) = 18);
    END IF;
END $$;

-- 3. Crear índice para búsqueda por CLABE
CREATE INDEX IF NOT EXISTS idx_flotilleros_bank_clabe ON flotilleros(bank_clabe)
WHERE bank_clabe IS NOT NULL;

-- 4. Comentarios para documentación
COMMENT ON COLUMN flotilleros.bank_name IS 'Nombre del banco (ej: BBVA, Santander, Banorte)';
COMMENT ON COLUMN flotilleros.bank_clabe IS 'CLABE interbancaria de 18 dígitos';
COMMENT ON COLUMN flotilleros.bank_account_number IS 'Número de cuenta bancaria';
COMMENT ON COLUMN flotilleros.bank_institution_id IS 'Identificador de la institución bancaria (ej: BBVA_MEXICO_MX)';

-- 5. Vista actualizada para consultas de pagos
CREATE OR REPLACE VIEW v_flotilleros_payment_info AS
SELECT 
    f.id,
    f.rfc,
    f.fiscal_name,
    f.email,
    f.phone,
    f.type,
    f.status,
    f.bank_name,
    f.bank_clabe,
    f.bank_account_number,
    f.bank_institution_id,
    -- Estadísticas de facturación
    COUNT(DISTINCT i.id) AS total_invoices,
    COALESCE(SUM(i.total_amount), 0) AS total_facturado,
    COALESCE(SUM(i.net_payment_amount), 0) AS total_neto_a_pagar
FROM flotilleros f
LEFT JOIN invoices i ON i.biller_id = f.id AND i.status IN ('approved', 'pending_payment', 'paid')
GROUP BY f.id, f.rfc, f.fiscal_name, f.email, f.phone, f.type, f.status,
         f.bank_name, f.bank_clabe, f.bank_account_number, f.bank_institution_id;

COMMENT ON VIEW v_flotilleros_payment_info IS 'Vista de flotilleros con información bancaria y estadísticas de facturación';
