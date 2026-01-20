-- ============================================================================
-- FACTURAFLOW AI - SCHEMA INICIAL
-- Base de datos para gestión de facturas CFDI y pagos a drivers
-- Motor: PostgreSQL (Supabase)
-- Versión: 1.0.0
-- ============================================================================

-- Habilitar extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- TIPOS ENUM
-- ============================================================================

CREATE TYPE invoice_status AS ENUM (
    'pending_review',
    'approved',
    'rejected',
    'pending_payment',
    'partial_payment',
    'paid',
    'cancelled'
);

CREATE TYPE payment_status AS ENUM (
    'scheduled',
    'processing',
    'completed',
    'failed',
    'cancelled',
    'refunded'
);

CREATE TYPE cfdi_payment_method AS ENUM ('PUE', 'PPD');

CREATE TYPE driver_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'pending_verification'
);

CREATE TYPE document_type AS ENUM (
    'ine',
    'license',
    'proof_address',
    'rfc_constancia',
    'bank_account',
    'other'
);

-- ============================================================================
-- TABLAS DE CATÁLOGOS
-- ============================================================================

-- Proyectos
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO projects (code, name) VALUES
    ('MERCADO_LIBRE', 'Mercado Libre'),
    ('AMAZON', 'Amazon'),
    ('WALMART', 'Walmart'),
    ('SHOPIFY', 'Shopify'),
    ('OTHER', 'Otro');

-- Regímenes Fiscales
CREATE TABLE fiscal_regimes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    applies_to VARCHAR(20) CHECK (applies_to IN ('fisica', 'moral', 'ambos')),
    is_active BOOLEAN DEFAULT true
);

INSERT INTO fiscal_regimes (code, name, applies_to) VALUES
    ('601', 'General de Ley Personas Morales', 'moral'),
    ('603', 'Personas Morales con Fines no Lucrativos', 'moral'),
    ('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', 'fisica'),
    ('606', 'Arrendamiento', 'fisica'),
    ('608', 'Demás ingresos', 'fisica'),
    ('612', 'Personas Físicas con Actividades Empresariales y Profesionales', 'fisica'),
    ('620', 'Sociedades Cooperativas de Producción', 'moral'),
    ('621', 'Incorporación Fiscal', 'fisica'),
    ('625', 'Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', 'fisica'),
    ('626', 'Régimen Simplificado de Confianza', 'ambos');

-- Formas de Pago
CREATE TABLE payment_forms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    is_active BOOLEAN DEFAULT true
);

INSERT INTO payment_forms (code, name) VALUES
    ('01', 'Efectivo'),
    ('02', 'Cheque nominativo'),
    ('03', 'Transferencia electrónica de fondos'),
    ('04', 'Tarjeta de crédito'),
    ('28', 'Tarjeta de débito'),
    ('99', 'Por definir');

-- Uso CFDI
CREATE TABLE cfdi_uses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    applies_to VARCHAR(20) CHECK (applies_to IN ('fisica', 'moral', 'ambos')),
    is_active BOOLEAN DEFAULT true
);

INSERT INTO cfdi_uses (code, name, applies_to) VALUES
    ('G01', 'Adquisición de mercancías', 'ambos'),
    ('G02', 'Devoluciones, descuentos o bonificaciones', 'ambos'),
    ('G03', 'Gastos en general', 'ambos'),
    ('I01', 'Construcciones', 'ambos'),
    ('I03', 'Equipo de transporte', 'ambos'),
    ('S01', 'Sin efectos fiscales', 'ambos'),
    ('CP01', 'Pagos', 'ambos');

-- ============================================================================
-- TABLA DE DRIVERS
-- ============================================================================

CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Información personal
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    
    -- Información fiscal
    rfc VARCHAR(13) UNIQUE NOT NULL,
    curp VARCHAR(18),
    fiscal_name VARCHAR(300),
    fiscal_regime_code VARCHAR(10) REFERENCES fiscal_regimes(code),
    fiscal_zip_code VARCHAR(5),
    
    -- Información bancaria
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(20),
    bank_clabe VARCHAR(18),
    
    -- Estado
    status driver_status DEFAULT 'pending_verification',
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMPTZ,
    verified_by UUID,
    
    -- Proyecto
    primary_project_id UUID REFERENCES projects(id),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    
    CONSTRAINT valid_rfc CHECK (LENGTH(rfc) IN (12, 13)),
    CONSTRAINT valid_clabe CHECK (bank_clabe IS NULL OR LENGTH(bank_clabe) = 18)
);

-- Documentos del driver
CREATE TABLE driver_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    document_type document_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    rejection_reason TEXT,
    expiration_date DATE,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(driver_id, document_type)
);

-- ============================================================================
-- TABLA DE FACTURAS
-- ============================================================================

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relaciones
    driver_id UUID NOT NULL REFERENCES drivers(id),
    project_id UUID REFERENCES projects(id),
    
    -- Identificadores CFDI
    uuid VARCHAR(36) UNIQUE NOT NULL,
    folio VARCHAR(50),
    series VARCHAR(25),
    
    -- Fechas
    invoice_date DATE NOT NULL,
    certification_date TIMESTAMPTZ,
    sat_cert_number VARCHAR(50),
    
    -- Emisor
    issuer_rfc VARCHAR(13) NOT NULL,
    issuer_name VARCHAR(300) NOT NULL,
    issuer_regime VARCHAR(10),
    issuer_zip_code VARCHAR(5),
    
    -- Receptor
    receiver_rfc VARCHAR(13) NOT NULL,
    receiver_name VARCHAR(300),
    receiver_regime VARCHAR(10),
    receiver_zip_code VARCHAR(5),
    cfdi_use VARCHAR(10),
    
    -- Pago
    payment_method cfdi_payment_method NOT NULL,
    payment_form VARCHAR(10),
    payment_conditions TEXT,
    
    -- Montos
    subtotal DECIMAL(18,2) NOT NULL,
    total_tax DECIMAL(18,2) DEFAULT 0,
    retention_iva DECIMAL(18,2) DEFAULT 0,
    retention_iva_rate DECIMAL(8,6) DEFAULT 0,
    retention_isr DECIMAL(18,2) DEFAULT 0,
    retention_isr_rate DECIMAL(8,6) DEFAULT 0,
    total_amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    
    -- Semana
    payment_week INTEGER,
    payment_year INTEGER,
    
    -- Estado
    status invoice_status DEFAULT 'pending_review',
    notes TEXT,
    rejection_reason TEXT,
    
    -- Contacto
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    
    -- Metadata
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_amounts CHECK (total_amount >= 0 AND subtotal >= 0),
    CONSTRAINT valid_week CHECK (payment_week IS NULL OR (payment_week >= 1 AND payment_week <= 53))
);

-- Conceptos de factura
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(18,6) NOT NULL DEFAULT 1,
    unit VARCHAR(50),
    unit_name VARCHAR(100),
    unit_price DECIMAL(18,6) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    product_key VARCHAR(10),
    tax_object VARCHAR(5),
    tax_base DECIMAL(18,2),
    tax_amount DECIMAL(18,2),
    retention_amount DECIMAL(18,2),
    line_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Archivos de factura
CREATE TABLE invoice_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('xml', 'pdf')),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),
    google_drive_id VARCHAR(100),
    google_drive_url TEXT,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(invoice_id, file_type)
);

-- ============================================================================
-- TABLA DE PAGOS
-- ============================================================================

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_reference VARCHAR(50) UNIQUE,
    payment_week INTEGER NOT NULL,
    payment_year INTEGER NOT NULL,
    driver_id UUID NOT NULL REFERENCES drivers(id),
    project_id UUID REFERENCES projects(id),
    total_invoices INTEGER DEFAULT 0,
    gross_amount DECIMAL(18,2) NOT NULL,
    total_retentions DECIMAL(18,2) DEFAULT 0,
    net_amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    status payment_status DEFAULT 'scheduled',
    scheduled_date DATE,
    processed_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    bank_name VARCHAR(100),
    bank_clabe VARCHAR(18),
    bank_reference VARCHAR(100),
    bank_transaction_id VARCHAR(100),
    notes TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    processed_by UUID,
    UNIQUE(driver_id, payment_week, payment_year)
);

-- Relación pagos-facturas
CREATE TABLE payment_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    amount DECIMAL(18,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(payment_id, invoice_id)
);

-- Historial de pagos
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    previous_status payment_status,
    new_status payment_status NOT NULL,
    changed_by UUID,
    changed_by_name VARCHAR(200),
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLA DE AUDITORÍA
-- ============================================================================

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    user_id UUID,
    user_email VARCHAR(255),
    user_ip VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX idx_invoices_driver ON invoices(driver_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_payment_week ON invoices(payment_year, payment_week);
CREATE INDEX idx_invoices_uuid ON invoices(uuid);
CREATE INDEX idx_invoices_issuer_rfc ON invoices(issuer_rfc);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_files_invoice ON invoice_files(invoice_id);
CREATE INDEX idx_payments_driver ON payments(driver_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_week ON payments(payment_year, payment_week);
CREATE INDEX idx_payment_invoices_payment ON payment_invoices(payment_id);
CREATE INDEX idx_payment_invoices_invoice ON payment_invoices(invoice_id);
CREATE INDEX idx_payment_history_payment ON payment_history(payment_id);
CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);

-- Índices para búsqueda full-text
CREATE INDEX idx_invoice_items_description_trgm ON invoice_items USING gin (description gin_trgm_ops);
CREATE INDEX idx_drivers_name_trgm ON drivers USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

-- Actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generar referencia de pago
CREATE OR REPLACE FUNCTION generate_payment_reference()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_reference IS NULL THEN
        NEW.payment_reference = 'PAY-' || 
            TO_CHAR(NEW.payment_year, 'FM0000') || '-' ||
            TO_CHAR(NEW.payment_week, 'FM00') || '-' ||
            SUBSTRING(NEW.id::TEXT FROM 1 FOR 8);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_payment_ref BEFORE INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION generate_payment_reference();

-- Registrar historial de pagos
CREATE OR REPLACE FUNCTION log_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO payment_history (payment_id, previous_status, new_status, changed_by, metadata)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.processed_by,
            jsonb_build_object('previous_amount', OLD.net_amount, 'new_amount', NEW.net_amount));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_payment_changes AFTER UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_payment_status_change();

-- Actualizar facturas al completar pago
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE invoices SET status = 'paid', updated_at = NOW()
        WHERE id IN (SELECT invoice_id FROM payment_invoices WHERE payment_id = NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_on_payment AFTER UPDATE ON payments
    FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_invoice_on_payment();

-- ============================================================================
-- VISTAS
-- ============================================================================

CREATE OR REPLACE VIEW v_invoices_detail AS
SELECT 
    i.*,
    d.first_name || ' ' || d.last_name AS driver_name,
    d.rfc AS driver_rfc,
    d.email AS driver_email,
    p.name AS project_name,
    fr.name AS issuer_regime_name
FROM invoices i
LEFT JOIN drivers d ON i.driver_id = d.id
LEFT JOIN projects p ON i.project_id = p.id
LEFT JOIN fiscal_regimes fr ON i.issuer_regime = fr.code;

CREATE OR REPLACE VIEW v_invoices_pending_payment AS
SELECT 
    i.id, i.uuid, i.invoice_date, i.issuer_name, i.total_amount,
    i.payment_week, i.payment_year, i.status,
    d.id AS driver_id,
    d.first_name || ' ' || d.last_name AS driver_name,
    d.rfc AS driver_rfc, d.bank_clabe,
    p.name AS project_name,
    i.submitted_at,
    EXTRACT(DAY FROM NOW() - i.submitted_at) AS days_pending
FROM invoices i
JOIN drivers d ON i.driver_id = d.id
LEFT JOIN projects p ON i.project_id = p.id
WHERE i.status IN ('approved', 'pending_payment')
ORDER BY i.payment_year, i.payment_week, i.submitted_at;

CREATE OR REPLACE VIEW v_payment_summary_by_week AS
SELECT 
    payment_year, payment_week, project_id, p.name AS project_name,
    COUNT(DISTINCT pay.driver_id) AS total_drivers,
    COUNT(*) AS total_payments,
    SUM(CASE WHEN pay.status = 'completed' THEN 1 ELSE 0 END) AS completed_payments,
    SUM(gross_amount) AS total_gross,
    SUM(total_retentions) AS total_retentions,
    SUM(net_amount) AS total_net
FROM payments pay
LEFT JOIN projects p ON pay.project_id = p.id
GROUP BY payment_year, payment_week, project_id, p.name;

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
