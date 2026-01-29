-- Migration: 014_add_facturacion_electronica.sql
-- Description: Add electronic invoicing support for flotilleros using Facturapi
-- Date: January 2026

-- ============================================
-- EXTEND FLOTILLEROS TABLE
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

-- Index for Facturapi lookups
CREATE INDEX IF NOT EXISTS idx_flotilleros_facturapi_org 
ON flotilleros(facturapi_organization_id) 
WHERE facturapi_organization_id IS NOT NULL;

-- Index for invoicing enabled flotilleros
CREATE INDEX IF NOT EXISTS idx_flotilleros_invoicing_enabled 
ON flotilleros(id) 
WHERE invoicing_enabled = true;

COMMENT ON COLUMN flotilleros.facturapi_organization_id IS 'ID de la organizacion en Facturapi para emitir facturas';
COMMENT ON COLUMN flotilleros.csd_uploaded_at IS 'Fecha y hora de carga del CSD';
COMMENT ON COLUMN flotilleros.csd_valid_until IS 'Fecha de vigencia del certificado CSD';
COMMENT ON COLUMN flotilleros.csd_serial_number IS 'Numero de serie del certificado CSD';
COMMENT ON COLUMN flotilleros.invoicing_enabled IS 'Indica si el flotillero puede emitir facturas';

-- ============================================
-- CFDI TYPE ENUM
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cfdi_type') THEN
        CREATE TYPE cfdi_type AS ENUM (
            'I',  -- Ingreso (factura)
            'E',  -- Egreso (nota de credito)
            'P',  -- Pago (complemento de pago)
            'N',  -- Nomina
            'T'   -- Traslado
        );
    END IF;
END $$;

-- ============================================
-- ISSUED INVOICE STATUS ENUM
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'issued_invoice_status') THEN
        CREATE TYPE issued_invoice_status AS ENUM (
            'pending',      -- Pendiente de timbrado
            'stamped',      -- Timbrado exitosamente
            'cancelled',    -- Cancelado
            'error'         -- Error en timbrado
        );
    END IF;
END $$;

-- ============================================
-- ISSUED INVOICES TABLE
-- ============================================
-- Stores invoices issued by flotilleros through Facturapi

CREATE TABLE IF NOT EXISTS issued_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationship to flotillero
    flotillero_id UUID NOT NULL REFERENCES flotilleros(id) ON DELETE CASCADE,
    
    -- Facturapi reference
    facturapi_invoice_id VARCHAR(50) NOT NULL,
    
    -- CFDI Type
    cfdi_type cfdi_type NOT NULL,
    
    -- CFDI Identification (post-timbrado)
    uuid VARCHAR(36) UNIQUE,                    -- Folio fiscal
    folio VARCHAR(50),
    series VARCHAR(25),
    
    -- Dates
    issue_date TIMESTAMPTZ NOT NULL,
    certification_date TIMESTAMPTZ,
    
    -- Issuer (from flotillero)
    issuer_rfc VARCHAR(13) NOT NULL,
    issuer_name VARCHAR(300) NOT NULL,
    
    -- Receiver
    receiver_rfc VARCHAR(13) NOT NULL,
    receiver_name VARCHAR(300),
    receiver_cfdi_use VARCHAR(10),
    receiver_fiscal_regime VARCHAR(10),
    receiver_zip_code VARCHAR(5),
    
    -- Payment info
    payment_method VARCHAR(3),                  -- PUE, PPD
    payment_form VARCHAR(2),                    -- 03, 04, etc.
    
    -- Amounts
    subtotal DECIMAL(18,2) NOT NULL DEFAULT 0,
    discount DECIMAL(18,2) DEFAULT 0,
    total_tax DECIMAL(18,2) DEFAULT 0,
    total_retention DECIMAL(18,2) DEFAULT 0,
    total DECIMAL(18,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    
    -- Status
    status issued_invoice_status DEFAULT 'pending',
    error_message TEXT,
    
    -- Cancellation
    cancellation_date TIMESTAMPTZ,
    cancellation_reason VARCHAR(2),             -- SAT cancellation reason code
    cancellation_uuid VARCHAR(36),              -- UUID of replacement invoice
    
    -- Files (URLs from Facturapi)
    xml_url TEXT,
    pdf_url TEXT,
    
    -- Related documents
    related_invoice_id UUID REFERENCES invoices(id),      -- Original invoice (for NC)
    related_cfdi_uuids TEXT[],                            -- UUIDs of related CFDIs
    related_cfdi_type VARCHAR(2),                         -- Tipo de relacion SAT
    
    -- Metadata
    concepts JSONB,                                       -- Line items as JSON
    taxes JSONB,                                          -- Tax breakdown
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issued_invoices_flotillero ON issued_invoices(flotillero_id);
CREATE INDEX IF NOT EXISTS idx_issued_invoices_uuid ON issued_invoices(uuid) WHERE uuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_issued_invoices_status ON issued_invoices(status);
CREATE INDEX IF NOT EXISTS idx_issued_invoices_cfdi_type ON issued_invoices(cfdi_type);
CREATE INDEX IF NOT EXISTS idx_issued_invoices_receiver_rfc ON issued_invoices(receiver_rfc);
CREATE INDEX IF NOT EXISTS idx_issued_invoices_issue_date ON issued_invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_issued_invoices_facturapi ON issued_invoices(facturapi_invoice_id);

-- Comments
COMMENT ON TABLE issued_invoices IS 'Facturas emitidas por flotilleros a traves de Facturapi';
COMMENT ON COLUMN issued_invoices.cfdi_type IS 'Tipo de CFDI: I=Ingreso, E=Egreso, P=Pago, N=Nomina, T=Traslado';
COMMENT ON COLUMN issued_invoices.facturapi_invoice_id IS 'ID de la factura en Facturapi';
COMMENT ON COLUMN issued_invoices.related_invoice_id IS 'Factura original del sistema (para notas de credito de Pronto Pago)';
COMMENT ON COLUMN issued_invoices.related_cfdi_uuids IS 'UUIDs de CFDIs relacionados (para complementos de pago)';

-- ============================================
-- PAYMENT COMPLEMENTS TABLE
-- ============================================
-- Detail table for payment complements (CFDI tipo P)

CREATE TABLE IF NOT EXISTS payment_complement_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Parent issued invoice
    issued_invoice_id UUID NOT NULL REFERENCES issued_invoices(id) ON DELETE CASCADE,
    
    -- Payment info
    payment_date TIMESTAMPTZ NOT NULL,
    payment_form VARCHAR(2) NOT NULL,           -- FormaDePagoP
    currency VARCHAR(3) DEFAULT 'MXN',
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    amount DECIMAL(18,2) NOT NULL,
    
    -- Operation number (optional)
    operation_number VARCHAR(100),
    
    -- Related document info
    related_uuid VARCHAR(36) NOT NULL,          -- UUID del documento relacionado
    related_series VARCHAR(25),
    related_folio VARCHAR(50),
    payment_method VARCHAR(3) NOT NULL,         -- MetodoDePagoDR (PPD)
    partiality_number INTEGER NOT NULL,         -- NumParcialidad
    previous_balance DECIMAL(18,2) NOT NULL,    -- ImpSaldoAnt
    amount_paid DECIMAL(18,2) NOT NULL,         -- ImpPagado
    remaining_balance DECIMAL(18,2) NOT NULL,   -- ImpSaldoInsoluto
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_complement_invoice ON payment_complement_details(issued_invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_complement_related ON payment_complement_details(related_uuid);

COMMENT ON TABLE payment_complement_details IS 'Detalle de pagos para complementos de pago (CFDI tipo P)';

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE TRIGGER update_issued_invoices_updated_at
    BEFORE UPDATE ON issued_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SYSTEM CONFIG FOR FACTURAPI
-- ============================================
INSERT INTO system_config (key, value, description, category, is_sensitive)
VALUES (
    'facturapi_config',
    '{
        "environment": "test",
        "test_api_key_configured": false,
        "live_api_key_configured": false,
        "default_series": "A",
        "default_payment_form": "03",
        "default_cfdi_use": "G03",
        "issuing_enabled": false
    }',
    'Configuracion de integracion con Facturapi para emision de facturas',
    'invoicing',
    false
)
ON CONFLICT (key) DO NOTHING;
