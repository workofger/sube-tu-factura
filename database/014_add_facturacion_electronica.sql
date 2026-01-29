-- Migration: 014_add_facturacion_electronica.sql
-- Description: Add electronic invoicing support for flotilleros using Facturapi
-- Date: January 2026

-- ============================================
-- FLOTILLEROS TABLE UPDATES
-- ============================================
-- Add fields for Facturapi integration and CSD management

ALTER TABLE flotilleros 
ADD COLUMN IF NOT EXISTS facturapi_organization_id VARCHAR(50);

ALTER TABLE flotilleros 
ADD COLUMN IF NOT EXISTS csd_uploaded_at TIMESTAMPTZ;

ALTER TABLE flotilleros 
ADD COLUMN IF NOT EXISTS csd_valid_until DATE;

ALTER TABLE flotilleros 
ADD COLUMN IF NOT EXISTS csd_serial_number VARCHAR(50);

ALTER TABLE flotilleros 
ADD COLUMN IF NOT EXISTS invoicing_enabled BOOLEAN DEFAULT false;

-- Comments
COMMENT ON COLUMN flotilleros.facturapi_organization_id IS 'Organization ID in Facturapi for this flotillero';
COMMENT ON COLUMN flotilleros.csd_uploaded_at IS 'Timestamp when CSD was uploaded';
COMMENT ON COLUMN flotilleros.csd_valid_until IS 'Expiration date of the CSD certificate';
COMMENT ON COLUMN flotilleros.csd_serial_number IS 'Serial number of the CSD certificate';
COMMENT ON COLUMN flotilleros.invoicing_enabled IS 'Whether this flotillero can issue invoices';

-- Index for invoicing-enabled flotilleros
CREATE INDEX IF NOT EXISTS idx_flotilleros_invoicing 
ON flotilleros(invoicing_enabled) 
WHERE invoicing_enabled = true;

-- ============================================
-- ISSUED INVOICES TABLE
-- ============================================
-- Track invoices issued by flotilleros through Facturapi

CREATE TABLE IF NOT EXISTS issued_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flotillero_id UUID NOT NULL REFERENCES flotilleros(id) ON DELETE CASCADE,
    
    -- Facturapi reference
    facturapi_invoice_id VARCHAR(50) NOT NULL,
    
    -- CFDI Type: I=Ingreso, E=Egreso, P=Pago
    cfdi_type VARCHAR(1) NOT NULL CHECK (cfdi_type IN ('I', 'E', 'P')),
    
    -- CFDI identification (populated after stamping)
    uuid VARCHAR(36) UNIQUE,
    folio VARCHAR(50),
    series VARCHAR(25),
    issue_date TIMESTAMPTZ NOT NULL,
    
    -- Issuer (same as flotillero fiscal data)
    issuer_rfc VARCHAR(13) NOT NULL,
    issuer_name VARCHAR(300) NOT NULL,
    
    -- Receiver
    receiver_rfc VARCHAR(13) NOT NULL,
    receiver_name VARCHAR(300),
    receiver_cfdi_use VARCHAR(10),
    
    -- Payment info
    payment_method VARCHAR(3),  -- PUE or PPD
    payment_form VARCHAR(2),    -- 01, 03, etc.
    
    -- Amounts
    subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
    total_tax DECIMAL(18,2) DEFAULT 0,
    total DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    
    -- Status: pending, stamped, cancelled, error
    status VARCHAR(20) DEFAULT 'pending',
    cancellation_date TIMESTAMPTZ,
    cancellation_motive VARCHAR(2),  -- 01, 02, 03, 04 (SAT motives)
    cancellation_uuid VARCHAR(36),   -- Replacement invoice UUID if motive 01
    error_message TEXT,
    
    -- File URLs (from Facturapi)
    xml_url TEXT,
    pdf_url TEXT,
    
    -- Relations to other invoices in system
    related_invoice_id UUID REFERENCES invoices(id),  -- Original invoice for credit notes
    related_issued_invoice_id UUID REFERENCES issued_invoices(id),  -- For payment complements
    
    -- CFDI relations (TipoRelacion + UUIDs)
    cfdi_relations JSONB,  -- [{tipoRelacion: "01", uuids: ["..."]}]
    
    -- Line items (stored as JSONB for flexibility)
    items JSONB NOT NULL DEFAULT '[]',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issued_invoices_flotillero ON issued_invoices(flotillero_id);
CREATE INDEX IF NOT EXISTS idx_issued_invoices_uuid ON issued_invoices(uuid) WHERE uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issued_invoices_status ON issued_invoices(status);
CREATE INDEX IF NOT EXISTS idx_issued_invoices_cfdi_type ON issued_invoices(cfdi_type);
CREATE INDEX IF NOT EXISTS idx_issued_invoices_receiver_rfc ON issued_invoices(receiver_rfc);
CREATE INDEX IF NOT EXISTS idx_issued_invoices_issue_date ON issued_invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_issued_invoices_facturapi ON issued_invoices(facturapi_invoice_id);

-- Comments
COMMENT ON TABLE issued_invoices IS 'Invoices issued by flotilleros through Facturapi';
COMMENT ON COLUMN issued_invoices.cfdi_type IS 'Type of CFDI: I=Ingreso, E=Egreso (credit note), P=Pago (payment complement)';
COMMENT ON COLUMN issued_invoices.facturapi_invoice_id IS 'Invoice ID in Facturapi system';
COMMENT ON COLUMN issued_invoices.status IS 'pending=created not stamped, stamped=valid CFDI, cancelled=cancelled, error=failed';
COMMENT ON COLUMN issued_invoices.cancellation_motive IS 'SAT cancellation motive: 01=with relation, 02=without relation, 03=not executed, 04=normative';
COMMENT ON COLUMN issued_invoices.related_invoice_id IS 'Reference to received invoice (for credit notes related to pronto pago)';
COMMENT ON COLUMN issued_invoices.cfdi_relations IS 'CFDI relations array: [{tipoRelacion, uuids}]';

-- Trigger for updated_at
CREATE TRIGGER update_issued_invoices_updated_at
    BEFORE UPDATE ON issued_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FACTURAPI WEBHOOK LOG
-- ============================================
-- Log webhook events from Facturapi for debugging

CREATE TABLE IF NOT EXISTS facturapi_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,  -- invoice.stamped, invoice.cancelled, etc.
    facturapi_invoice_id VARCHAR(50),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facturapi_webhooks_event ON facturapi_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_facturapi_webhooks_invoice ON facturapi_webhooks(facturapi_invoice_id);
CREATE INDEX IF NOT EXISTS idx_facturapi_webhooks_processed ON facturapi_webhooks(processed) WHERE processed = false;

COMMENT ON TABLE facturapi_webhooks IS 'Log of webhook events received from Facturapi';

-- ============================================
-- SYSTEM CONFIG UPDATE
-- ============================================
-- Add Facturapi configuration

INSERT INTO system_config (key, value, description, category, is_sensitive) VALUES
('facturapi_config', '{
    "environment": "test",
    "enabled": true,
    "default_series": "A",
    "pdf_logo_url": null,
    "pdf_color": "#FFD100"
}', 'Configuracion de Facturapi para emision de facturas', 'invoicing', false)
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();
