-- ============================================================================
-- MIGRACIÓN 003: Agregar soporte para Pronto Pago
-- FacturaFlow AI - Programa de pago anticipado con costo financiero
-- ============================================================================

-- 1. Crear tipo enum para programa de pago
DO $$ BEGIN
    CREATE TYPE payment_program AS ENUM ('standard', 'pronto_pago');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Agregar campos a tabla invoices para Pronto Pago
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_program payment_program DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS pronto_pago_fee_rate DECIMAL(5,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pronto_pago_fee_amount DECIMAL(18,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS net_payment_amount DECIMAL(18,2),
ADD COLUMN IF NOT EXISTS scheduled_payment_date DATE;

-- 3. Comentarios para documentación
COMMENT ON COLUMN invoices.payment_program IS 'Programa de pago seleccionado: standard (semana siguiente) o pronto_pago (inmediato con descuento)';
COMMENT ON COLUMN invoices.pronto_pago_fee_rate IS 'Tasa de costo financiero para pronto pago (ej: 0.08 = 8%)';
COMMENT ON COLUMN invoices.pronto_pago_fee_amount IS 'Monto del costo financiero calculado (total_amount * fee_rate)';
COMMENT ON COLUMN invoices.net_payment_amount IS 'Monto neto a pagar al emisor (total_amount - pronto_pago_fee_amount)';
COMMENT ON COLUMN invoices.scheduled_payment_date IS 'Fecha programada para el pago';

-- 4. Índice para consultas por programa de pago
CREATE INDEX IF NOT EXISTS idx_invoices_payment_program ON invoices(payment_program);
CREATE INDEX IF NOT EXISTS idx_invoices_scheduled_payment ON invoices(scheduled_payment_date);

-- 5. Función para calcular montos de Pronto Pago
CREATE OR REPLACE FUNCTION calculate_pronto_pago_amounts()
RETURNS TRIGGER AS $$
DECLARE
    fee_rate DECIMAL(5,4);
    next_monday DATE;
BEGIN
    -- Determinar tasa según programa
    IF NEW.payment_program = 'pronto_pago' THEN
        fee_rate := COALESCE(NEW.pronto_pago_fee_rate, 0.08); -- Default 8%
        NEW.pronto_pago_fee_rate := fee_rate;
        NEW.pronto_pago_fee_amount := ROUND(NEW.total_amount * fee_rate, 2);
        NEW.net_payment_amount := NEW.total_amount - NEW.pronto_pago_fee_amount;
        
        -- Fecha de pago: siguiente día hábil (simplificado: mañana si no es fin de semana)
        IF EXTRACT(DOW FROM CURRENT_DATE) = 5 THEN -- Viernes
            NEW.scheduled_payment_date := CURRENT_DATE + INTERVAL '3 days';
        ELSIF EXTRACT(DOW FROM CURRENT_DATE) = 6 THEN -- Sábado
            NEW.scheduled_payment_date := CURRENT_DATE + INTERVAL '2 days';
        ELSE
            NEW.scheduled_payment_date := CURRENT_DATE + INTERVAL '1 day';
        END IF;
    ELSE
        -- Pago estándar: sin costo financiero
        NEW.pronto_pago_fee_rate := 0;
        NEW.pronto_pago_fee_amount := 0;
        NEW.net_payment_amount := NEW.total_amount;
        
        -- Fecha de pago: lunes de la semana siguiente
        next_monday := CURRENT_DATE + (7 - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER + 1) * INTERVAL '1 day';
        NEW.scheduled_payment_date := next_monday;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger para calcular automáticamente los montos
DROP TRIGGER IF EXISTS trg_calculate_pronto_pago ON invoices;
CREATE TRIGGER trg_calculate_pronto_pago
BEFORE INSERT OR UPDATE OF payment_program, total_amount ON invoices
FOR EACH ROW
EXECUTE FUNCTION calculate_pronto_pago_amounts();

-- 7. Migrar facturas existentes (calcular net_payment_amount)
UPDATE invoices 
SET 
    payment_program = 'standard',
    pronto_pago_fee_rate = 0,
    pronto_pago_fee_amount = 0,
    net_payment_amount = total_amount
WHERE net_payment_amount IS NULL;

-- 8. Vista actualizada para incluir información de Pronto Pago
CREATE OR REPLACE VIEW v_invoices_with_payment_info AS
SELECT 
    i.*,
    CASE 
        WHEN i.payment_program = 'pronto_pago' THEN 'Pronto Pago (8%)'
        ELSE 'Pago Estándar'
    END AS payment_program_display,
    f.fiscal_name AS biller_name,
    f.rfc AS biller_rfc,
    p.name AS project_name,
    p.code AS project_code
FROM invoices i
LEFT JOIN flotilleros f ON i.biller_id = f.id
LEFT JOIN projects p ON i.project_id = p.id;

-- 9. Vista de resumen por programa de pago
CREATE OR REPLACE VIEW v_payment_program_summary AS
SELECT 
    payment_year,
    payment_week,
    payment_program,
    COUNT(*) AS total_invoices,
    SUM(total_amount) AS total_facturado,
    SUM(pronto_pago_fee_amount) AS total_fees,
    SUM(net_payment_amount) AS total_a_pagar
FROM invoices
WHERE status NOT IN ('cancelled', 'rejected')
GROUP BY payment_year, payment_week, payment_program
ORDER BY payment_year DESC, payment_week DESC, payment_program;

-- ============================================================================
-- FIN DE LA MIGRACIÓN 003
-- ============================================================================
