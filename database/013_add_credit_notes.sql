-- Migration: 013_add_credit_notes.sql
-- Description: Add credit notes support for Pronto Pago program
-- Date: January 2026

-- ============================================
-- CREDIT NOTES TABLE
-- ============================================
-- Stores credit notes (CFDI tipo E - Egreso) associated with invoices
-- Required for Pronto Pago to document the financial cost discount

CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relationship to invoice
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Credit note identifiers (from CFDI)
    uuid VARCHAR(36) UNIQUE NOT NULL,           -- Folio fiscal de la nota de crédito
    folio VARCHAR(50),                          -- Folio interno
    series VARCHAR(25),                         -- Serie
    
    -- Related invoice reference
    related_uuid VARCHAR(36) NOT NULL,          -- UUID del CFDI relacionado (factura principal)
    tipo_relacion VARCHAR(2) DEFAULT '01',      -- 01 = Nota de crédito de los documentos relacionados
    
    -- Issuer (same as invoice issuer)
    issuer_rfc VARCHAR(13) NOT NULL,
    issuer_name VARCHAR(300),
    
    -- Amounts
    subtotal DECIMAL(18,2) NOT NULL,
    total_tax DECIMAL(18,2) DEFAULT 0,
    total_amount DECIMAL(18,2) NOT NULL,        -- Should match pronto_pago_fee_amount
    currency VARCHAR(3) DEFAULT 'MXN',
    
    -- Dates
    issue_date DATE NOT NULL,
    certification_date TIMESTAMPTZ,
    
    -- Validation status
    is_valid BOOLEAN DEFAULT true,
    validation_errors TEXT[],                   -- Array of validation error messages
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_credit_notes_invoice ON credit_notes(invoice_id);
CREATE INDEX idx_credit_notes_uuid ON credit_notes(uuid);
CREATE INDEX idx_credit_notes_related_uuid ON credit_notes(related_uuid);
CREATE INDEX idx_credit_notes_issuer_rfc ON credit_notes(issuer_rfc);

-- Comments
COMMENT ON TABLE credit_notes IS 'Notas de crédito (CFDI tipo E) para documentar descuentos de Pronto Pago';
COMMENT ON COLUMN credit_notes.uuid IS 'UUID/Folio fiscal de la nota de crédito';
COMMENT ON COLUMN credit_notes.related_uuid IS 'UUID del CFDI de ingreso (factura) al que está relacionada';
COMMENT ON COLUMN credit_notes.tipo_relacion IS 'Tipo de relación SAT: 01=Nota de crédito de los documentos relacionados';
COMMENT ON COLUMN credit_notes.total_amount IS 'Monto total de la nota de crédito (debe coincidir con el costo financiero)';

-- ============================================
-- UPDATE INVOICE_FILES TABLE
-- ============================================
-- Add file types for credit note XML and PDF

-- The file_type column uses a CHECK constraint, we need to update it
-- First, drop the existing constraint if it exists
DO $$
BEGIN
    ALTER TABLE invoice_files DROP CONSTRAINT IF EXISTS invoice_files_file_type_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Add new constraint with credit note types
ALTER TABLE invoice_files 
ADD CONSTRAINT invoice_files_file_type_check 
CHECK (file_type IN ('xml', 'pdf', 'credit_note_xml', 'credit_note_pdf'));

-- Add credit_note_id column to link credit note files
ALTER TABLE invoice_files 
ADD COLUMN IF NOT EXISTS credit_note_id UUID REFERENCES credit_notes(id) ON DELETE CASCADE;

-- Index for credit note files
CREATE INDEX IF NOT EXISTS idx_invoice_files_credit_note ON invoice_files(credit_note_id) 
WHERE credit_note_id IS NOT NULL;

COMMENT ON COLUMN invoice_files.credit_note_id IS 'Reference to credit note if this file belongs to a credit note';

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE TRIGGER update_credit_notes_updated_at
    BEFORE UPDATE ON credit_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
