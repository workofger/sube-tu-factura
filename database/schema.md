# 📊 Base de Datos - Sistema de Gestión de Facturas CFDI

> **Motor:** PostgreSQL (Supabase)  
> **Versión:** 1.0.0  
> **Fecha:** Enero 2026

---

## 🏗️ Arquitectura de la Base de Datos

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SISTEMA DE FACTURAS CFDI                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐    │
│  │   drivers    │────▶│   invoices   │────▶│     invoice_items        │    │
│  │  (Repartidores)    │  (Facturas)  │     │     (Conceptos)          │    │
│  └──────────────┘     └──────────────┘     └──────────────────────────┘    │
│         │                    │                                              │
│         │                    ▼                                              │
│         │             ┌──────────────┐     ┌──────────────────────────┐    │
│         │             │   payments   │────▶│    payment_history       │    │
│         │             │   (Pagos)    │     │    (Historial)           │    │
│         │             └──────────────┘     └──────────────────────────┘    │
│         │                    │                                              │
│         ▼                    ▼                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐    │
│  │driver_documents│   │invoice_files │     │     audit_log            │    │
│  │ (Documentos)  │    │ (Archivos)   │     │     (Auditoría)          │    │
│  └──────────────┘     └──────────────┘     └──────────────────────────┘    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        CATÁLOGOS (ENUMS/LOOKUP)                      │   │
│  │  projects │ fiscal_regimes │ payment_methods │ invoice_status       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Índice

1. [Extensiones y Configuración](#1-extensiones-y-configuración)
2. [Tipos ENUM](#2-tipos-enum)
3. [Tablas de Catálogos](#3-tablas-de-catálogos)
4. [Tabla de Drivers](#4-tabla-de-drivers)
5. [Tabla de Facturas](#5-tabla-de-facturas-invoices)
6. [Tabla de Conceptos](#6-tabla-de-conceptos-invoice_items)
7. [Tabla de Archivos](#7-tabla-de-archivos-invoice_files)
8. [Tabla de Pagos](#8-tabla-de-pagos-payments)
9. [Tabla de Historial de Pagos](#9-tabla-de-historial-payment_history)
10. [Tabla de Auditoría](#10-tabla-de-auditoría-audit_log)
11. [Índices](#11-índices)
12. [Funciones y Triggers](#12-funciones-y-triggers)
13. [Vistas](#13-vistas)
14. [Row Level Security (RLS)](#14-row-level-security-rls)
15. [Queries de Ejemplo](#15-queries-de-ejemplo)

---

## 1. Extensiones y Configuración

```sql
-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Para encriptación
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Para búsqueda por similitud

-- Configurar timezone
SET timezone = 'America/Mexico_City';
```

---

## 2. Tipos ENUM

```sql
-- Estado de la factura en el sistema
CREATE TYPE invoice_status AS ENUM (
    'pending_review',      -- Pendiente de revisión
    'approved',            -- Aprobada
    'rejected',            -- Rechazada
    'pending_payment',     -- Pendiente de pago
    'partial_payment',     -- Pago parcial
    'paid',                -- Pagada
    'cancelled'            -- Cancelada
);

-- Estado del pago
CREATE TYPE payment_status AS ENUM (
    'scheduled',           -- Programado
    'processing',          -- En proceso
    'completed',           -- Completado
    'failed',              -- Fallido
    'cancelled',           -- Cancelado
    'refunded'             -- Reembolsado
);

-- Método de pago CFDI
CREATE TYPE cfdi_payment_method AS ENUM (
    'PUE',                 -- Pago en Una sola Exhibición
    'PPD'                  -- Pago en Parcialidades o Diferido
);

-- Estado del driver
CREATE TYPE driver_status AS ENUM (
    'active',              -- Activo
    'inactive',            -- Inactivo
    'suspended',           -- Suspendido
    'pending_verification' -- Pendiente de verificación
);

-- Tipo de documento del driver
CREATE TYPE document_type AS ENUM (
    'ine',                 -- INE/IFE
    'license',             -- Licencia de conducir
    'proof_address',       -- Comprobante de domicilio
    'rfc_constancia',      -- Constancia de situación fiscal
    'bank_account',        -- Estado de cuenta bancario
    'other'                -- Otro
);
```

---

## 3. Tablas de Catálogos

### 3.1 Proyectos

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar proyectos iniciales
INSERT INTO projects (code, name) VALUES
    ('MERCADO_LIBRE', 'Mercado Libre'),
    ('AMAZON', 'Amazon'),
    ('WALMART', 'Walmart'),
    ('SHOPIFY', 'Shopify'),
    ('OTHER', 'Otro');
```

### 3.2 Regímenes Fiscales SAT

```sql
CREATE TABLE fiscal_regimes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    applies_to VARCHAR(20) CHECK (applies_to IN ('fisica', 'moral', 'ambos')),
    is_active BOOLEAN DEFAULT true
);

-- Insertar regímenes fiscales del SAT
INSERT INTO fiscal_regimes (code, name, applies_to) VALUES
    ('601', 'General de Ley Personas Morales', 'moral'),
    ('603', 'Personas Morales con Fines no Lucrativos', 'moral'),
    ('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', 'fisica'),
    ('606', 'Arrendamiento', 'fisica'),
    ('607', 'Régimen de Enajenación o Adquisición de Bienes', 'fisica'),
    ('608', 'Demás ingresos', 'fisica'),
    ('610', 'Residentes en el Extranjero sin Establecimiento Permanente en México', 'ambos'),
    ('611', 'Ingresos por Dividendos (socios y accionistas)', 'fisica'),
    ('612', 'Personas Físicas con Actividades Empresariales y Profesionales', 'fisica'),
    ('614', 'Ingresos por intereses', 'fisica'),
    ('615', 'Régimen de los ingresos por obtención de premios', 'fisica'),
    ('616', 'Sin obligaciones fiscales', 'fisica'),
    ('620', 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', 'moral'),
    ('621', 'Incorporación Fiscal', 'fisica'),
    ('622', 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', 'ambos'),
    ('623', 'Opcional para Grupos de Sociedades', 'moral'),
    ('624', 'Coordinados', 'moral'),
    ('625', 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', 'fisica'),
    ('626', 'Régimen Simplificado de Confianza', 'ambos');
```

### 3.3 Formas de Pago SAT

```sql
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
    ('05', 'Monedero electrónico'),
    ('06', 'Dinero electrónico'),
    ('08', 'Vales de despensa'),
    ('12', 'Dación en pago'),
    ('13', 'Pago por subrogación'),
    ('14', 'Pago por consignación'),
    ('15', 'Condonación'),
    ('17', 'Compensación'),
    ('23', 'Novación'),
    ('24', 'Confusión'),
    ('25', 'Remisión de deuda'),
    ('26', 'Prescripción o caducidad'),
    ('27', 'A satisfacción del acreedor'),
    ('28', 'Tarjeta de débito'),
    ('29', 'Tarjeta de servicios'),
    ('30', 'Aplicación de anticipos'),
    ('31', 'Intermediario pagos'),
    ('99', 'Por definir');
```

### 3.4 Uso CFDI SAT

```sql
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
    ('I02', 'Mobiliario y equipo de oficina por inversiones', 'ambos'),
    ('I03', 'Equipo de transporte', 'ambos'),
    ('I04', 'Equipo de cómputo y accesorios', 'ambos'),
    ('I05', 'Dados, troqueles, moldes, matrices y herramental', 'ambos'),
    ('I06', 'Comunicaciones telefónicas', 'ambos'),
    ('I07', 'Comunicaciones satelitales', 'ambos'),
    ('I08', 'Otra maquinaria y equipo', 'ambos'),
    ('D01', 'Honorarios médicos, dentales y gastos hospitalarios', 'fisica'),
    ('D02', 'Gastos médicos por incapacidad o discapacidad', 'fisica'),
    ('D03', 'Gastos funerales', 'fisica'),
    ('D04', 'Donativos', 'fisica'),
    ('D05', 'Intereses reales efectivamente pagados por créditos hipotecarios', 'fisica'),
    ('D06', 'Aportaciones voluntarias al SAR', 'fisica'),
    ('D07', 'Primas por seguros de gastos médicos', 'fisica'),
    ('D08', 'Gastos de transportación escolar obligatoria', 'fisica'),
    ('D09', 'Depósitos en cuentas para el ahorro, primas de pensiones', 'fisica'),
    ('D10', 'Pagos por servicios educativos (colegiaturas)', 'fisica'),
    ('S01', 'Sin efectos fiscales', 'ambos'),
    ('CP01', 'Pagos', 'ambos'),
    ('CN01', 'Nómina', 'fisica');
```

---

## 4. Tabla de Drivers

```sql
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
    fiscal_name VARCHAR(300),                    -- Razón social completa
    fiscal_regime_code VARCHAR(10) REFERENCES fiscal_regimes(code),
    fiscal_zip_code VARCHAR(5),
    
    -- Información bancaria (encriptada)
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(20),             -- Considerar encriptar
    bank_clabe VARCHAR(18),                      -- Considerar encriptar
    
    -- Estado y metadata
    status driver_status DEFAULT 'pending_verification',
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMPTZ,
    verified_by UUID,
    
    -- Asignación de proyecto
    primary_project_id UUID REFERENCES projects(id),
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    CONSTRAINT valid_rfc CHECK (LENGTH(rfc) IN (12, 13)),
    CONSTRAINT valid_clabe CHECK (bank_clabe IS NULL OR LENGTH(bank_clabe) = 18)
);

-- Tabla para documentos del driver
CREATE TABLE driver_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    
    document_type document_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,                     -- URL en storage
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Verificación
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    rejection_reason TEXT,
    
    -- Vigencia
    expiration_date DATE,
    
    -- Auditoría
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(driver_id, document_type)
);
```

---

## 5. Tabla de Facturas (invoices)

```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relaciones
    driver_id UUID NOT NULL REFERENCES drivers(id),
    project_id UUID REFERENCES projects(id),
    
    -- Identificadores CFDI
    uuid VARCHAR(36) UNIQUE NOT NULL,            -- Folio fiscal
    folio VARCHAR(50),
    series VARCHAR(25),
    
    -- Fechas
    invoice_date DATE NOT NULL,
    certification_date TIMESTAMPTZ,
    sat_cert_number VARCHAR(50),
    
    -- Emisor (del XML)
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
    
    -- Método y forma de pago
    payment_method cfdi_payment_method NOT NULL,
    payment_form VARCHAR(10),
    payment_conditions TEXT,
    
    -- Montos
    subtotal DECIMAL(18,2) NOT NULL,
    total_tax DECIMAL(18,2) DEFAULT 0,           -- IVA trasladado
    retention_iva DECIMAL(18,2) DEFAULT 0,
    retention_iva_rate DECIMAL(8,6) DEFAULT 0,
    retention_isr DECIMAL(18,2) DEFAULT 0,
    retention_isr_rate DECIMAL(8,6) DEFAULT 0,
    total_amount DECIMAL(18,2) NOT NULL,
    
    -- Moneda
    currency VARCHAR(3) DEFAULT 'MXN',
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    
    -- Semana de pago
    payment_week INTEGER,
    payment_year INTEGER,
    
    -- Estado
    status invoice_status DEFAULT 'pending_review',
    
    -- Notas y observaciones
    notes TEXT,
    rejection_reason TEXT,
    
    -- Contacto (del formulario)
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    
    -- Metadata
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_amounts CHECK (total_amount >= 0 AND subtotal >= 0),
    CONSTRAINT valid_week CHECK (payment_week IS NULL OR (payment_week >= 1 AND payment_week <= 53))
);

-- Índice para búsqueda rápida
CREATE INDEX idx_invoices_driver ON invoices(driver_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_payment_week ON invoices(payment_year, payment_week);
CREATE INDEX idx_invoices_uuid ON invoices(uuid);
CREATE INDEX idx_invoices_issuer_rfc ON invoices(issuer_rfc);
```

---

## 6. Tabla de Conceptos (invoice_items)

```sql
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Datos del concepto
    description TEXT NOT NULL,
    quantity DECIMAL(18,6) NOT NULL DEFAULT 1,
    unit VARCHAR(50),                            -- ClaveUnidad
    unit_name VARCHAR(100),                      -- Unidad (nombre)
    unit_price DECIMAL(18,6) NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    
    -- Claves SAT
    product_key VARCHAR(10),                     -- ClaveProdServ
    tax_object VARCHAR(5),                       -- ObjetoImp
    
    -- Impuestos del concepto
    tax_base DECIMAL(18,2),
    tax_amount DECIMAL(18,2),
    retention_amount DECIMAL(18,2),
    
    -- Orden
    line_number INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
```

---

## 7. Tabla de Archivos (invoice_files)

```sql
CREATE TABLE invoice_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('xml', 'pdf')),
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,                     -- URL en Supabase Storage o Google Drive
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Hash para verificar integridad
    file_hash VARCHAR(64),                       -- SHA-256
    
    -- Referencias externas
    google_drive_id VARCHAR(100),
    google_drive_url TEXT,
    
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(invoice_id, file_type)
);

CREATE INDEX idx_invoice_files_invoice ON invoice_files(invoice_id);
```

---

## 8. Tabla de Pagos (payments)

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencia de pago
    payment_reference VARCHAR(50) UNIQUE,        -- Referencia interna
    
    -- Período de pago
    payment_week INTEGER NOT NULL,
    payment_year INTEGER NOT NULL,
    
    -- Driver
    driver_id UUID NOT NULL REFERENCES drivers(id),
    
    -- Proyecto
    project_id UUID REFERENCES projects(id),
    
    -- Montos
    total_invoices INTEGER DEFAULT 0,            -- Cantidad de facturas
    gross_amount DECIMAL(18,2) NOT NULL,         -- Monto bruto (suma de facturas)
    total_retentions DECIMAL(18,2) DEFAULT 0,    -- Total retenciones
    net_amount DECIMAL(18,2) NOT NULL,           -- Monto neto a pagar
    
    currency VARCHAR(3) DEFAULT 'MXN',
    
    -- Estado
    status payment_status DEFAULT 'scheduled',
    
    -- Fechas
    scheduled_date DATE,                         -- Fecha programada de pago
    processed_date TIMESTAMPTZ,                  -- Fecha en que se procesó
    completed_date TIMESTAMPTZ,                  -- Fecha en que se completó
    
    -- Información bancaria al momento del pago
    bank_name VARCHAR(100),
    bank_clabe VARCHAR(18),
    
    -- Referencia de transacción bancaria
    bank_reference VARCHAR(100),
    bank_transaction_id VARCHAR(100),
    
    -- Notas
    notes TEXT,
    failure_reason TEXT,
    
    -- Auditoría
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    processed_by UUID,
    
    UNIQUE(driver_id, payment_week, payment_year)
);

-- Tabla de relación entre pagos y facturas
CREATE TABLE payment_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    
    amount DECIMAL(18,2) NOT NULL,               -- Monto de esta factura en el pago
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(payment_id, invoice_id)
);

CREATE INDEX idx_payments_driver ON payments(driver_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_week ON payments(payment_year, payment_week);
CREATE INDEX idx_payment_invoices_payment ON payment_invoices(payment_id);
CREATE INDEX idx_payment_invoices_invoice ON payment_invoices(invoice_id);
```

---

## 9. Tabla de Historial (payment_history)

```sql
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    
    -- Estado anterior y nuevo
    previous_status payment_status,
    new_status payment_status NOT NULL,
    
    -- Quién hizo el cambio
    changed_by UUID,
    changed_by_name VARCHAR(200),
    
    -- Razón del cambio
    reason TEXT,
    
    -- Metadata adicional
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_history_payment ON payment_history(payment_id);
CREATE INDEX idx_payment_history_created ON payment_history(created_at);
```

---

## 10. Tabla de Auditoría (audit_log)

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Tabla y registro afectado
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    
    -- Tipo de operación
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- Datos
    old_data JSONB,
    new_data JSONB,
    changed_fields TEXT[],
    
    -- Usuario
    user_id UUID,
    user_email VARCHAR(255),
    user_ip VARCHAR(45),
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_table ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
```

---

## 11. Índices

```sql
-- Índices adicionales para optimización

-- Búsqueda full-text en descripciones de conceptos
CREATE INDEX idx_invoice_items_description_trgm ON invoice_items 
USING gin (description gin_trgm_ops);

-- Búsqueda por nombre de driver
CREATE INDEX idx_drivers_name_trgm ON drivers 
USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- Índice compuesto para reportes por semana
CREATE INDEX idx_invoices_week_status ON invoices(payment_year, payment_week, status);

-- Índice para facturas pendientes de pago
CREATE INDEX idx_invoices_pending ON invoices(status) 
WHERE status IN ('approved', 'pending_payment');

-- Índice parcial para drivers activos
CREATE INDEX idx_drivers_active ON drivers(rfc, email) 
WHERE status = 'active';
```

---

## 12. Funciones y Triggers

### 12.1 Función para actualizar updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER update_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 12.2 Función para generar referencia de pago

```sql
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

CREATE TRIGGER generate_payment_ref
    BEFORE INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION generate_payment_reference();
```

### 12.3 Función para registrar historial de pagos

```sql
CREATE OR REPLACE FUNCTION log_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO payment_history (
            payment_id,
            previous_status,
            new_status,
            changed_by,
            metadata
        ) VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            NEW.processed_by,
            jsonb_build_object(
                'previous_amount', OLD.net_amount,
                'new_amount', NEW.net_amount
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_payment_changes
    AFTER UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_payment_status_change();
```

### 12.4 Función para actualizar estado de factura al pagar

```sql
CREATE OR REPLACE FUNCTION update_invoice_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' THEN
        UPDATE invoices 
        SET status = 'paid', updated_at = NOW()
        WHERE id IN (
            SELECT invoice_id FROM payment_invoices WHERE payment_id = NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_on_payment
    AFTER UPDATE ON payments
    FOR EACH ROW 
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_invoice_on_payment();
```

### 12.5 Trigger de auditoría general

```sql
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields TEXT[];
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Encontrar campos cambiados
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(to_jsonb(NEW)) n
        FULL OUTER JOIN jsonb_each(to_jsonb(OLD)) o USING (key)
        WHERE n.value IS DISTINCT FROM o.value;
        
        INSERT INTO audit_log (table_name, record_id, operation, old_data, new_data, changed_fields)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(OLD), to_jsonb(NEW), changed_fields);
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_data)
        VALUES (TG_TABLE_NAME, NEW.id, TG_OP, to_jsonb(NEW));
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data)
        VALUES (TG_TABLE_NAME, OLD.id, TG_OP, to_jsonb(OLD));
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas principales
CREATE TRIGGER audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
```

---

## 13. Vistas

### 13.1 Vista de facturas con detalles

```sql
CREATE OR REPLACE VIEW v_invoices_detail AS
SELECT 
    i.*,
    d.first_name || ' ' || d.last_name AS driver_name,
    d.rfc AS driver_rfc,
    d.email AS driver_email,
    p.name AS project_name,
    fr.name AS issuer_regime_name,
    (
        SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id
    ) AS items_count,
    (
        SELECT jsonb_agg(jsonb_build_object(
            'file_type', file_type,
            'file_name', file_name,
            'file_path', file_path
        ))
        FROM invoice_files WHERE invoice_id = i.id
    ) AS files
FROM invoices i
LEFT JOIN drivers d ON i.driver_id = d.id
LEFT JOIN projects p ON i.project_id = p.id
LEFT JOIN fiscal_regimes fr ON i.issuer_regime = fr.code;
```

### 13.2 Vista de resumen de pagos por semana

```sql
CREATE OR REPLACE VIEW v_payment_summary_by_week AS
SELECT 
    payment_year,
    payment_week,
    project_id,
    p.name AS project_name,
    COUNT(DISTINCT pay.driver_id) AS total_drivers,
    COUNT(*) AS total_payments,
    SUM(CASE WHEN pay.status = 'completed' THEN 1 ELSE 0 END) AS completed_payments,
    SUM(CASE WHEN pay.status = 'scheduled' THEN 1 ELSE 0 END) AS pending_payments,
    SUM(gross_amount) AS total_gross,
    SUM(total_retentions) AS total_retentions,
    SUM(net_amount) AS total_net
FROM payments pay
LEFT JOIN projects p ON pay.project_id = p.id
GROUP BY payment_year, payment_week, project_id, p.name
ORDER BY payment_year DESC, payment_week DESC;
```

### 13.3 Vista de facturas pendientes de pago

```sql
CREATE OR REPLACE VIEW v_invoices_pending_payment AS
SELECT 
    i.id,
    i.uuid,
    i.invoice_date,
    i.issuer_name,
    i.total_amount,
    i.payment_week,
    i.payment_year,
    i.status,
    d.id AS driver_id,
    d.first_name || ' ' || d.last_name AS driver_name,
    d.rfc AS driver_rfc,
    d.bank_clabe,
    p.name AS project_name,
    i.submitted_at,
    EXTRACT(DAY FROM NOW() - i.submitted_at) AS days_pending
FROM invoices i
JOIN drivers d ON i.driver_id = d.id
LEFT JOIN projects p ON i.project_id = p.id
WHERE i.status IN ('approved', 'pending_payment')
ORDER BY i.payment_year, i.payment_week, i.submitted_at;
```

### 13.4 Vista de dashboard de driver

```sql
CREATE OR REPLACE VIEW v_driver_dashboard AS
SELECT 
    d.id AS driver_id,
    d.first_name || ' ' || d.last_name AS driver_name,
    d.rfc,
    d.status AS driver_status,
    
    -- Facturas
    COUNT(DISTINCT i.id) AS total_invoices,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'paid') AS paid_invoices,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('pending_review', 'approved', 'pending_payment')) AS pending_invoices,
    
    -- Montos
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'paid'), 0) AS total_paid,
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status IN ('pending_review', 'approved', 'pending_payment')), 0) AS total_pending,
    
    -- Última actividad
    MAX(i.submitted_at) AS last_invoice_date,
    MAX(pay.completed_date) AS last_payment_date
    
FROM drivers d
LEFT JOIN invoices i ON d.id = i.driver_id
LEFT JOIN payment_invoices pi ON i.id = pi.invoice_id
LEFT JOIN payments pay ON pi.payment_id = pay.id AND pay.status = 'completed'
GROUP BY d.id, d.first_name, d.last_name, d.rfc, d.status;
```

---

## 14. Row Level Security (RLS)

```sql
-- Habilitar RLS en tablas principales
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Política para drivers (solo pueden ver sus propios datos)
CREATE POLICY "Drivers can view own data" ON drivers
    FOR SELECT
    USING (auth.uid()::text = id::text OR auth.jwt() ->> 'role' = 'admin');

-- Política para facturas
CREATE POLICY "Drivers can view own invoices" ON invoices
    FOR SELECT
    USING (
        driver_id::text = auth.uid()::text 
        OR auth.jwt() ->> 'role' IN ('admin', 'reviewer')
    );

CREATE POLICY "Drivers can insert own invoices" ON invoices
    FOR INSERT
    WITH CHECK (driver_id::text = auth.uid()::text);

-- Política para pagos (solo lectura para drivers)
CREATE POLICY "Drivers can view own payments" ON payments
    FOR SELECT
    USING (
        driver_id::text = auth.uid()::text 
        OR auth.jwt() ->> 'role' IN ('admin', 'finance')
    );

-- Política para admins (acceso total)
CREATE POLICY "Admins have full access to drivers" ON drivers
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins have full access to invoices" ON invoices
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admins have full access to payments" ON payments
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');
```

---

## 15. Queries de Ejemplo

### 15.1 Insertar nueva factura desde webhook

```sql
-- Función para insertar factura completa
CREATE OR REPLACE FUNCTION insert_invoice_from_webhook(payload JSONB)
RETURNS UUID AS $$
DECLARE
    new_invoice_id UUID;
    item JSONB;
BEGIN
    -- Buscar o crear driver
    INSERT INTO drivers (rfc, fiscal_name, email, phone, fiscal_regime_code)
    VALUES (
        payload->'issuer'->>'rfc',
        payload->'issuer'->>'name',
        payload->'contact'->>'email',
        payload->'contact'->>'phone',
        SUBSTRING(payload->'issuer'->>'regime' FROM 1 FOR 3)
    )
    ON CONFLICT (rfc) DO UPDATE SET
        fiscal_name = EXCLUDED.fiscal_name,
        updated_at = NOW();

    -- Insertar factura
    INSERT INTO invoices (
        driver_id,
        project_id,
        uuid,
        folio,
        series,
        invoice_date,
        certification_date,
        sat_cert_number,
        issuer_rfc,
        issuer_name,
        issuer_regime,
        issuer_zip_code,
        receiver_rfc,
        receiver_name,
        receiver_regime,
        receiver_zip_code,
        cfdi_use,
        payment_method,
        payment_form,
        subtotal,
        total_tax,
        retention_iva,
        retention_iva_rate,
        retention_isr,
        retention_isr_rate,
        total_amount,
        currency,
        exchange_rate,
        payment_week,
        payment_year,
        contact_email,
        contact_phone
    )
    SELECT
        d.id,
        p.id,
        payload->'invoice'->>'uuid',
        payload->'invoice'->>'folio',
        payload->'invoice'->>'series',
        (payload->'invoice'->>'date')::DATE,
        (payload->'invoice'->>'certificationDate')::TIMESTAMPTZ,
        payload->'invoice'->>'satCertNumber',
        payload->'issuer'->>'rfc',
        payload->'issuer'->>'name',
        payload->'issuer'->>'regime',
        payload->'issuer'->>'zipCode',
        payload->'receiver'->>'rfc',
        payload->'receiver'->>'name',
        payload->'receiver'->>'regime',
        payload->'receiver'->>'zipCode',
        payload->'receiver'->>'cfdiUse',
        (payload->'payment'->>'method')::cfdi_payment_method,
        payload->'payment'->>'form',
        (payload->'financial'->>'subtotal')::DECIMAL,
        (payload->'financial'->>'totalTax')::DECIMAL,
        (payload->'financial'->>'retentionIva')::DECIMAL,
        (payload->'financial'->>'retentionIvaRate')::DECIMAL,
        (payload->'financial'->>'retentionIsr')::DECIMAL,
        (payload->'financial'->>'retentionIsrRate')::DECIMAL,
        (payload->'financial'->>'totalAmount')::DECIMAL,
        payload->'financial'->>'currency',
        NULLIF(payload->'financial'->>'exchangeRate', '')::DECIMAL,
        (payload->>'week')::INTEGER,
        EXTRACT(YEAR FROM (payload->'invoice'->>'date')::DATE),
        payload->'contact'->>'email',
        payload->'contact'->>'phone'
    FROM drivers d
    LEFT JOIN projects p ON p.code = UPPER(REPLACE(payload->>'project', ' ', '_'))
    WHERE d.rfc = payload->'issuer'->>'rfc'
    RETURNING id INTO new_invoice_id;

    -- Insertar items
    FOR item IN SELECT * FROM jsonb_array_elements(payload->'items')
    LOOP
        INSERT INTO invoice_items (
            invoice_id,
            description,
            quantity,
            unit,
            unit_price,
            amount,
            product_key,
            tax_object
        ) VALUES (
            new_invoice_id,
            item->>'description',
            (item->>'quantity')::DECIMAL,
            item->>'unit',
            (item->>'unitPrice')::DECIMAL,
            (item->>'amount')::DECIMAL,
            item->>'productKey',
            item->>'taxObject'
        );
    END LOOP;

    RETURN new_invoice_id;
END;
$$ LANGUAGE plpgsql;
```

### 15.2 Generar pago semanal para un driver

```sql
CREATE OR REPLACE FUNCTION generate_weekly_payment(
    p_driver_id UUID,
    p_week INTEGER,
    p_year INTEGER
) RETURNS UUID AS $$
DECLARE
    new_payment_id UUID;
    v_gross DECIMAL;
    v_retentions DECIMAL;
    v_count INTEGER;
BEGIN
    -- Calcular totales
    SELECT 
        COUNT(*),
        COALESCE(SUM(total_amount), 0),
        COALESCE(SUM(retention_iva + retention_isr), 0)
    INTO v_count, v_gross, v_retentions
    FROM invoices
    WHERE driver_id = p_driver_id
    AND payment_week = p_week
    AND payment_year = p_year
    AND status = 'approved';

    IF v_count = 0 THEN
        RAISE EXCEPTION 'No hay facturas aprobadas para este período';
    END IF;

    -- Crear pago
    INSERT INTO payments (
        driver_id,
        payment_week,
        payment_year,
        total_invoices,
        gross_amount,
        total_retentions,
        net_amount,
        status,
        scheduled_date
    )
    SELECT
        p_driver_id,
        p_week,
        p_year,
        v_count,
        v_gross,
        v_retentions,
        v_gross - v_retentions,
        'scheduled',
        -- Programar para el viernes de la siguiente semana
        (DATE_TRUNC('week', MAKE_DATE(p_year, 1, 1) + (p_week * 7) * INTERVAL '1 day') + INTERVAL '11 days')::DATE
    RETURNING id INTO new_payment_id;

    -- Vincular facturas al pago
    INSERT INTO payment_invoices (payment_id, invoice_id, amount)
    SELECT new_payment_id, id, total_amount
    FROM invoices
    WHERE driver_id = p_driver_id
    AND payment_week = p_week
    AND payment_year = p_year
    AND status = 'approved';

    -- Actualizar estado de facturas
    UPDATE invoices
    SET status = 'pending_payment'
    WHERE driver_id = p_driver_id
    AND payment_week = p_week
    AND payment_year = p_year
    AND status = 'approved';

    RETURN new_payment_id;
END;
$$ LANGUAGE plpgsql;
```

### 15.3 Reporte de facturación por proyecto

```sql
SELECT 
    p.name AS proyecto,
    i.payment_year AS año,
    i.payment_week AS semana,
    COUNT(DISTINCT i.driver_id) AS drivers,
    COUNT(*) AS facturas,
    SUM(i.subtotal) AS subtotal,
    SUM(i.total_tax) AS iva_trasladado,
    SUM(i.retention_iva) AS retencion_iva,
    SUM(i.retention_isr) AS retencion_isr,
    SUM(i.total_amount) AS total,
    SUM(i.total_amount - i.retention_iva - i.retention_isr) AS neto_a_pagar
FROM invoices i
JOIN projects p ON i.project_id = p.id
WHERE i.payment_year = 2026
GROUP BY p.name, i.payment_year, i.payment_week
ORDER BY i.payment_year, i.payment_week, p.name;
```

### 15.4 Buscar facturas duplicadas

```sql
SELECT 
    uuid,
    COUNT(*) AS duplicados,
    ARRAY_AGG(id) AS invoice_ids
FROM invoices
GROUP BY uuid
HAVING COUNT(*) > 1;
```

### 15.5 Dashboard de estado de pagos

```sql
SELECT 
    status,
    COUNT(*) AS cantidad,
    SUM(net_amount) AS monto_total,
    MIN(scheduled_date) AS fecha_mas_antigua,
    MAX(scheduled_date) AS fecha_mas_reciente
FROM payments
WHERE payment_year = 2026
GROUP BY status
ORDER BY 
    CASE status
        WHEN 'scheduled' THEN 1
        WHEN 'processing' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'failed' THEN 4
        WHEN 'cancelled' THEN 5
    END;
```

---

## 📝 Notas de Implementación

### Consideraciones de Seguridad
- Las CLABE y números de cuenta deberían encriptarse usando `pgcrypto`
- Implementar rate limiting en las funciones de inserción
- Usar transacciones para operaciones críticas

### Mantenimiento
- Crear índices parciales para queries frecuentes
- Implementar particionamiento por año si el volumen crece
- Configurar vacuum automático para tablas de auditoría

### Backup
- Configurar backups diarios de Supabase
- Exportar auditoría mensualmente a almacenamiento frío

---

## 🔄 Migraciones Futuras

```sql
-- Ejemplo de migración para agregar campo
-- migrations/001_add_driver_rating.sql

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0;

COMMENT ON COLUMN drivers.rating IS 'Rating promedio del driver (1-5)';
```

---

**Generado para:** FacturaFlow AI  
**Versión del esquema:** 1.0.0  
**Última actualización:** Enero 2026
