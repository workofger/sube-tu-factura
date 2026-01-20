# Arquitectura de FacturaFlow AI

Este documento describe la arquitectura tecnica, flujos de datos y decisiones de diseno del sistema.

---

## Vision General

FacturaFlow AI es una aplicacion de una sola pagina (SPA) con:
- **Frontend**: React + Vite desplegado como assets estaticos
- **Backend**: Vercel Serverless Functions (Node.js)
- **Base de datos**: Supabase (PostgreSQL gestionado)
- **Almacenamiento**: Google Drive via Service Account
- **IA**: OpenAI GPT-4o para extraccion de datos

---

## Flujo de Datos Completo

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FLUJO PRINCIPAL                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. CARGA DE ARCHIVOS                                                   │
│     Usuario arrastra XML + PDF                                          │
│              │                                                          │
│              ▼                                                          │
│  ┌─────────────────────┐                                                │
│  │   FileUpload.tsx    │  Valida tipos, tamano                          │
│  └──────────┬──────────┘                                                │
│              │                                                          │
│  2. EXTRACCION CON IA                                                   │
│              ▼                                                          │
│  ┌─────────────────────┐     ┌─────────────────────┐                    │
│  │ openaiService.ts    │────▶│   OpenAI GPT-4o     │                    │
│  │ - Lee XML como texto│     │   - Analiza XML     │                    │
│  │ - PDF a Base64      │     │   - Extrae campos   │                    │
│  └──────────┬──────────┘     │   - Retorna JSON    │                    │
│              │               └─────────────────────┘                    │
│              ▼                                                          │
│  3. REVISION Y EDICION                                                  │
│  ┌─────────────────────┐                                                │
│  │  Formulario React   │  Usuario revisa/edita datos                    │
│  │  - FiscalInfoSection│                                                │
│  │  - PaymentSection   │                                                │
│  │  - ItemsTable       │                                                │
│  └──────────┬──────────┘                                                │
│              │                                                          │
│  4. ENVIO AL BACKEND                                                    │
│              ▼                                                          │
│  ┌─────────────────────┐     ┌─────────────────────┐                    │
│  │ webhookService.ts   │────▶│  POST /api/invoice  │                    │
│  │ - Construye payload │     │  Vercel Function    │                    │
│  │ - Archivos Base64   │     └──────────┬──────────┘                    │
│  └─────────────────────┘                │                               │
│                                         │                               │
│  5. PROCESAMIENTO BACKEND               ▼                               │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                      api/invoice.ts                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │ 1. Validar  │─▶│ 2. Check    │─▶│ 3. Upsert   │               │   │
│  │  │    Payload  │  │    UUID     │  │    Driver   │               │   │
│  │  └─────────────┘  └─────────────┘  └──────┬──────┘               │   │
│  │                                           │                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────▼──────┐               │   │
│  │  │ 6. Save     │◀─│ 5. Upload   │◀─│ 4. Insert   │               │   │
│  │  │    Files DB │  │    to Drive │  │    Invoice  │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  6. RESPUESTA                                                           │
│              ▼                                                          │
│  ┌─────────────────────┐                                                │
│  │   Mensaje exito     │  + IDs + Links de Drive                        │
│  └─────────────────────┘                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Modelo de Base de Datos

### Diagrama Entidad-Relacion

```
                              ┌─────────────────┐
                              │    projects     │
                              │─────────────────│
                              │ id (PK)         │
                              │ code (UK)       │
                              │ name            │
                              │ color           │
                              │ sort_order      │
                              │ is_active       │
                              └────────┬────────┘
                                       │
         ┌─────────────────┐           │
         │   flotilleros   │           │
         │─────────────────│           │
         │ id (PK)         │           │
         │ rfc (UK)        │◄──────────│───────────────────┐
         │ fiscal_name     │           │                   │
         │ type            │           │                   │
         │ max_drivers     │           │                   │
         │ status          │           │                   │
         └────────┬────────┘           │                   │
                  │                    │                   │
                  │ 1:N                │                   │
                  ▼                    │                   │
         ┌─────────────────┐           │                   │
         │     drivers     │           │                   │
         │─────────────────│           │                   │
         │ id (PK)         │           │                   │
         │ rfc (UK)        │           │                   │
         │ first_name      │           │                   │
         │ last_name       │           │                   │
         │ email           │           │                   │
         │ flotillero_id   │───────────┘                   │
         │ status          │                               │
         └────────┬────────┘                               │
                  │                                        │
                  │ 1:N                                    │
                  ▼                                        │
         ┌─────────────────────────────────────────────────┴───┐
         │                      invoices                       │
         │─────────────────────────────────────────────────────│
         │ id (PK)                                             │
         │ uuid (UK)              -- Folio fiscal SAT          │
         │ driver_id (FK)         -- Driver asociado           │
         │ biller_id (FK)         -- Flotillero que factura    │
         │ operated_by_driver_id  -- Quien hizo el trabajo     │
         │ project_id (FK)        -- Proyecto                  │
         │ issuer_rfc, issuer_name                             │
         │ receiver_rfc, receiver_name                         │
         │ subtotal, total_tax, total_amount                   │
         │ payment_method, payment_form                        │
         │ payment_week, payment_year                          │
         │ status                                              │
         └───────────────────────┬─────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
              ▼                  ▼                  ▼
     ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
     │  invoice_items  │ │  invoice_files  │ │    payments     │
     │─────────────────│ │─────────────────│ │─────────────────│
     │ id (PK)         │ │ id (PK)         │ │ id (PK)         │
     │ invoice_id (FK) │ │ invoice_id (FK) │ │ driver_id (FK)  │
     │ description     │ │ file_type       │ │ flotillero_id   │
     │ quantity        │ │ google_drive_id │ │ net_amount      │
     │ unit_price      │ │ google_drive_url│ │ status          │
     │ amount          │ └─────────────────┘ └─────────────────┘
     └─────────────────┘
```

### Tipos de Facturadores (flotilleros.type)

| Tipo | Descripcion | max_drivers |
|------|-------------|-------------|
| `flotillero` | Empresa con flota de repartidores | N |
| `independiente` | Driver que factura por si mismo | 1 |

### Por que Flotilleros?

**Problema**: En el negocio de entregas, hay dos modelos:
1. Drivers independientes que facturan directamente
2. "Flotilleros" (duenos de flotillas) que facturan por sus empleados

**Solucion**: La tabla `flotilleros` representa a quien emite la factura (persona fisica o moral que tiene el RFC). Un `driver` puede pertenecer a un `flotillero` o ser independiente.

---

## Integraciones Externas

### OpenAI GPT-4o

**Uso**: Extraccion de datos de facturas CFDI desde XML/PDF.

**Flujo**:
```
XML (texto) + PDF (base64) 
    │
    ▼
┌─────────────────────────────────────┐
│  OpenAI Chat Completions API        │
│  Modelo: gpt-4o                     │
│  response_format: json_object       │
│  Prompt: Instrucciones de CFDI 4.0  │
└─────────────────────────────────────┘
    │
    ▼
JSON estructurado con todos los campos
```

**Por que OpenAI vs Gemini?**
- API mas estable y documentada
- Mejor soporte para JSON estructurado
- GPT-4o tiene vision para PDFs
- Menos problemas de autenticacion

### Supabase

**Uso**: Base de datos PostgreSQL gestionada + autenticacion.

**Conexion**: Service Role Key (bypass RLS) para operaciones del backend.

```typescript
// api/lib/supabase.ts
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

**Operaciones principales**:
- `checkUuidExists()` - Verificar duplicados
- `upsertFlotillero()` - Crear/actualizar facturador
- `upsertDriver()` - Crear/actualizar driver
- `insertInvoice()` - Guardar factura
- `saveFileRecord()` - Registrar archivos subidos

### Google Drive

**Uso**: Almacenamiento de archivos XML/PDF organizados.

**Autenticacion**: Service Account con acceso a carpeta compartida.

**Estructura de carpetas**:
```
📁 Root Folder (GOOGLE_DRIVE_ROOT_FOLDER_ID)
├── 📁 Semana_01_2026
│   ├── 📁 MERCADO_LIBRE
│   │   ├── 📁 XAXX010101000_Juan_Perez
│   │   │   ├── uuid-1234.xml
│   │   │   └── uuid-1234.pdf
│   │   └── 📁 YAXX020202000_Maria_Lopez
│   │       └── ...
│   └── 📁 AMAZON
│       └── ...
└── 📁 Semana_02_2026
    └── ...
```

**Por que esta estructura?**
- **Semana**: Facilita busqueda por periodo de pago
- **Proyecto**: Agrupa por cliente (Mercado Libre, Amazon, etc.)
- **Facturador**: Agrupa por quien emite la factura

---

## Decisiones Tecnicas

### Frontend

| Decision | Razon |
|----------|-------|
| Vite (no CRA) | Mas rapido, mejor DX, ES modules nativo |
| Tailwind CSS | Desarrollo rapido, consistencia, tree-shaking |
| Sin estado global | App simple, props drilling suficiente |
| Hooks personalizados | Separacion de logica, reutilizacion |

### Backend

| Decision | Razon |
|----------|-------|
| Vercel Functions | Zero config, mismo repo, edge network |
| ES Modules | Consistencia con frontend, features modernos |
| No ORM | Queries simples, Supabase client suficiente |
| Service Account | Acceso server-side sin tokens de usuario |

### Seguridad

| Aspecto | Implementacion |
|---------|----------------|
| API Keys | Variables de entorno, nunca en codigo |
| OpenAI en browser | `dangerouslyAllowBrowser: true` (acepta el riesgo) |
| Supabase | Service Role Key solo en backend |
| Google Drive | Service Account, carpeta especifica |
| Validacion | Backend valida todo, frontend es solo UX |

---

## Escalabilidad

### Limitaciones Actuales

- **OpenAI**: Rate limits segun plan
- **Vercel Functions**: 10s timeout (free), 30s (pro)
- **Supabase**: 500MB DB (free tier)
- **Google Drive**: 15GB storage por cuenta

### Mejoras Futuras

1. **Cache de proyectos**: Reducir queries repetidas
2. **Queue para uploads**: Archivos grandes async
3. **Batch processing**: Multiples facturas a la vez
4. **CDN para PDFs**: Servir previews desde edge

---

## Testing

### Manual (actual)
- Subir factura de prueba
- Verificar extraccion
- Confirmar guardado en DB
- Verificar archivos en Drive

### Recomendado (futuro)
```
/tests
├── unit/
│   ├── validators.test.ts
│   └── formatters.test.ts
├── integration/
│   ├── api/invoice.test.ts
│   └── api/projects.test.ts
└── e2e/
    └── upload-flow.test.ts
```

---

## Monitoreo

### Logs de Vercel

Cada request a `/api/*` genera logs con:
- Timestamp
- HTTP method y path
- Status code
- Duration
- console.log/error del codigo

### Metricas recomendadas

- Tiempo de extraccion OpenAI
- Tasa de exito de uploads
- Facturas duplicadas detectadas
- Errores por tipo

---

## Glosario

| Termino | Significado |
|---------|-------------|
| **CFDI** | Comprobante Fiscal Digital por Internet |
| **UUID** | Identificador unico del timbre fiscal |
| **RFC** | Registro Federal de Contribuyentes |
| **Flotillero** | Dueno de flota que factura por sus drivers |
| **PUE** | Pago en Una Exhibicion |
| **PPD** | Pago en Parcialidades o Diferido |
| **SAT** | Servicio de Administracion Tributaria (Mexico) |
