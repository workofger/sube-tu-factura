# Base de Datos - Sistema de Gestion de Facturas CFDI

> **Motor:** PostgreSQL (Supabase)  
> **Version:** 3.0.0  
> **Fecha:** Enero 2026

---

## Arquitectura de la Base de Datos

```
                           SISTEMA DE FACTURAS CFDI v3.0
          (Flotilleros, Drivers, Admin, API Keys, Pronto Pago, User Auth)
+-----------------------------------------------------------------------------+
|                                                                             |
|  +----------------+         +----------------+         +------------------+ |
|  |  flotilleros   |-------->|   invoices     |-------->|  invoice_items   | |
|  | (Facturadores) |         |  (Facturas)    |         |   (Conceptos)    | |
|  +----------------+         +----------------+         +------------------+ |
|         |                          |                                        |
|         | 1:N                      |                                        |
|         v                          v                                        |
|  +----------------+         +----------------+         +------------------+ |
|  |    drivers     |         |   payments     |-------->| payment_history  | |
|  |  (Operadores)  |         |    (Pagos)     |         |   (Historial)    | |
|  +----------------+         +----------------+         +------------------+ |
|         |                          |                                        |
|         v                          v                                        |
|  +----------------+         +----------------+         +------------------+ |
|  |driver_documents|         | invoice_files  |         |    audit_log     | |
|  | (Documentos)   |         |  (Archivos)    |         |   (Auditoria)    | |
|  +----------------+         +----------------+         +------------------+ |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                      ADMINISTRACION Y SEGURIDAD                       |  |
|  |  admin_users | admin_audit_log | api_keys | api_key_usage_log         |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                    AUTENTICACION DE USUARIOS                          |  |
|  |  user_sessions | user_auth_log | (campos auth en flotilleros)         |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                      CONFIGURACION DEL SISTEMA                        |  |
|  |  system_config (payment_source_account, pronto_pago_config, etc.)     |  |
|  +-----------------------------------------------------------------------+  |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                     CATALOGOS (ENUMS/LOOKUP)                          |  |
|  |  projects | fiscal_regimes | payment_methods | invoice_status         |  |
|  |  payment_program | admin_role | biller_type | driver_status           |  |
|  +-----------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------+

RELACIONES CLAVE:
- flotilleros 1:N drivers (un flotillero puede tener muchos drivers)
- flotilleros 1:N invoices (un flotillero emite muchas facturas)
- flotilleros 1:N user_sessions (sesiones de autenticación del usuario)
- drivers N:1 flotilleros (un driver pertenece a un flotillero o es independiente)
- invoices N:1 flotilleros (biller_id: quien emite la factura)
- invoices N:1 drivers (operated_by_driver_id: quien hizo el trabajo)
- admin_users 1:N admin_audit_log (registro de acciones de admin)
- admin_users 1:N api_keys (llaves de API creadas)
- api_keys 1:N api_key_usage_log (logs de uso de API)
```

---

## Indice

1. [Extensiones y Configuracion](#1-extensiones-y-configuracion)
2. [Tipos ENUM](#2-tipos-enum)
3. [Tablas de Catalogos](#3-tablas-de-catalogos)
4. [Tabla de Flotilleros](#4-tabla-de-flotilleros)
5. [Tabla de Drivers](#5-tabla-de-drivers)
6. [Tabla de Facturas](#6-tabla-de-facturas-invoices)
7. [Tabla de Conceptos](#7-tabla-de-conceptos-invoice_items)
8. [Tabla de Archivos](#8-tabla-de-archivos-invoice_files)
9. [Tabla de Pagos](#9-tabla-de-pagos-payments)
10. [Tabla de Historial de Pagos](#10-tabla-de-historial-payment_history)
11. [Tabla de Auditoria](#11-tabla-de-auditoria-audit_log)
12. [Tabla de Usuarios Administrativos](#12-tabla-de-usuarios-administrativos-admin_users)
13. [Tabla de Configuracion del Sistema](#13-tabla-de-configuracion-del-sistema-system_config)
14. [Tabla de API Keys](#14-tabla-de-api-keys)
15. [Autenticacion de Usuarios](#15-autenticacion-de-usuarios-flotilleros)
16. [Indices](#16-indices)
17. [Funciones y Triggers](#17-funciones-y-triggers)
18. [Vistas](#18-vistas)
19. [Row Level Security (RLS)](#19-row-level-security-rls)
20. [Queries de Ejemplo](#20-queries-de-ejemplo)

---

## 1. Extensiones y Configuracion

```sql
-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- Para generar UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Para encriptacion
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Para busqueda por similitud

-- Configurar timezone
SET timezone = 'America/Mexico_City';
```

---

## 2. Tipos ENUM

```sql
-- Estado de la factura en el sistema
CREATE TYPE invoice_status AS ENUM (
    'pending_review',      -- Pendiente de revision
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

-- Metodo de pago CFDI
CREATE TYPE cfdi_payment_method AS ENUM (
    'PUE',                 -- Pago en Una sola Exhibicion
    'PPD'                  -- Pago en Parcialidades o Diferido
);

-- Estado del driver/flotillero
CREATE TYPE driver_status AS ENUM (
    'active',              -- Activo
    'inactive',            -- Inactivo
    'suspended',           -- Suspendido
    'pending_verification' -- Pendiente de verificacion
);

-- Tipo de facturador
CREATE TYPE biller_type AS ENUM (
    'flotillero',          -- Flotillero (multiples drivers)
    'independiente'        -- Driver independiente (factura por si mismo)
);

-- Tipo de documento del driver
CREATE TYPE document_type AS ENUM (
    'ine',                 -- INE/IFE
    'license',             -- Licencia de conducir
    'proof_address',       -- Comprobante de domicilio
    'rfc_constancia',      -- Constancia de situacion fiscal
    'bank_account',        -- Estado de cuenta bancario
    'other'                -- Otro
);

-- Programa de pago (NUEVO en v3.0)
CREATE TYPE payment_program AS ENUM (
    'standard',            -- Pago estandar (semana siguiente)
    'pronto_pago'          -- Pago anticipado con costo financiero (8%)
);

-- Rol de administrador (NUEVO en v3.0)
CREATE TYPE admin_role AS ENUM (
    'super_admin',         -- Acceso total al sistema
    'finance',             -- Reportes y pagos
    'operations',          -- Gestion de facturas
    'viewer'               -- Solo lectura
);
```

---

## 3. Tablas de Catalogos

### 3.1 Proyectos

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7),              -- Color hex para UI
    icon VARCHAR(50),              -- Nombre del icono
    sort_order INTEGER DEFAULT 0,  -- Orden de despliegue
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertar proyectos iniciales
INSERT INTO projects (code, name, color, sort_order) VALUES
    ('MERCADO_LIBRE', 'Mercado Libre', '#FFE600', 1),
    ('AMAZON', 'Amazon', '#FF9900', 2),
    ('RAPPI', 'Rappi', '#FF6B00', 3),
    ('DINAMICA_FILMICA', 'Dinamica Filmica', '#8B5CF6', 4),
    ('HOME_DEPOT', 'Home Depot', '#F96302', 5),
    ('WALMART', 'Walmart', '#0071CE', 6),
    ('COPPEL', 'Coppel', '#FFD700', 7),
    ('LIVERPOOL', 'Liverpool', '#E31837', 8),
    ('ESTAFETA', 'Estafeta', '#E31837', 9),
    ('DHL', 'DHL', '#FFCC00', 10),
    ('FEDEX', 'FedEx', '#4D148C', 11),
    ('UPS', 'UPS', '#351C15', 12),
    ('PAQUETEXPRESS', 'Paquetexpress', '#00A651', 13),
    ('UBER_EATS', 'Uber Eats', '#06C167', 14),
    ('DIDI_FOOD', 'DiDi Food', '#FF7F00', 15),
    ('CORNERSHOP', 'Cornershop', '#FF4B4B', 16),
    ('JOKR', 'JOKR', '#000000', 17),
    ('OTROS', 'Otros', '#6B7280', 99);
```

### 3.2 Regimenes Fiscales SAT

```sql
CREATE TABLE fiscal_regimes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    applies_to VARCHAR(20) CHECK (applies_to IN ('fisica', 'moral', 'ambos')),
    is_active BOOLEAN DEFAULT true
);

-- Insertar regimenes fiscales del SAT
INSERT INTO fiscal_regimes (code, name, applies_to) VALUES
    ('601', 'General de Ley Personas Morales', 'moral'),
    ('603', 'Personas Morales con Fines no Lucrativos', 'moral'),
    ('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', 'fisica'),
    ('606', 'Arrendamiento', 'fisica'),
    ('607', 'Regimen de Enajenacion o Adquisicion de Bienes', 'fisica'),
    ('608', 'Demas ingresos', 'fisica'),
    ('610', 'Residentes en el Extranjero sin Establecimiento Permanente en Mexico', 'ambos'),
    ('611', 'Ingresos por Dividendos (socios y accionistas)', 'fisica'),
    ('612', 'Personas Fisicas con Actividades Empresariales y Profesionales', 'fisica'),
    ('614', 'Ingresos por intereses', 'fisica'),
    ('615', 'Regimen de los ingresos por obtencion de premios', 'fisica'),
    ('616', 'Sin obligaciones fiscales', 'fisica'),
    ('620', 'Sociedades Cooperativas de Produccion que optan por diferir sus ingresos', 'moral'),
    ('621', 'Incorporacion Fiscal', 'fisica'),
    ('622', 'Actividades Agricolas, Ganaderas, Silvicolas y Pesqueras', 'ambos'),
    ('623', 'Opcional para Grupos de Sociedades', 'moral'),
    ('624', 'Coordinados', 'moral'),
    ('625', 'Regimen de las Actividades Empresariales con ingresos a traves de Plataformas Tecnologicas', 'fisica'),
    ('626', 'Regimen Simplificado de Confianza', 'ambos');
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
    ('03', 'Transferencia electronica de fondos'),
    ('04', 'Tarjeta de credito'),
    ('05', 'Monedero electronico'),
    ('06', 'Dinero electronico'),
    ('08', 'Vales de despensa'),
    ('12', 'Dacion en pago'),
    ('13', 'Pago por subrogacion'),
    ('14', 'Pago por consignacion'),
    ('15', 'Condonacion'),
    ('17', 'Compensacion'),
    ('23', 'Novacion'),
    ('24', 'Confusion'),
    ('25', 'Remision de deuda'),
    ('26', 'Prescripcion o caducidad'),
    ('27', 'A satisfaccion del acreedor'),
    ('28', 'Tarjeta de debito'),
    ('29', 'Tarjeta de servicios'),
    ('30', 'Aplicacion de anticipos'),
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
    ('G01', 'Adquisicion de mercancias', 'ambos'),
    ('G02', 'Devoluciones, descuentos o bonificaciones', 'ambos'),
    ('G03', 'Gastos en general', 'ambos'),
    ('I01', 'Construcciones', 'ambos'),
    ('I02', 'Mobiliario y equipo de oficina por inversiones', 'ambos'),
    ('I03', 'Equipo de transporte', 'ambos'),
    ('I04', 'Equipo de computo y accesorios', 'ambos'),
    ('I05', 'Dados, troqueles, moldes, matrices y herramental', 'ambos'),
    ('I06', 'Comunicaciones telefonicas', 'ambos'),
    ('I07', 'Comunicaciones satelitales', 'ambos'),
    ('I08', 'Otra maquinaria y equipo', 'ambos'),
    ('D01', 'Honorarios medicos, dentales y gastos hospitalarios', 'fisica'),
    ('D02', 'Gastos medicos por incapacidad o discapacidad', 'fisica'),
    ('D03', 'Gastos funerales', 'fisica'),
    ('D04', 'Donativos', 'fisica'),
    ('D05', 'Intereses reales efectivamente pagados por creditos hipotecarios', 'fisica'),
    ('D06', 'Aportaciones voluntarias al SAR', 'fisica'),
    ('D07', 'Primas por seguros de gastos medicos', 'fisica'),
    ('D08', 'Gastos de transportacion escolar obligatoria', 'fisica'),
    ('D09', 'Depositos en cuentas para el ahorro, primas de pensiones', 'fisica'),
    ('D10', 'Pagos por servicios educativos (colegiaturas)', 'fisica'),
    ('S01', 'Sin efectos fiscales', 'ambos'),
    ('CP01', 'Pagos', 'ambos'),
    ('CN01', 'Nomina', 'fisica');
```

---

## 4. Tabla de Flotilleros

> **NUEVO en v2.0**: Entidad que emite facturas. Puede ser un flotillero (dueno de flota con multiples drivers) o un driver independiente.
> **ACTUALIZADO en v3.0**: Se agregan campos bancarios y de autenticacion de usuarios.

```sql
CREATE TABLE flotilleros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informacion fiscal (quien factura)
    rfc VARCHAR(13) UNIQUE NOT NULL,
    fiscal_name VARCHAR(300) NOT NULL,
    trade_name VARCHAR(255),                    -- Nombre comercial (opcional)
    fiscal_regime_code VARCHAR(10),
    fiscal_zip_code VARCHAR(10),
    
    -- Contacto
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    
    -- Tipo y configuracion
    type biller_type NOT NULL DEFAULT 'independiente',
    max_drivers INTEGER DEFAULT 1,              -- Limite de drivers (1 para independiente)
    
    -- Estado
    status driver_status DEFAULT 'active',
    is_verified BOOLEAN DEFAULT false,
    
    -- ===== CAMPOS BANCARIOS (NUEVO v3.0) =====
    bank_name VARCHAR(100),                     -- Nombre del banco (BBVA, Santander, etc.)
    bank_clabe VARCHAR(18),                     -- CLABE interbancaria 18 digitos
    bank_account_number VARCHAR(20),            -- Numero de cuenta
    bank_institution_id VARCHAR(50),            -- ID institucion (BBVA_MEXICO_MX)
    
    -- ===== CAMPOS DE AUTENTICACION (NUEVO v3.0) =====
    auth_user_id UUID UNIQUE,                   -- ID de usuario autenticado
    password_hash VARCHAR(255),                 -- Hash bcrypt de contrasena
    magic_link_token VARCHAR(64),               -- Token para login sin contrasena
    magic_link_expires_at TIMESTAMPTZ,          -- Expiracion del magic link
    email_verified BOOLEAN DEFAULT false,       -- Si el email fue verificado
    email_verification_token VARCHAR(64),       -- Token de verificacion de email
    email_verification_expires_at TIMESTAMPTZ,  -- Expiracion del token
    password_reset_token VARCHAR(64),           -- Token para resetear contrasena
    password_reset_expires_at TIMESTAMPTZ,      -- Expiracion del reset token
    last_login_at TIMESTAMPTZ,                  -- Ultimo login
    failed_login_attempts INTEGER DEFAULT 0,    -- Intentos fallidos
    locked_until TIMESTAMPTZ,                   -- Cuenta bloqueada hasta
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_rfc CHECK (LENGTH(rfc) IN (12, 13)),
    CONSTRAINT valid_flotillero_clabe CHECK (bank_clabe IS NULL OR LENGTH(bank_clabe) = 18)
);

-- Indices basicos
CREATE INDEX idx_flotilleros_rfc ON flotilleros(rfc);
CREATE INDEX idx_flotilleros_type ON flotilleros(type);
CREATE INDEX idx_flotilleros_status ON flotilleros(status);

-- Indices bancarios
CREATE INDEX idx_flotilleros_bank_clabe ON flotilleros(bank_clabe) WHERE bank_clabe IS NOT NULL;

-- Indices de autenticacion
CREATE INDEX idx_flotilleros_email_auth ON flotilleros(email) WHERE email IS NOT NULL;
CREATE INDEX idx_flotilleros_magic_link ON flotilleros(magic_link_token) WHERE magic_link_token IS NOT NULL;
CREATE INDEX idx_flotilleros_auth_user ON flotilleros(auth_user_id) WHERE auth_user_id IS NOT NULL;

COMMENT ON TABLE flotilleros IS 'Entidades que pueden emitir facturas: flotilleros (con multiples drivers) o independientes';
COMMENT ON COLUMN flotilleros.type IS 'flotillero: puede tener multiples drivers asociados. independiente: driver que factura por si mismo';
COMMENT ON COLUMN flotilleros.max_drivers IS 'Limite de drivers que puede tener asociados (1 para independientes)';
COMMENT ON COLUMN flotilleros.bank_name IS 'Nombre del banco (ej: BBVA, Santander, Banorte)';
COMMENT ON COLUMN flotilleros.bank_clabe IS 'CLABE interbancaria de 18 digitos';
COMMENT ON COLUMN flotilleros.password_hash IS 'Hash bcrypt de la contrasena del usuario';
COMMENT ON COLUMN flotilleros.magic_link_token IS 'Token para login sin contrasena (magic link)';
COMMENT ON COLUMN flotilleros.locked_until IS 'Fecha hasta la cual la cuenta esta bloqueada por intentos fallidos';
```

---

## 5. Tabla de Drivers

```sql
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Informacion personal
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    
    -- Informacion fiscal
    rfc VARCHAR(13) UNIQUE NOT NULL,
    curp VARCHAR(18),
    fiscal_name VARCHAR(300),                    -- Razon social completa
    fiscal_regime_code VARCHAR(10) REFERENCES fiscal_regimes(code),
    fiscal_zip_code VARCHAR(5),
    
    -- Informacion bancaria (encriptada)
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(20),             -- Considerar encriptar
    bank_clabe VARCHAR(18),                      -- Considerar encriptar
    
    -- Relacion con flotillero
    flotillero_id UUID REFERENCES flotilleros(id) ON DELETE SET NULL,
    
    -- Estado y metadata
    status driver_status DEFAULT 'pending_verification',
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMPTZ,
    verified_by UUID,
    
    -- Asignacion de proyecto
    primary_project_id UUID REFERENCES projects(id),
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    
    -- Constraints
    CONSTRAINT valid_rfc CHECK (LENGTH(rfc) IN (12, 13)),
    CONSTRAINT valid_clabe CHECK (bank_clabe IS NULL OR LENGTH(bank_clabe) = 18)
);

-- Indices
CREATE INDEX idx_drivers_rfc ON drivers(rfc);
CREATE INDEX idx_drivers_flotillero ON drivers(flotillero_id);
CREATE INDEX idx_drivers_status ON drivers(status);

COMMENT ON COLUMN drivers.flotillero_id IS 'Flotillero al que pertenece el driver. NULL si es independiente sin flotillero asociado';

-- Tabla para documentos del driver
CREATE TABLE driver_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    
    document_type document_type NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,                     -- URL en storage
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Verificacion
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    rejection_reason TEXT,
    
    -- Vigencia
    expiration_date DATE,
    
    -- Auditoria
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(driver_id, document_type)
);
```

---

## 6. Tabla de Facturas (invoices)

> **ACTUALIZADO en v3.0**: Se agregan campos para Pronto Pago.

```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Relaciones principales
    driver_id UUID NOT NULL REFERENCES drivers(id),
    biller_id UUID REFERENCES flotilleros(id),           -- quien emite la factura
    operated_by_driver_id UUID REFERENCES drivers(id),   -- quien hizo el trabajo
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
    
    -- Metodo y forma de pago
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
    
    -- ===== CAMPOS DE PRONTO PAGO (NUEVO v3.0) =====
    payment_program payment_program DEFAULT 'standard',  -- standard o pronto_pago
    pronto_pago_fee_rate DECIMAL(5,4) DEFAULT 0,         -- Tasa (ej: 0.08 = 8%)
    pronto_pago_fee_amount DECIMAL(18,2) DEFAULT 0,      -- Monto del costo financiero
    net_payment_amount DECIMAL(18,2),                     -- Monto neto a pagar
    scheduled_payment_date DATE,                          -- Fecha programada de pago
    
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
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_amounts CHECK (total_amount >= 0 AND subtotal >= 0),
    CONSTRAINT valid_week CHECK (payment_week IS NULL OR (payment_week >= 1 AND payment_week <= 53))
);

-- Indices para busqueda rapida
CREATE INDEX idx_invoices_driver ON invoices(driver_id);
CREATE INDEX idx_invoices_biller ON invoices(biller_id);
CREATE INDEX idx_invoices_operated_by ON invoices(operated_by_driver_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_payment_week ON invoices(payment_year, payment_week);
CREATE INDEX idx_invoices_uuid ON invoices(uuid);
CREATE INDEX idx_invoices_issuer_rfc ON invoices(issuer_rfc);

-- Indices para Pronto Pago
CREATE INDEX idx_invoices_payment_program ON invoices(payment_program);
CREATE INDEX idx_invoices_scheduled_payment ON invoices(scheduled_payment_date);

COMMENT ON COLUMN invoices.biller_id IS 'Flotillero o independiente que emite la factura';
COMMENT ON COLUMN invoices.operated_by_driver_id IS 'Driver que realizo el trabajo/entrega (opcional)';
COMMENT ON COLUMN invoices.payment_program IS 'Programa de pago: standard (semana siguiente) o pronto_pago (inmediato con descuento)';
COMMENT ON COLUMN invoices.pronto_pago_fee_rate IS 'Tasa de costo financiero para pronto pago (ej: 0.08 = 8%)';
COMMENT ON COLUMN invoices.pronto_pago_fee_amount IS 'Monto del costo financiero calculado (total_amount * fee_rate)';
COMMENT ON COLUMN invoices.net_payment_amount IS 'Monto neto a pagar al emisor (total_amount - pronto_pago_fee_amount)';
COMMENT ON COLUMN invoices.scheduled_payment_date IS 'Fecha programada para el pago';
```

---

## 7. Tabla de Conceptos (invoice_items)

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

## 8. Tabla de Archivos (invoice_files)

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

## 9. Tabla de Pagos (payments)

```sql
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Referencia de pago
    payment_reference VARCHAR(50) UNIQUE,        -- Referencia interna
    
    -- Periodo de pago
    payment_week INTEGER NOT NULL,
    payment_year INTEGER NOT NULL,
    
    -- Beneficiario (puede ser driver o flotillero)
    driver_id UUID REFERENCES drivers(id),
    flotillero_id UUID REFERENCES flotilleros(id),
    
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
    processed_date TIMESTAMPTZ,                  -- Fecha en que se proceso
    completed_date TIMESTAMPTZ,                  -- Fecha en que se completo
    
    -- Informacion bancaria al momento del pago
    bank_name VARCHAR(100),
    bank_clabe VARCHAR(18),
    
    -- Referencia de transaccion bancaria
    bank_reference VARCHAR(100),
    bank_transaction_id VARCHAR(100),
    
    -- Notas
    notes TEXT,
    failure_reason TEXT,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    processed_by UUID,
    
    -- Un pago unico por beneficiario/semana/ano
    CONSTRAINT unique_payment_driver UNIQUE(driver_id, payment_week, payment_year),
    CONSTRAINT unique_payment_flotillero UNIQUE(flotillero_id, payment_week, payment_year),
    CONSTRAINT valid_beneficiary CHECK (driver_id IS NOT NULL OR flotillero_id IS NOT NULL)
);

-- Tabla de relacion entre pagos y facturas
CREATE TABLE payment_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    
    amount DECIMAL(18,2) NOT NULL,               -- Monto de esta factura en el pago
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(payment_id, invoice_id)
);

CREATE INDEX idx_payments_driver ON payments(driver_id);
CREATE INDEX idx_payments_flotillero ON payments(flotillero_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_week ON payments(payment_year, payment_week);
CREATE INDEX idx_payment_invoices_payment ON payment_invoices(payment_id);
CREATE INDEX idx_payment_invoices_invoice ON payment_invoices(invoice_id);
```

---

## 10. Tabla de Historial (payment_history)

```sql
CREATE TABLE payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    
    -- Estado anterior y nuevo
    previous_status payment_status,
    new_status payment_status NOT NULL,
    
    -- Quien hizo el cambio
    changed_by UUID,
    changed_by_name VARCHAR(200),
    
    -- Razon del cambio
    reason TEXT,
    
    -- Metadata adicional
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_history_payment ON payment_history(payment_id);
CREATE INDEX idx_payment_history_created ON payment_history(created_at);
```

---

## 11. Tabla de Auditoria (audit_log)

```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Tabla y registro afectado
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    
    -- Tipo de operacion
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

## 12. Tabla de Usuarios Administrativos (admin_users)

> **NUEVO en v3.0**: Sistema de administracion con roles y permisos.

```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Vinculacion con autenticacion
    auth_user_id UUID UNIQUE NOT NULL,          -- Referencia a auth.users en Supabase
    
    -- Informacion del usuario
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    
    -- Rol y permisos
    role admin_role DEFAULT 'viewer',           -- super_admin, finance, operations, viewer
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoria
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indices
CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_auth_id ON admin_users(auth_user_id);
CREATE INDEX idx_admin_users_role ON admin_users(role);
CREATE INDEX idx_admin_users_active ON admin_users(is_active) WHERE is_active = true;

COMMENT ON TABLE admin_users IS 'Usuarios administrativos del sistema FacturaFlow';
COMMENT ON COLUMN admin_users.role IS 'super_admin: todo, finance: reportes/pagos, operations: facturas, viewer: solo lectura';

-- Tabla de auditoria de acciones de admin
CREATE TABLE admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES admin_users(id),
    action VARCHAR(100) NOT NULL,               -- login, logout, view, export, update_status
    entity_type VARCHAR(50),                    -- invoice, driver, flotillero
    entity_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_admin_id ON admin_audit_log(admin_user_id);
CREATE INDEX idx_admin_audit_action ON admin_audit_log(action);
CREATE INDEX idx_admin_audit_created ON admin_audit_log(created_at DESC);
```

---

## 13. Tabla de Configuracion del Sistema (system_config)

> **NUEVO en v3.0**: Configuraciones globales administrables desde el panel de admin.

```sql
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',     -- payments, export, notifications, etc.
    is_sensitive BOOLEAN DEFAULT false,         -- Ocultar valores en UI
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES admin_users(id)
);

CREATE INDEX idx_system_config_category ON system_config(category);

COMMENT ON TABLE system_config IS 'Configuraciones globales del sistema administrables';
COMMENT ON COLUMN system_config.category IS 'Categoria para agrupar (payments, export, notifications)';

-- Configuraciones iniciales
INSERT INTO system_config (key, value, description, category) VALUES
('payment_source_account', '{
    "account_number": "012180001182078281",
    "institution_id": "BBVA_MEXICO_MX",
    "institution_name": "BBVA Mexico",
    "account_type": "clabe"
}', 'Cuenta bancaria origen para dispersion de pagos', 'payments'),

('pronto_pago_config', '{
    "fee_rate": 0.08,
    "processing_days": 1,
    "enabled": true
}', 'Configuracion del programa Pronto Pago', 'payments'),

('payment_week_config', '{
    "allowed_weeks_behind": 3,
    "payment_day": "monday",
    "cutoff_day": "friday"
}', 'Configuracion de ventanas de pago por semana', 'payments'),

('export_config', '{
    "xlsx_template": "shinkansen",
    "include_pending": false,
    "default_currency": "MXN"
}', 'Configuracion para exportacion de archivos de pago', 'export');
```

---

## 14. Tabla de API Keys

> **NUEVO en v3.0**: Sistema de API Keys para acceso programatico.

```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Identificacion
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Seguridad
    key_hash VARCHAR(64) NOT NULL,              -- SHA-256 del key completo
    key_prefix VARCHAR(12) NOT NULL UNIQUE,      -- Prefijo para identificacion (pk_xxxxxxxx)
    
    -- Permisos
    scopes TEXT[] DEFAULT ARRAY['public'],       -- public, admin, export, user
    
    -- Rate limiting
    rate_limit_per_minute INTEGER DEFAULT 60,
    rate_limit_per_day INTEGER DEFAULT 10000,
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    -- Auditoria
    created_by UUID REFERENCES admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    last_used_ip VARCHAR(45),
    total_requests INTEGER DEFAULT 0,
    
    -- Expiracion opcional
    expires_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

COMMENT ON TABLE api_keys IS 'API Keys para acceso programatico a la API';
COMMENT ON COLUMN api_keys.key_hash IS 'Hash SHA-256 del API key (nunca almacenar en texto plano)';
COMMENT ON COLUMN api_keys.scopes IS 'Permisos: public, admin, export, user';

-- Tabla de logs de uso de API Keys
CREATE TABLE api_key_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    
    -- Request info
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_key_usage_key ON api_key_usage_log(api_key_id);
CREATE INDEX idx_api_key_usage_date ON api_key_usage_log(created_at);
```

---

## 15. Autenticacion de Usuarios (flotilleros)

> **NUEVO en v3.0**: Sistema de login para flotilleros y drivers independientes.

### 15.1 Tabla de Sesiones de Usuario

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flotillero_id UUID NOT NULL REFERENCES flotilleros(id) ON DELETE CASCADE,
    
    -- Token de sesion
    token_hash VARCHAR(64) NOT NULL,            -- SHA-256 del token
    
    -- Metadata de sesion
    ip_address VARCHAR(45),
    user_agent TEXT,
    device_info JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    revoked_at TIMESTAMPTZ,
    revoked_reason VARCHAR(100)
);

CREATE INDEX idx_user_sessions_flotillero ON user_sessions(flotillero_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, expires_at) WHERE is_active = true;

COMMENT ON TABLE user_sessions IS 'Sesiones activas de usuarios (flotilleros/drivers)';
```

### 15.2 Tabla de Auditoria de Autenticacion

```sql
CREATE TABLE user_auth_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flotillero_id UUID REFERENCES flotilleros(id) ON DELETE SET NULL,
    
    -- Tipo de evento
    event_type VARCHAR(50) NOT NULL,            -- login, logout, failed_login, password_reset, magic_link
    
    -- Resultado
    success BOOLEAN NOT NULL,
    failure_reason TEXT,
    
    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_auth_log_flotillero ON user_auth_log(flotillero_id);
CREATE INDEX idx_user_auth_log_event ON user_auth_log(event_type);
CREATE INDEX idx_user_auth_log_date ON user_auth_log(created_at);

COMMENT ON TABLE user_auth_log IS 'Log de eventos de autenticacion para auditoria';
```

---

## 16. Indices

```sql
-- Indices adicionales para optimizacion

-- Busqueda full-text en descripciones de conceptos
CREATE INDEX idx_invoice_items_description_trgm ON invoice_items 
USING gin (description gin_trgm_ops);

-- Busqueda por nombre de driver
CREATE INDEX idx_drivers_name_trgm ON drivers 
USING gin ((first_name || ' ' || last_name) gin_trgm_ops);

-- Busqueda por nombre de flotillero
CREATE INDEX idx_flotilleros_name_trgm ON flotilleros 
USING gin (fiscal_name gin_trgm_ops);

-- Indice compuesto para reportes por semana
CREATE INDEX idx_invoices_week_status ON invoices(payment_year, payment_week, status);

-- Indice para facturas pendientes de pago
CREATE INDEX idx_invoices_pending ON invoices(status) 
WHERE status IN ('approved', 'pending_payment');

-- Indice parcial para drivers activos
CREATE INDEX idx_drivers_active ON drivers(rfc, email) 
WHERE status = 'active';

-- Indice parcial para flotilleros activos
CREATE INDEX idx_flotilleros_active ON flotilleros(rfc, email) 
WHERE status = 'active';
```

---

## 17. Funciones y Triggers

### 13.1 Funcion para actualizar updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updated_at
CREATE TRIGGER update_flotilleros_updated_at
    BEFORE UPDATE ON flotilleros
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

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

### 13.2 Funcion para validar relacion driver-flotillero en facturas

```sql
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

CREATE TRIGGER trg_validate_invoice_driver
    BEFORE INSERT OR UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION validate_invoice_driver_flotillero();
```

### 13.3 Funcion para generar referencia de pago

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

### 13.4 Funcion para registrar historial de pagos

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

### 13.5 Funcion para actualizar estado de factura al pagar

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

---

## 18. Vistas

### 14.1 Vista de facturas con detalles completos

```sql
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
    -- Datos del driver que opero (si aplica)
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
```

### 14.2 Vista de flotilleros con sus drivers

```sql
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
```

### 14.3 Vista de resumen de pagos por semana

```sql
CREATE OR REPLACE VIEW v_payment_summary_by_week AS
SELECT 
    payment_year,
    payment_week,
    project_id,
    p.name AS project_name,
    COUNT(DISTINCT COALESCE(pay.driver_id, pay.flotillero_id)) AS total_beneficiarios,
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

### 14.4 Vista de facturas pendientes de pago

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
    -- Driver operador
    d.id AS driver_id,
    CONCAT(d.first_name, ' ', d.last_name) AS driver_name,
    d.rfc AS driver_rfc,
    d.bank_clabe,
    -- Facturador
    f.id AS biller_id,
    f.fiscal_name AS biller_name,
    f.rfc AS biller_rfc,
    f.type AS biller_type,
    -- Proyecto
    p.name AS project_name,
    i.submitted_at,
    EXTRACT(DAY FROM NOW() - i.submitted_at) AS days_pending
FROM invoices i
LEFT JOIN drivers d ON i.driver_id = d.id
LEFT JOIN flotilleros f ON i.biller_id = f.id
LEFT JOIN projects p ON i.project_id = p.id
WHERE i.status IN ('approved', 'pending_payment')
ORDER BY i.payment_year, i.payment_week, i.submitted_at;
```

### 14.5 Vista de dashboard de flotillero

```sql
CREATE OR REPLACE VIEW v_flotillero_dashboard AS
SELECT 
    f.id AS flotillero_id,
    f.fiscal_name AS flotillero_name,
    f.rfc,
    f.type AS flotillero_type,
    f.status AS flotillero_status,
    
    -- Drivers asociados
    COUNT(DISTINCT d.id) AS total_drivers,
    
    -- Facturas
    COUNT(DISTINCT i.id) AS total_invoices,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status = 'paid') AS paid_invoices,
    COUNT(DISTINCT i.id) FILTER (WHERE i.status IN ('pending_review', 'approved', 'pending_payment')) AS pending_invoices,
    
    -- Montos
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status = 'paid'), 0) AS total_paid,
    COALESCE(SUM(i.total_amount) FILTER (WHERE i.status IN ('pending_review', 'approved', 'pending_payment')), 0) AS total_pending,
    
    -- Ultima actividad
    MAX(i.submitted_at) AS last_invoice_date,
    MAX(pay.completed_date) AS last_payment_date
    
FROM flotilleros f
LEFT JOIN drivers d ON d.flotillero_id = f.id
LEFT JOIN invoices i ON i.biller_id = f.id
LEFT JOIN payment_invoices pi ON i.id = pi.invoice_id
LEFT JOIN payments pay ON pi.payment_id = pay.id AND pay.status = 'completed'
GROUP BY f.id, f.fiscal_name, f.rfc, f.type, f.status;
```

---

## 19. Row Level Security (RLS)

```sql
-- Habilitar RLS en tablas principales
ALTER TABLE flotilleros ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Politica para flotilleros (solo pueden ver sus propios datos)
CREATE POLICY "Flotilleros can view own data" ON flotilleros
    FOR SELECT
    USING (auth.uid()::text = id::text OR auth.jwt() ->> 'role' = 'admin');

-- Politica para drivers
CREATE POLICY "Drivers can view own data" ON drivers
    FOR SELECT
    USING (auth.uid()::text = id::text OR auth.jwt() ->> 'role' = 'admin');

-- Politica para facturas
CREATE POLICY "Users can view related invoices" ON invoices
    FOR SELECT
    USING (
        driver_id::text = auth.uid()::text 
        OR biller_id::text = auth.uid()::text
        OR auth.jwt() ->> 'role' IN ('admin', 'reviewer')
    );

CREATE POLICY "Users can insert invoices" ON invoices
    FOR INSERT
    WITH CHECK (
        driver_id::text = auth.uid()::text
        OR biller_id::text = auth.uid()::text
    );

-- Politica para pagos (solo lectura para beneficiarios)
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT
    USING (
        driver_id::text = auth.uid()::text 
        OR flotillero_id::text = auth.uid()::text
        OR auth.jwt() ->> 'role' IN ('admin', 'finance')
    );

-- Politicas para admins (acceso total)
CREATE POLICY "Admins have full access to flotilleros" ON flotilleros
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'admin');

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

## 20. Queries de Ejemplo

### 20.1 Insertar factura con soporte para flotilleros

```sql
-- Funcion para insertar factura considerando flotilleros
CREATE OR REPLACE FUNCTION insert_invoice_v2(payload JSONB)
RETURNS UUID AS $$
DECLARE
    new_invoice_id UUID;
    v_flotillero_id UUID;
    v_driver_id UUID;
    item JSONB;
BEGIN
    -- Buscar o crear flotillero (quien factura)
    INSERT INTO flotilleros (rfc, fiscal_name, email, phone, fiscal_regime_code, type)
    VALUES (
        payload->'issuer'->>'rfc',
        payload->'issuer'->>'name',
        payload->'contact'->>'email',
        payload->'contact'->>'phone',
        SUBSTRING(payload->'issuer'->>'regime' FROM 1 FOR 3),
        'independiente'
    )
    ON CONFLICT (rfc) DO UPDATE SET
        fiscal_name = EXCLUDED.fiscal_name,
        updated_at = NOW()
    RETURNING id INTO v_flotillero_id;

    -- Buscar o crear driver (puede ser el mismo que el flotillero)
    INSERT INTO drivers (rfc, fiscal_name, first_name, last_name, email, phone, fiscal_regime_code, flotillero_id)
    VALUES (
        payload->'issuer'->>'rfc',
        payload->'issuer'->>'name',
        SPLIT_PART(payload->'issuer'->>'name', ' ', 1),
        SUBSTRING(payload->'issuer'->>'name' FROM POSITION(' ' IN payload->'issuer'->>'name') + 1),
        payload->'contact'->>'email',
        payload->'contact'->>'phone',
        SUBSTRING(payload->'issuer'->>'regime' FROM 1 FOR 3),
        v_flotillero_id
    )
    ON CONFLICT (rfc) DO UPDATE SET
        fiscal_name = EXCLUDED.fiscal_name,
        flotillero_id = COALESCE(drivers.flotillero_id, v_flotillero_id),
        updated_at = NOW()
    RETURNING id INTO v_driver_id;

    -- Insertar factura
    INSERT INTO invoices (
        driver_id,
        biller_id,
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
        v_driver_id,
        v_flotillero_id,
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
    FROM projects p
    WHERE p.code = UPPER(REPLACE(payload->>'project', ' ', '_'))
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

### 20.2 Obtener drivers de un flotillero

```sql
SELECT 
    d.id,
    d.first_name || ' ' || d.last_name AS nombre_completo,
    d.rfc,
    d.email,
    d.status,
    COUNT(i.id) AS total_facturas,
    COALESCE(SUM(i.total_amount), 0) AS total_facturado
FROM drivers d
LEFT JOIN invoices i ON i.operated_by_driver_id = d.id
WHERE d.flotillero_id = 'UUID_DEL_FLOTILLERO'
GROUP BY d.id, d.first_name, d.last_name, d.rfc, d.email, d.status
ORDER BY d.first_name;
```

### 20.3 Reporte de facturacion por flotillero

```sql
SELECT 
    f.fiscal_name AS flotillero,
    f.rfc AS rfc_flotillero,
    f.type AS tipo,
    COUNT(DISTINCT d.id) AS drivers_asociados,
    COUNT(i.id) AS total_facturas,
    SUM(i.subtotal) AS subtotal,
    SUM(i.total_tax) AS iva_trasladado,
    SUM(i.retention_iva) AS retencion_iva,
    SUM(i.retention_isr) AS retencion_isr,
    SUM(i.total_amount) AS total,
    SUM(i.total_amount - i.retention_iva - i.retention_isr) AS neto_a_pagar
FROM flotilleros f
LEFT JOIN drivers d ON d.flotillero_id = f.id
LEFT JOIN invoices i ON i.biller_id = f.id
WHERE i.payment_year = 2026
GROUP BY f.id, f.fiscal_name, f.rfc, f.type
ORDER BY total DESC;
```

---

## Notas de Implementacion

### Modelo de Datos Flotilleros vs Independientes

```
FLOTILLERO (type = 'flotillero')
├── Puede tener multiples drivers asociados
├── Factura por los trabajos de sus drivers
├── El pago va al flotillero
└── Ejemplo: Empresa con flota de 10 camionetas

INDEPENDIENTE (type = 'independiente')
├── max_drivers = 1 (solo el mismo)
├── Factura por su propio trabajo
├── Driver y flotillero son la misma entidad fiscal
└── Ejemplo: Repartidor que trabaja por su cuenta
```

### Consideraciones de Seguridad
- Las CLABE y numeros de cuenta deberian encriptarse usando `pgcrypto`
- Implementar rate limiting en las funciones de insercion
- Usar transacciones para operaciones criticas

### Mantenimiento
- Crear indices parciales para queries frecuentes
- Implementar particionamiento por ano si el volumen crece
- Configurar vacuum automatico para tablas de auditoria

### Backup
- Configurar backups diarios de Supabase
- Exportar auditoria mensualmente a almacenamiento frio

---

## Migraciones

### Migracion de v1.0 a v2.0

Ejecutar el archivo `002_add_flotilleros.sql` que:
1. Crea el tipo `biller_type`
2. Crea la tabla `flotilleros`
3. Agrega `flotillero_id` a `drivers`
4. Agrega `biller_id` y `operated_by_driver_id` a `invoices`
5. Migra datos existentes
6. Crea vistas actualizadas

---

**Generado para:** FacturaFlow AI  
**Version del esquema:** 3.0.0  
**Ultima actualizacion:** Enero 2026

---

## Historial de Migraciones

| Migracion | Descripcion |
|-----------|-------------|
| 001_initial_schema.sql | Esquema inicial con facturas y drivers |
| 002_add_flotilleros.sql | Agregar soporte para flotilleros |
| 003_add_pronto_pago.sql | Programa de pago anticipado con 8% descuento |
| 004_add_admin_users.sql | Sistema de administracion con roles |
| 005_seed_admin_user.sql | Usuario administrador inicial |
| 006_add_bank_info.sql | Informacion bancaria en flotilleros |
| 007_add_system_config.sql | Configuracion del sistema administrable |
| 008_add_api_keys.sql | Sistema de API Keys |
| 009_add_user_auth.sql | Autenticacion de usuarios (flotilleros/drivers) |
