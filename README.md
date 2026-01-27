# FacturaFlow AI

<div align="center">

![Version](https://img.shields.io/badge/version-2.3.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)

**Sistema inteligente de gestión de facturas CFDI con extracción automática mediante IA**

[Demo](https://sube-tu-factura.vercel.app) | [API Docs](https://sube-tu-factura.vercel.app/docs/) | [Arquitectura](ARCHITECTURE.md)

</div>

---

## ¿Qué es FacturaFlow AI?

FacturaFlow AI es una aplicación web que automatiza el procesamiento de facturas CFDI (Comprobante Fiscal Digital por Internet) mexicanas. 

**Flujo principal:**
1. Usuario sube archivos XML/PDF de factura
2. OpenAI GPT-4o extrae automáticamente todos los datos
3. Usuario selecciona programa de pago (Estándar o Pronto Pago)
4. Usuario revisa y confirma la información
5. Sistema guarda en Supabase y sube archivos a Google Drive
6. Archivos organizados por: Semana > Proyecto > Facturador

---

## Novedades v2.3.0

| Funcionalidad | Descripción |
|---------------|-------------|
| 📅 **Semana Automática** | Eliminado selector manual, cálculo automático basado en fecha de factura |
| ⏰ **Facturas Extemporáneas** | Detección automática (deadline Jueves 10am CDMX), popup de confirmación |
| 🤖 **Match de Proyectos IA** | OpenAI analiza conceptos y asigna proyecto con nivel de confianza |
| 📁 **Carpeta Extemporáneas** | Facturas tardías en carpeta separada en Drive |
| 🔧 **CRUD Proyectos** | Gestión completa de proyectos en admin con keywords para IA |
| 🔍 **Filtros Admin** | Filtrar por "Requiere revisión" y "Extemporáneas" en listado |

### Versiones anteriores

<details>
<summary>v2.2.0</summary>

| Funcionalidad | Descripción |
|---------------|-------------|
| 🔑 **API Keys** | Sistema de API Keys para acceso programático |
| 👤 **User Auth** | Autenticación de usuarios con password y magic link |
| 📊 **Export XLSX** | Exportación de pagos en formato Shinkansen/BBVA |
| ⚙️ **System Config** | Configuración del sistema desde panel admin |
| 🏦 **Bank Info** | Información bancaria de flotilleros para dispersión |
| 📖 **Swagger UI** | Documentación interactiva de API en `/docs` |

</details>

---

## Características Principales

| Frontend | Backend | IA |
|----------|---------|-----|
| React 18 + TypeScript | Vercel Serverless Functions | OpenAI GPT-4o |
| Tailwind CSS | Supabase (PostgreSQL) | Extracción de XML/PDF |
| Panel Admin | Google Drive API | Detección de proyecto |
| React Router DOM | JWT Authentication | JSON estructurado |
| Exportación XLSX | API Key System | Validación inteligente |

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
# OpenAI (Backend - extracción IA)
OPENAI_API_KEY=sk-...

# Supabase (Backend)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Google Drive (Backend)
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID=1AbCdEfGhIjKlMnOp

# Admin Auth
ADMIN_JWT_SECRET=your-secure-jwt-secret
ADMIN_PASSWORD=your-admin-password

# User Auth
USER_JWT_SECRET=your-user-jwt-secret

# Configuración
EXPECTED_RECEIVER_RFC=BLI180227F23
```

### 3. Ejecutar migraciones de base de datos

En Supabase SQL Editor, ejecutar en orden:
```sql
-- database/001_initial_schema.sql
-- database/002_add_flotilleros.sql
-- database/003_add_pronto_pago.sql
-- database/004_add_admin_users.sql
-- database/005_seed_admin_user.sql
-- database/006_add_bank_info.sql
-- database/007_add_system_config.sql
-- database/008_add_api_keys.sql
-- database/009_add_user_auth.sql
-- database/010_add_onboarding.sql
-- database/011_add_late_invoice_fields.sql
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
│   ├── extract.ts                # POST /api/extract (OpenAI)
│   ├── projects.ts               # GET  /api/projects
│   ├── validate.ts               # POST /api/validate
│   ├── admin/                    # Admin endpoints
│   │   ├── login.ts              # POST /api/admin/login
│   │   ├── stats.ts              # GET  /api/admin/stats
│   │   ├── invoices.ts           # GET  /api/admin/invoices (with needsReview filter)
│   │   ├── projects.ts           # CRUD /api/admin/projects (with keywords)
│   │   ├── export.ts             # GET  /api/admin/export
│   │   ├── export-payments.ts    # GET  /api/admin/export-payments (XLSX)
│   │   ├── config.ts             # GET/PUT /api/admin/config
│   │   └── api-keys.ts           # CRUD /api/admin/api-keys
│   ├── user/                     # User auth endpoints
│   │   ├── login.ts              # POST /api/user/login
│   │   ├── register.ts           # POST /api/user/register
│   │   ├── magic-link.ts         # POST /api/user/magic-link
│   │   ├── verify-magic-link.ts  # GET  /api/user/verify-magic-link
│   │   └── profile.ts            # GET/PUT /api/user/profile
│   └── lib/
│       ├── supabase.ts           # Cliente DB + operaciones
│       ├── googleDrive.ts        # Cliente Drive + uploads
│       ├── storage.ts            # Supabase Storage
│       ├── adminAuth.ts          # Auth de admin (JWT)
│       ├── userAuth.ts           # Auth de usuarios (JWT)
│       ├── apiKeyAuth.ts         # Middleware API Keys
│       ├── validators.ts         # Validación de datos
│       └── types.ts              # Tipos TypeScript
│
├── src/                          # Frontend (React)
│   ├── pages/
│   │   ├── Upload.tsx            # Página principal (auto week calculation)
│   │   └── admin/                # Panel administrativo
│   │       ├── Login.tsx
│   │       ├── Dashboard.tsx
│   │       ├── Invoices.tsx      # With needsReview & isLate filters
│   │       ├── Projects.tsx      # CRUD proyectos con keywords
│   │       ├── Reports.tsx
│   │       ├── Settings.tsx
│   │       └── ApiKeys.tsx
│   ├── components/
│   │   ├── common/               # FileUpload, InputField, LateInvoiceModal
│   │   ├── layout/               # Header, WhatsAppButton
│   │   ├── sections/             # FiscalInfo (no week selector), Payment, Items
│   │   └── admin/                # AdminLayout, ProtectedRoute
│   ├── hooks/
│   │   ├── useInvoiceForm.ts
│   │   ├── useInvoiceExtraction.ts
│   │   └── useAdminAuth.ts
│   ├── services/
│   │   ├── openaiService.ts      # Llamada a /api/extract
│   │   ├── webhookService.ts     # Comunicación con API
│   │   └── adminService.ts       # API admin service
│   ├── contexts/
│   │   └── AdminAuthContext.tsx
│   └── types/
│       └── invoice.ts
│
├── database/
│   ├── 001_initial_schema.sql
│   ├── 002_add_flotilleros.sql
│   ├── 003_add_pronto_pago.sql
│   ├── 004_add_admin_users.sql
│   ├── 005_seed_admin_user.sql
│   ├── 006_add_bank_info.sql
│   ├── 007_add_system_config.sql
│   ├── 008_add_api_keys.sql
│   ├── 009_add_user_auth.sql
│   ├── 010_add_onboarding.sql
│   ├── 011_add_late_invoice_fields.sql  # Late invoice + project keywords
│   └── schema.md
│
├── public/docs/
│   └── index.html                # Swagger UI landing
│
├── docs/api/
│   ├── README.md
│   ├── SETUP.md
│   └── openapi.yaml
│
└── vercel.json
```

---

## API Endpoints

### Public

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/health` | Estado de servicios |
| `GET` | `/api/projects` | Lista de proyectos |
| `POST` | `/api/validate` | Verificar si UUID existe |
| `POST` | `/api/extract` | Extraer datos con IA |
| `POST` | `/api/invoice` | Procesar y guardar factura |

### User Auth

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/user/login` | Login con email/password |
| `POST` | `/api/user/register` | Registro de usuario |
| `POST` | `/api/user/magic-link` | Solicitar magic link |
| `GET` | `/api/user/verify-magic-link` | Verificar magic link |
| `GET/PUT` | `/api/user/profile` | Perfil de usuario |

### Admin (requiere auth)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/admin/login` | Login admin |
| `GET` | `/api/admin/stats` | Dashboard stats |
| `GET` | `/api/admin/invoices` | Lista facturas (filtros: needsReview, isLate) |
| `GET/POST/PUT/DELETE` | `/api/admin/projects` | CRUD proyectos (con keywords) |
| `GET` | `/api/admin/export` | Exportar CSV |
| `GET` | `/api/admin/export-payments` | Exportar XLSX pagos |
| `GET/PUT` | `/api/admin/config` | Configuración sistema |
| `GET/POST/DELETE` | `/api/admin/api-keys` | Gestión API Keys |

---

## Acceso con API Key

Para acceso programático, usa el header `X-API-Key`:

```bash
curl -X GET https://sube-tu-factura.vercel.app/api/projects \
  -H "X-API-Key: pk_your_api_key_here"
```

Obtén tu API Key desde el panel admin en `/admin/api-keys`.

---

## Documentación Interactiva

Visita `/docs` para acceder a la documentación Swagger UI interactiva donde puedes:
- Explorar todos los endpoints
- Probar llamadas a la API
- Ver esquemas de request/response

---

## Despliegue en Vercel

### Variables de Entorno Requeridas

| Variable | Descripción |
|----------|-------------|
| `OPENAI_API_KEY` | API key de OpenAI |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email service account |
| `GOOGLE_PRIVATE_KEY` | Private key de Google |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Carpeta raíz en Drive |
| `ADMIN_JWT_SECRET` | Secret para JWT admin |
| `ADMIN_PASSWORD` | Password del admin |
| `USER_JWT_SECRET` | Secret para JWT usuarios |
| `EXPECTED_RECEIVER_RFC` | RFC esperado |

---

## Documentación Adicional

- [ARCHITECTURE.md](ARCHITECTURE.md) - Decisiones técnicas y flujos
- [docs/api/README.md](docs/api/README.md) - Guía de integración API
- [docs/api/SETUP.md](docs/api/SETUP.md) - Configuración paso a paso
- [database/schema.md](database/schema.md) - Esquema completo de BD

---

## Licencia

MIT License - Ver [LICENSE](LICENSE)

---

<div align="center">

**Hecho con ❤️ por PartRunner**

[@workofger](https://github.com/workofger)

</div>
