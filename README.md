# FacturaFlow AI

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)

**Sistema inteligente de gestion de facturas CFDI con extraccion automatica mediante IA**

[Demo](https://sube-tu-factura.vercel.app) · [Documentacion API](docs/api/README.md) · [Reportar Bug](https://github.com/workofger/sube-tu-factura/issues)

</div>

---

## Tabla de Contenidos

- [Descripcion](#descripcion)
- [Caracteristicas](#caracteristicas)
- [Arquitectura](#arquitectura)
- [Modelo de Datos: Flotilleros](#modelo-de-datos-flotilleros)
- [Tecnologias](#tecnologias)
- [Instalacion](#instalacion)
- [Configuracion](#configuracion)
- [Uso](#uso)
- [API Reference](#api-reference)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Base de Datos](#base-de-datos)
- [Google Drive](#google-drive)
- [Despliegue](#despliegue)
- [Contribuir](#contribuir)

---

## Descripcion

**FacturaFlow AI** es una aplicacion web que automatiza el procesamiento de facturas CFDI (Comprobante Fiscal Digital por Internet) mexicanas. Utiliza inteligencia artificial para extraer datos de archivos XML y PDF, validar la informacion y almacenarla de forma organizada.

### Problema que resuelve

- Captura manual de datos de facturas
- Errores en la transcripcion de informacion fiscal
- Desorganizacion de archivos de facturas
- Dificultad para asociar facturas con proyectos y facturadores
- Gestion de flotas de repartidores y sus facturadores

### Solucion

- Extraccion automatica de datos con Google Gemini AI
- Validacion de RFC y campos fiscales en tiempo real
- Almacenamiento organizado en Google Drive
- Base de datos relacional para consultas y reportes
- Soporte para flotilleros (dueños de flota) y drivers independientes

---

## Caracteristicas

### Frontend
- Interfaz moderna con Tailwind CSS
- Drag & Drop para carga de archivos XML/PDF
- Extraccion automatica de datos con IA
- Edicion manual de campos extraidos
- Diseno responsive
- Seleccion dinamica de proyectos desde base de datos

### Backend
- API RESTful segura con Vercel Functions
- Conexion directa a Supabase (PostgreSQL)
- Integracion con Google Drive via Service Account
- Validacion de duplicados por UUID
- Organizacion automatica de archivos
- Soporte para modelo Flotilleros/Drivers

### Inteligencia Artificial
- OpenAI GPT-4o para extraccion de datos
- Procesamiento de XML estructurado
- Vision para analisis de PDFs
- Deteccion automatica de proyecto

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                    (React + Vite + Tailwind)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Upload    │  │   Gemini    │  │      Form Editor        │  │
│  │  XML/PDF    │──│  AI Extract │──│  (Validate & Submit)    │  │
│  └─────────────┘  └─────────────┘  └───────────┬─────────────┘  │
└────────────────────────────────────────────────┼────────────────┘
                                                 │
                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API                                │
│                  (Vercel Serverless Functions)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ POST        │  │ POST        │  │ GET                     │  │
│  │ /api/invoice│  │ /api/validate│ │ /api/health            │  │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘  │
└─────────┼────────────────┼─────────────────────┼────────────────┘
          │                │                     │
          ▼                ▼                     ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Supabase     │  │  Google Drive   │  │   Health Check  │
│   (PostgreSQL)  │  │ (Service Acct)  │  │   (Services)    │
│  ┌───────────┐  │  │  ┌───────────┐  │  └─────────────────┘
│  │flotilleros│  │  │  │ Semana/   │  │
│  │  drivers  │  │  │  │ Proyecto/ │  │
│  │  invoices │  │  │  │ Emisor/   │  │
│  │  items    │  │  │  │  *.xml    │  │
│  │  files    │  │  │  │  *.pdf    │  │
│  └───────────┘  │  │  └───────────┘  │
└─────────────────┘  └─────────────────┘
```

---

## Modelo de Datos: Flotilleros

### Conceptos Clave

El sistema soporta dos tipos de facturadores:

#### Flotillero (Fleet Owner)
- Dueno de una flota con multiples repartidores
- Factura por los servicios de sus drivers
- Los pagos van al flotillero
- Ejemplo: Empresa con 10 camionetas

#### Independiente (Independent Driver)
- Driver que factura por su propio trabajo
- Es simultaneamente flotillero y driver
- max_drivers = 1
- Ejemplo: Repartidor autonomo

### Diagrama de Relaciones

```
                    FLOTILLEROS
                   ┌────────────┐
                   │  id (PK)   │
                   │  rfc (UQ)  │
                   │  type:     │
                   │  flotillero│◄───────────────────────┐
                   │  /indepen- │                        │
                   │  diente    │                        │
                   └─────┬──────┘                        │
                         │                              │
                         │ 1:N                          │
                         ▼                              │
                      DRIVERS                           │
                   ┌────────────┐                       │
                   │  id (PK)   │                       │
                   │  rfc (UQ)  │                       │
                   │flotillero_id├───────────────────────┘
                   │ (FK, NULL) │
                   └─────┬──────┘
                         │
                         │
                         ▼
                     INVOICES
                   ┌────────────────────────┐
                   │  id (PK)               │
                   │  uuid (UQ)             │
                   │  driver_id (FK)        │──► Driver asociado
                   │  biller_id (FK)        │──► Flotillero que factura
                   │  operated_by_driver_id │──► Driver que opero (opcional)
                   │  project_id (FK)       │
                   └────────────────────────┘
```

### Casos de Uso

| Escenario | biller_id | driver_id | operated_by_driver_id |
|-----------|-----------|-----------|----------------------|
| Independiente factura por si mismo | flotillero_independiente | driver (mismo RFC) | NULL |
| Flotillero factura por su driver | flotillero_flota | driver_registrado | driver_que_trabajo |
| Flotillero sin especificar driver | flotillero_flota | driver_default | NULL |

---

## Tecnologias

### Frontend
| Tecnologia | Version | Uso |
|------------|---------|-----|
| React | 18.3 | UI Framework |
| TypeScript | 5.4 | Type Safety |
| Vite | 5.4 | Build Tool |
| Tailwind CSS | 3.4 | Estilos |
| Lucide React | 0.562 | Iconos |

### Backend
| Tecnologia | Version | Uso |
|------------|---------|-----|
| Vercel Functions | - | Serverless API |
| Supabase JS | 2.x | Cliente PostgreSQL |
| Google APIs | 140.x | Google Drive |

### Servicios
| Servicio | Uso |
|----------|-----|
| OpenAI GPT-4o | Extraccion de datos con IA |
| Supabase | Base de datos PostgreSQL |
| Google Drive | Almacenamiento de archivos |
| Vercel | Hosting y Functions |

---

## Instalacion

### Prerrequisitos

- Node.js >= 18.0.0
- npm o yarn
- Cuenta de Supabase
- Cuenta de Google Cloud
- Cuenta de Vercel

### Clonar repositorio

```bash
git clone https://github.com/workofger/sube-tu-factura.git
cd sube-tu-factura
```

### Instalar dependencias

```bash
npm install
```

### Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales (ver [Configuracion](#configuracion)).

### Ejecutar en desarrollo

```bash
npm run dev
```

La aplicacion estara disponible en `http://localhost:3000`

---

## Configuracion

### Variables de Entorno

Crear archivo `.env.local` con las siguientes variables:

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Google Drive Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID=1AbCdEfGhIjKlMnOp

# Configuracion
EXPECTED_RECEIVER_RFC=BLI180227F23

# OpenAI (para extraccion de datos)
VITE_OPENAI_API_KEY=sk-...
```

### Configuracion detallada

Para instrucciones paso a paso de como obtener cada credencial:

**[Ver Guia Completa de Configuracion](docs/api/SETUP.md)**

---

## Uso

### 1. Cargar archivos

Arrastra o selecciona los archivos XML y PDF de la factura CFDI.

### 2. Extraccion automatica

El sistema extrae automaticamente:
- Datos del emisor (RFC, nombre, regimen fiscal)
- Datos del receptor
- Informacion de la factura (UUID, folio, fecha)
- Desglose financiero (subtotal, impuestos, retenciones)
- Conceptos/items de la factura

### 3. Revision y edicion

Revisa los datos extraidos y corrige si es necesario.

### 4. Envio

Al enviar, el sistema:
1. Valida que el UUID no este duplicado
2. Crea/actualiza el flotillero (facturador)
3. Crea/actualiza el driver asociado
4. Guarda la factura con relaciones correctas
5. Sube los archivos a Google Drive
6. Organiza en carpetas: `Semana/Proyecto/Emisor/`

---

## API Reference

### Endpoints disponibles

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| `POST` | `/api/invoice` | Registrar factura completa |
| `POST` | `/api/validate` | Verificar si UUID existe |
| `GET` | `/api/projects` | Obtener lista de proyectos |
| `GET` | `/api/health` | Estado de servicios |

### Ejemplo: Registrar factura

```bash
curl -X POST https://sube-tu-factura.vercel.app/api/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "week": 4,
    "project": "MERCADO LIBRE",
    "issuer": { "rfc": "XAXX010101000", "name": "Juan Perez" },
    "receiver": { "rfc": "BLI180227F23" },
    "invoice": { "uuid": "3FA85F64-5717-4562-B3FC-2C963F66AFA6", "date": "2026-01-20" },
    "payment": { "method": "PUE" },
    "financial": { "subtotal": 10000, "totalTax": 1600, "totalAmount": 11600, "currency": "MXN" },
    "items": [{ "description": "Servicio", "quantity": 1, "unitPrice": 10000, "amount": 10000 }],
    "contact": { "email": "juan@gmail.com" },
    "files": { "xml": { "name": "f.xml", "content": "BASE64...", "mimeType": "application/xml" } }
  }'
```

### Documentacion completa

- [Guia de Integracion](docs/api/README.md)
- [Especificacion OpenAPI](docs/api/openapi.yaml)
- [Coleccion Postman](docs/api/postman.json)

---

## Estructura del Proyecto

```
sube-tu-factura/
├── api/                          # Backend (Vercel Functions)
│   ├── invoice.ts                # POST /api/invoice
│   ├── validate.ts               # POST /api/validate
│   ├── projects.ts               # GET /api/projects
│   ├── health.ts                 # GET /api/health
│   └── lib/
│       ├── supabase.ts           # Cliente Supabase + Flotilleros
│       ├── googleDrive.ts        # Cliente Google Drive
│       ├── validators.ts         # Validaciones
│       └── types.ts              # Tipos TypeScript
│
├── src/                          # Frontend (React)
│   ├── components/
│   │   ├── common/               # Componentes reutilizables
│   │   │   ├── FileUpload.tsx
│   │   │   ├── InputField.tsx
│   │   │   ├── ProjectSelect.tsx # Selector de proyectos
│   │   │   └── SelectField.tsx
│   │   ├── layout/               # Layout components
│   │   │   ├── Header.tsx
│   │   │   └── WhatsAppButton.tsx
│   │   └── sections/             # Secciones del formulario
│   │       ├── FileUploadSection.tsx
│   │       ├── FiscalInfoSection.tsx
│   │       ├── PaymentSection.tsx
│   │       └── ItemsTable.tsx
│   ├── hooks/
│   │   ├── useInvoiceForm.ts     # Estado del formulario
│   │   ├── useInvoiceExtraction.ts # Logica de extraccion
│   │   ├── useProjects.ts        # Hook para proyectos
│   │   └── useWeekOptions.ts     # Opciones de semanas
│   ├── services/
│   │   ├── openaiService.ts      # Integracion OpenAI GPT-4o
│   │   └── webhookService.ts     # Comunicacion con API
│   ├── types/
│   │   └── invoice.ts            # Tipos de factura
│   ├── utils/
│   │   ├── dates.ts              # Utilidades de fechas
│   │   ├── files.ts              # Utilidades de archivos
│   │   └── formatters.ts         # Formateadores
│   ├── constants/
│   │   └── config.ts             # Configuracion
│   ├── App.tsx                   # Componente principal
│   └── main.tsx                  # Entry point
│
├── database/
│   ├── 001_initial_schema.sql    # Schema PostgreSQL inicial
│   ├── 002_add_flotilleros.sql   # Migracion: agregar flotilleros
│   └── schema.md                 # Documentacion del schema v2.0
│
├── docs/
│   └── api/
│       ├── README.md             # Guia de integracion
│       ├── SETUP.md              # Guia de configuracion
│       ├── openapi.yaml          # Especificacion OpenAPI
│       └── postman.json          # Coleccion Postman
│
├── n8n/                          # (Legacy) Workflows n8n
│   ├── workflow-facturas.json
│   └── workflow-facturas.md
│
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── vercel.json
```

---

## Base de Datos

### Diagrama ER (v2.0 con Flotilleros)

```
┌─────────────────┐
│   flotilleros   │
├─────────────────┤
│ id (PK)         │
│ rfc (UQ)        │
│ fiscal_name     │
│ type (enum)     │◄──────────────────────────────┐
│ status          │                               │
└────────┬────────┘                               │
         │ 1:N                                    │
         ▼                                        │
┌─────────────────┐       ┌──────────────┐       │
│     drivers     │       │   projects   │       │
├─────────────────┤       ├──────────────┤       │
│ id (PK)         │       │ id (PK)      │       │
│ rfc (UQ)        │       │ code (UQ)    │       │
│ first_name      │       │ name         │       │
│ last_name       │       │ color        │       │
│ flotillero_id   │───────┤ sort_order   │       │
│ status          │       │ is_active    │       │
└────────┬────────┘       └──────┬───────┘       │
         │                       │               │
         │    ┌──────────────────┴───────────────┤
         │    │           invoices               │
         │    ├──────────────────────────────────┤
         └────│ id (PK)                          │
              │ driver_id (FK)                   │
              │ biller_id (FK) ──────────────────┘
              │ operated_by_driver_id (FK)
              │ project_id (FK)
              │ uuid (UQ)
              │ folio, series, invoice_date
              │ issuer_*, receiver_*
              │ payment_method, payment_form
              │ subtotal, total_tax, total
              │ status
              └─────────────┬────────────────────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
            ▼               ▼               ▼
┌─────────────────┐ ┌───────────────┐ ┌───────────────┐
│ invoice_items   │ │ invoice_files │ │   payments    │
├─────────────────┤ ├───────────────┤ ├───────────────┤
│ id (PK)         │ │ id (PK)       │ │ id (PK)       │
│ invoice_id (FK) │ │ invoice_id(FK)│ │ driver_id     │
│ description     │ │ file_type     │ │ flotillero_id │
│ quantity        │ │ google_drive_*│ │ status        │
│ unit_price      │ └───────────────┘ │ net_amount    │
│ amount          │                   └───────────────┘
└─────────────────┘
```

### Ejecutar migraciones

```bash
# En Supabase SQL Editor, ejecutar en orden:

# 1. Schema inicial
database/001_initial_schema.sql

# 2. Agregar flotilleros (v2.0)
database/002_add_flotilleros.sql
```

**[Ver documentacion completa del schema](database/schema.md)**

---

## Google Drive

### Estructura de carpetas

Los archivos se organizan automaticamente en una jerarquia de 3 niveles:

```
📁 Facturas CFDI/                    (Carpeta raiz)
├── 📁 Semana_01_2026/               (Nivel 1: Semana)
│   ├── 📁 MERCADO_LIBRE/            (Nivel 2: Proyecto)
│   │   ├── 📁 XAXX010101000_Juan/   (Nivel 3: Emisor/Flotillero)
│   │   │   ├── UUID-1.xml
│   │   │   └── UUID-1.pdf
│   │   └── 📁 YAXX020202000_Maria/
│   │       └── ...
│   └── 📁 AMAZON/
│       └── ...
├── 📁 Semana_02_2026/
│   └── ...
```

### Relacion Proyecto-Facturador

- Un **proyecto** puede tener multiples **facturadores** (1:N)
- Un **facturador** (flotillero) puede aparecer en multiples **proyectos**
- Un **facturador** puede aparecer en multiples **semanas**

---

## Despliegue

### Vercel (Recomendado)

1. **Conectar repositorio**
   - Ve a [vercel.com](https://vercel.com)
   - Importa el repositorio de GitHub

2. **Configurar variables de entorno**
   - En Settings → Environment Variables
   - Agregar todas las variables de `.env.example`

3. **Deploy automatico**
   - Cada push a `main` despliega automaticamente

### Manual

```bash
# Build
npm run build

# Preview local del build
npm run preview
```

---

## Contribuir

### Reportar bugs

1. Verifica que el bug no este ya reportado
2. Crea un issue con:
   - Descripcion clara del problema
   - Pasos para reproducir
   - Comportamiento esperado vs actual
   - Screenshots si aplica

### Pull Requests

1. Fork del repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'feat: agregar nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### Convenciones de commits

```
feat:     Nueva funcionalidad
fix:      Correccion de bug
docs:     Documentacion
style:    Formato (no afecta codigo)
refactor: Refactorizacion
test:     Tests
chore:    Mantenimiento
```

---

## Licencia

Este proyecto esta bajo la Licencia MIT. Ver [LICENSE](LICENSE) para mas detalles.

---

## Equipo

**PartRunner Engineering**

- GitHub: [@workofger](https://github.com/workofger)

---

<div align="center">

**[Volver arriba](#facturaflow-ai)**

Hecho con amor por PartRunner

</div>
