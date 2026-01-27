-- ============================================================================
-- MIGRACIÓN 011: Campos para Facturas Extemporáneas y Revisión de Proyectos
-- FacturaFlow AI - Lógica de negocio para facturación
-- ============================================================================

-- 1. Agregar campos para facturas extemporáneas
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS late_reason VARCHAR(50), -- 'after_deadline' | 'wrong_week'
ADD COLUMN IF NOT EXISTS late_acknowledged_at TIMESTAMPTZ;

-- 2. Agregar campo para revisión de proyecto
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS needs_project_review BOOLEAN DEFAULT false;

-- 3. Agregar campo para confianza del match de proyecto (0.0 - 1.0)
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS project_match_confidence DECIMAL(3,2);

-- 4. Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_invoices_is_late 
ON invoices(is_late) 
WHERE is_late = true;

CREATE INDEX IF NOT EXISTS idx_invoices_needs_review 
ON invoices(needs_project_review) 
WHERE needs_project_review = true;

-- 5. Agregar campo de keywords a proyectos para mejorar matching
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS keywords TEXT[], -- Array de palabras clave para matching
ADD COLUMN IF NOT EXISTS ai_description TEXT; -- Descripción extendida para IA

-- 6. Actualizar proyectos existentes con keywords
UPDATE projects SET 
  keywords = ARRAY['mercado libre', 'meli', 'mercado envios', 'ml'],
  ai_description = 'Entregas y servicios de logística para Mercado Libre y Mercado Envíos'
WHERE code = 'MERCADO_LIBRE';

UPDATE projects SET 
  keywords = ARRAY['amazon', 'amz', 'amazon logistics', 'prime'],
  ai_description = 'Entregas y servicios de logística para Amazon y Amazon Prime'
WHERE code = 'AMAZON';

UPDATE projects SET 
  keywords = ARRAY['rappi', 'rappi cargo', 'rappicargo'],
  ai_description = 'Entregas y servicios para Rappi y RappiCargo'
WHERE code = 'RAPPI';

UPDATE projects SET 
  keywords = ARRAY['dinamica', 'filmica', 'produccion', 'audiovisual'],
  ai_description = 'Servicios de transporte para producción audiovisual y cinematográfica'
WHERE code = 'DINAMICA_FILMICA';

UPDATE projects SET 
  keywords = ARRAY['home depot', 'homedepot', 'hd'],
  ai_description = 'Entregas y servicios de logística para Home Depot México'
WHERE code = 'HOME_DEPOT';

UPDATE projects SET 
  keywords = ARRAY['walmart', 'wm', 'walmart express'],
  ai_description = 'Entregas y servicios de logística para Walmart México'
WHERE code = 'WALMART';

-- 7. Vista para facturas que requieren revisión
CREATE OR REPLACE VIEW v_invoices_needs_review AS
SELECT 
    i.id,
    i.uuid,
    i.folio,
    i.issuer_rfc,
    i.issuer_name,
    i.total_amount,
    i.net_payment_amount,
    i.payment_week,
    i.payment_year,
    i.invoice_date,
    i.status,
    i.is_late,
    i.late_reason,
    i.needs_project_review,
    i.project_match_confidence,
    i.created_at,
    p.name AS project_name,
    p.code AS project_code
FROM invoices i
LEFT JOIN projects p ON i.project_id = p.id
WHERE i.needs_project_review = true
   OR i.project_id IS NULL
ORDER BY i.created_at DESC;

-- 8. Función para determinar si una factura es extemporánea
-- Basada en fecha de factura y deadline de Jueves 10am CDMX
CREATE OR REPLACE FUNCTION is_invoice_late(
    p_invoice_date DATE,
    p_upload_timestamp TIMESTAMPTZ DEFAULT NOW()
) RETURNS TABLE(
    is_late BOOLEAN,
    late_reason VARCHAR(50),
    payment_week INTEGER,
    payment_year INTEGER
) AS $$
DECLARE
    v_upload_mexico TIMESTAMPTZ;
    v_day_of_week INTEGER;
    v_hour INTEGER;
    v_is_after_deadline BOOLEAN;
    v_week_start DATE;
    v_week_end DATE;
    v_invoice_week_start DATE;
    v_invoice_week_end DATE;
    v_current_week INTEGER;
    v_current_year INTEGER;
    v_invoice_week INTEGER;
    v_is_wrong_week BOOLEAN;
BEGIN
    -- Convertir a hora de México
    v_upload_mexico := p_upload_timestamp AT TIME ZONE 'America/Mexico_City';
    v_day_of_week := EXTRACT(DOW FROM v_upload_mexico); -- 0=Domingo, 4=Jueves
    v_hour := EXTRACT(HOUR FROM v_upload_mexico);
    
    -- Verificar si es después del deadline (Jueves >= 10am)
    v_is_after_deadline := (v_day_of_week > 4) OR 
                           (v_day_of_week = 4 AND v_hour >= 10) OR
                           (v_day_of_week = 0); -- Domingo
    
    -- Calcular semana actual (ISO week)
    v_current_week := EXTRACT(WEEK FROM v_upload_mexico::DATE);
    v_current_year := EXTRACT(YEAR FROM v_upload_mexico::DATE);
    
    -- Calcular semana de la factura
    v_invoice_week := EXTRACT(WEEK FROM p_invoice_date);
    
    -- Calcular rango válido de facturación (Lun-Dom de semana anterior)
    v_week_start := v_upload_mexico::DATE - ((EXTRACT(DOW FROM v_upload_mexico)::INTEGER + 6) % 7 + 7);
    v_week_end := v_week_start + 6;
    
    -- Verificar si la fecha de factura está en el rango válido
    v_is_wrong_week := p_invoice_date < v_week_start OR p_invoice_date > v_week_end;
    
    -- Determinar resultado
    IF v_is_after_deadline THEN
        RETURN QUERY SELECT 
            true AS is_late,
            'after_deadline'::VARCHAR(50) AS late_reason,
            v_current_week AS payment_week,
            v_current_year AS payment_year;
    ELSIF v_is_wrong_week THEN
        RETURN QUERY SELECT 
            true AS is_late,
            'wrong_week'::VARCHAR(50) AS late_reason,
            v_current_week AS payment_week,
            v_current_year AS payment_year;
    ELSE
        RETURN QUERY SELECT 
            false AS is_late,
            NULL::VARCHAR(50) AS late_reason,
            v_current_week AS payment_week,
            v_current_year AS payment_year;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 9. Comentarios
COMMENT ON COLUMN invoices.is_late IS 'Indica si la factura fue subida fuera de tiempo (extemporánea)';
COMMENT ON COLUMN invoices.late_reason IS 'Razón de extemporaneidad: after_deadline o wrong_week';
COMMENT ON COLUMN invoices.late_acknowledged_at IS 'Timestamp cuando el usuario aceptó subir factura extemporánea';
COMMENT ON COLUMN invoices.needs_project_review IS 'Si true, el equipo debe revisar y asignar proyecto manualmente';
COMMENT ON COLUMN invoices.project_match_confidence IS 'Nivel de confianza del match automático de proyecto (0.0-1.0)';
COMMENT ON COLUMN projects.keywords IS 'Palabras clave para matching automático con conceptos de facturas';
COMMENT ON COLUMN projects.ai_description IS 'Descripción extendida para ayudar a la IA en el matching';
