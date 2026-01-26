# FacturaFlow AI

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)

**Sistema inteligente de gestion de facturas CFDI con extraccion automatica mediante IA**

[Demo](https://sube-tu-factura.vercel.app) | [Documentacion API](docs/api/README.md) | [Arquitectura](ARCHITECTURE.md)

</div>

---

## Que es FacturaFlow AI?

FacturaFlow AI es una aplicacion web que automatiza el procesamiento de facturas CFDI (Comprobante Fiscal Digital por Internet) mexicanas. 

**Flujo principal:**
1. Usuario sube archivos XML/PDF de factura
2. OpenAI GPT-4o extrae automaticamente todos los datos
3. Usuario revisa y confirma la informacion
4. Sistema guarda en Supabase y sube archivos a Google Drive
5. Archivos organizados por: Semana > Proyecto > Facturador

---

## Caracteristicas Principales

| Frontend | Backend | IA |
|----------|---------|-----|
| React 18 + TypeScript | Vercel Serverless Functions | OpenAI GPT-4o |
| Tailwind CSS | Supabase (PostgreSQL) | Extraccion de XML/PDF |
| Drag & Drop archivos | Google Drive API | Deteccion de proyecto |
| Formulario editable | Validacion de duplicados | JSON estructurado |

---

## Arquitectura

```
┌────────────────────────────────────────────────────────────┐
│                      USUARIO                               │
│                   Sube XML + PDF                           │
└─────────────────────────┬──────────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ FileUpload   │  │ OpenAI API   │  │ Form + Validate  │  │
│  │ Component    │─▶│ Extraction   │─▶│ Components       │  │
│  └──────────────┘  └──────────────┘  └────────┬─────────┘  │
└───────────────────────────────────────────────┼────────────┘
                                                │
                          POST /api/invoice     │
                                                ▼
┌────────────────────────────────────────────────────────────┐
│                 BACKEND (Vercel Functions)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Validate     │  │ Supabase     │  │ Google Drive     │  │
│  │ Payload      │─▶│ Save Data    │─▶│ Upload Files     │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────────────────────────────────────────┘
                          │                    │
                          ▼                    ▼
                   ┌────────────┐       ┌─────────────┐
                   │ PostgreSQL │       │Google Drive │
                   │ (Supabase) │       │   Folders   │
                   └────────────┘       └─────────────┘
```

---

## Quick Start

### 1. Clonar e instalar

```bash
git clone https://github.com/workofger/sube-tu-factura.git
cd sube-tu-factura
npm install
```

### 2. Configurar variables de entorno

Crear `.env.local`:

```env
# OpenAI (Backend - extraccion IA)
OPENAI_API_KEY=sk-...

# Supabase (Backend)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Drive (Backend)
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID=1AbCdEfGhIjKlMnOp

# Configuracion
EXPECTED_RECEIVER_RFC=BLI180227F23
```

### 3. Ejecutar base de datos

En Supabase SQL Editor, ejecutar en orden:
```sql
-- database/001_initial_schema.sql
-- database/002_add_flotilleros.sql
```

### 4. Iniciar desarrollo

```bash
npm run dev
```

Abrir http://localhost:3000

---

## Estructura del Proyecto

```
sube-tu-factura/
│
├── api/                          # Backend (Vercel Functions)
│   ├── health.ts                 # GET  /api/health
│   ├── invoice.ts                # POST /api/invoice
│   ├── projects.ts               # GET  /api/projects
│   ├── validate.ts               # POST /api/validate
│   └── lib/
│       ├── supabase.ts           # Cliente DB + operaciones
│       ├── googleDrive.ts        # Cliente Drive + uploads
│       ├── validators.ts         # Validacion de datos
│       └── types.ts              # Tipos TypeScript
│
├── src/                          # Frontend (React)
│   ├── components/
│   │   ├── common/               # FileUpload, InputField, SelectField
│   │   ├── layout/               # Header, WhatsAppButton
│   │   └── sections/             # FiscalInfo, Payment, Items
│   ├── hooks/
│   │   ├── useInvoiceForm.ts     # Estado del formulario
│   │   ├── useInvoiceExtraction.ts
│   │   └── useProjects.ts
│   ├── services/
│   │   ├── openaiService.ts      # Integracion OpenAI
│   │   └── webhookService.ts     # Comunicacion con API
│   └── types/
│       └── invoice.ts            # Tipos de factura
│
├── database/
│   ├── 001_initial_schema.sql    # Schema inicial
│   ├── 002_add_flotilleros.sql   # Migracion flotilleros
│   └── schema.md                 # Documentacion DB
│
├── docs/api/
│   ├── README.md                 # Guia de integracion
│   ├── SETUP.md                  # Guia de configuracion
│   ├── openapi.yaml              # Especificacion OpenAPI
│   └── postman.json              # Coleccion Postman
│
├── .cursorrules                  # Contexto para Cursor AI
├── ARCHITECTURE.md               # Documentacion tecnica
├── vercel.json                   # Config Vercel
├── tsconfig.json                 # Config TS frontend
└── tsconfig.api.json             # Config TS backend
```

---

## Modelo de Datos

### Entidades Principales

```
┌─────────────────┐       ┌─────────────────┐
│   flotilleros   │       │    projects     │
│─────────────────│       │─────────────────│
│ id              │       │ id              │
│ rfc (unique)    │       │ code            │
│ fiscal_name     │       │ name            │
│ type            │◄──┐   │ color           │
│ status          │   │   └────────┬────────┘
└────────┬────────┘   │            │
         │            │            │
         │ 1:N        │            │
         ▼            │            │
┌─────────────────┐   │   ┌────────▼────────┐
│     drivers     │   │   │    invoices     │
│─────────────────│   │   │─────────────────│
│ id              │   │   │ id              │
│ rfc (unique)    │   │   │ uuid (unique)   │
│ first_name      │   │   │ driver_id ──────┼──► drivers
│ last_name       │   └───│ biller_id       │
│ flotillero_id ──┼───────│ project_id ─────┼──► projects
│ status          │       │ total_amount    │
└─────────────────┘       │ status          │
                          └─────────────────┘
```

### Tipos de Facturadores

| Tipo | Descripcion |
|------|-------------|
| `flotillero` | Dueno de flota con multiples drivers |
| `independiente` | Driver que factura por si mismo |

---

## API Endpoints

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| `GET` | `/api/health` | Estado de servicios (Supabase, Drive) |
| `GET` | `/api/projects` | Lista de proyectos activos |
| `POST` | `/api/validate` | Verificar si UUID existe |
| `POST` | `/api/invoice` | Procesar y guardar factura |

### Ejemplo: Enviar factura

```bash
curl -X POST https://tu-app.vercel.app/api/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "week": 4,
    "project": "MERCADO LIBRE",
    "issuer": {
      "rfc": "XAXX010101000",
      "name": "Juan Perez"
    },
    "receiver": {
      "rfc": "BLI180227F23"
    },
    "invoice": {
      "uuid": "3FA85F64-5717-4562-B3FC-2C963F66AFA6",
      "date": "2026-01-20"
    },
    "payment": {
      "method": "PUE"
    },
    "financial": {
      "subtotal": 10000,
      "totalTax": 1600,
      "totalAmount": 11600,
      "currency": "MXN"
    },
    "items": [...],
    "files": {
      "xml": { "name": "f.xml", "content": "BASE64...", "mimeType": "application/xml" }
    }
  }'
```

---

## Despliegue en Vercel

### 1. Conectar repositorio

1. Ir a [vercel.com](https://vercel.com)
2. Import Git Repository
3. Seleccionar `sube-tu-factura`

### 2. Configurar variables de entorno

En Vercel > Settings > Environment Variables:

| Variable | Scope | Descripción |
|----------|-------|-------------|
| `OPENAI_API_KEY` | All | API key de OpenAI (server-side) |
| `SUPABASE_URL` | All | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | All | Service role key de Supabase |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | All | Email de la cuenta de servicio de Google |
| `GOOGLE_PRIVATE_KEY` | All | Clave privada de la cuenta de servicio |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | All | ID de la carpeta raíz en Drive |
| `EXPECTED_RECEIVER_RFC` | All | RFC esperado del receptor |

### 3. Deploy

Push a `main` triggers automatic deployment.

---

## Documentacion Adicional

- [ARCHITECTURE.md](ARCHITECTURE.md) - Decisiones tecnicas y flujos detallados
- [docs/api/README.md](docs/api/README.md) - Guia de integracion API
- [docs/api/SETUP.md](docs/api/SETUP.md) - Configuracion paso a paso
- [database/schema.md](database/schema.md) - Esquema completo de BD

---

## Contribuir

1. Fork del repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

---

## Licencia

MIT License - Ver [LICENSE](LICENSE)

---

<div align="center">

**Hecho con amor por PartRunner**

[@workofger](https://github.com/workofger)

</div>
