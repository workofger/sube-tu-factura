# FacturaFlow AI

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)

**Sistema inteligente de gestión de facturas CFDI con extracción automática mediante IA**

[Demo](https://sube-tu-factura.vercel.app) · [Documentación API](docs/api/README.md) · [Reportar Bug](https://github.com/workofger/sube-tu-factura/issues)

</div>

---

## 📋 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Tecnologías](#-tecnologías)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [API Reference](#-api-reference)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Base de Datos](#-base-de-datos)
- [Google Drive](#-google-drive)
- [Despliegue](#-despliegue)
- [Contribuir](#-contribuir)

---

## 📖 Descripción

**FacturaFlow AI** es una aplicación web que automatiza el procesamiento de facturas CFDI (Comprobante Fiscal Digital por Internet) mexicanas. Utiliza inteligencia artificial para extraer datos de archivos XML y PDF, validar la información y almacenarla de forma organizada.

### Problema que resuelve

- ❌ Captura manual de datos de facturas
- ❌ Errores en la transcripción de información fiscal
- ❌ Desorganización de archivos de facturas
- ❌ Dificultad para asociar facturas con proyectos y facturadores

### Solución

- ✅ Extracción automática de datos con Google Gemini AI
- ✅ Validación de RFC y campos fiscales en tiempo real
- ✅ Almacenamiento organizado en Google Drive
- ✅ Base de datos relacional para consultas y reportes

---

## ✨ Características

### Frontend
- 🎨 Interfaz moderna con Tailwind CSS
- 📤 Drag & Drop para carga de archivos XML/PDF
- 🤖 Extracción automática de datos con IA
- ✏️ Edición manual de campos extraídos
- 📱 Diseño responsive

### Backend
- 🔐 API RESTful segura con Vercel Functions
- 🗄️ Conexión directa a Supabase (PostgreSQL)
- ☁️ Integración con Google Drive via Service Account
- ✅ Validación de duplicados por UUID
- 📁 Organización automática de archivos

### Inteligencia Artificial
- 🧠 Google Gemini 2.5 Flash para extracción de datos
- 📄 Procesamiento de XML estructurado
- 🖼️ OCR de facturas en PDF
- 🎯 Detección automática de proyecto

---

## 🏗️ Arquitectura

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
│  │  drivers  │  │  │  │ Semana/   │  │
│  │  invoices │  │  │  │ Proyecto/ │  │
│  │  items    │  │  │  │ Emisor/   │  │
│  │  files    │  │  │  │  *.xml    │  │
│  └───────────┘  │  │  │  *.pdf    │  │
└─────────────────┘  │  └───────────┘  │
                     └─────────────────┘
```

---

## 🛠️ Tecnologías

### Frontend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 18.3 | UI Framework |
| TypeScript | 5.4 | Type Safety |
| Vite | 5.4 | Build Tool |
| Tailwind CSS | 3.4 | Estilos |
| Lucide React | 0.562 | Iconos |

### Backend
| Tecnología | Versión | Uso |
|------------|---------|-----|
| Vercel Functions | - | Serverless API |
| Supabase JS | 2.x | Cliente PostgreSQL |
| Google APIs | 140.x | Google Drive |

### Servicios
| Servicio | Uso |
|----------|-----|
| Google Gemini | Extracción de datos con IA |
| Supabase | Base de datos PostgreSQL |
| Google Drive | Almacenamiento de archivos |
| Vercel | Hosting y Functions |

---

## 📦 Instalación

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

Editar `.env.local` con tus credenciales (ver [Configuración](#-configuración)).

### Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

---

## ⚙️ Configuración

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

# Configuración
EXPECTED_RECEIVER_RFC=BLI180227F23

# Gemini AI
GEMINI_API_KEY=AIzaSy...
```

### Configuración detallada

Para instrucciones paso a paso de cómo obtener cada credencial:

📖 **[Ver Guía Completa de Configuración](docs/api/SETUP.md)**

---

## 🚀 Uso

### 1. Cargar archivos

Arrastra o selecciona los archivos XML y PDF de la factura CFDI.

### 2. Extracción automática

El sistema extrae automáticamente:
- Datos del emisor (RFC, nombre, régimen fiscal)
- Datos del receptor
- Información de la factura (UUID, folio, fecha)
- Desglose financiero (subtotal, impuestos, retenciones)
- Conceptos/items de la factura

### 3. Revisión y edición

Revisa los datos extraídos y corrige si es necesario.

### 4. Envío

Al enviar, el sistema:
1. Valida que el UUID no esté duplicado
2. Guarda los datos en Supabase
3. Sube los archivos a Google Drive
4. Organiza en carpetas: `Semana/Proyecto/Emisor/`

---

## 📚 API Reference

### Endpoints disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/invoice` | Registrar factura completa |
| `POST` | `/api/validate` | Verificar si UUID existe |
| `GET` | `/api/health` | Estado de servicios |

### Ejemplo: Registrar factura

```bash
curl -X POST https://sube-tu-factura.vercel.app/api/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "week": 4,
    "project": "MERCADO LIBRE",
    "issuer": { "rfc": "XAXX010101000", "name": "Juan Pérez" },
    "receiver": { "rfc": "BLI180227F23" },
    "invoice": { "uuid": "3FA85F64-5717-4562-B3FC-2C963F66AFA6", "date": "2026-01-20" },
    "payment": { "method": "PUE" },
    "financial": { "subtotal": 10000, "totalTax": 1600, "totalAmount": 11600, "currency": "MXN" },
    "items": [{ "description": "Servicio", "quantity": 1, "unitPrice": 10000, "amount": 10000 }],
    "contact": { "email": "juan@gmail.com" },
    "files": { "xml": { "name": "f.xml", "content": "BASE64...", "mimeType": "application/xml" } }
  }'
```

### Documentación completa

- 📖 [Guía de Integración](docs/api/README.md)
- 📋 [Especificación OpenAPI](docs/api/openapi.yaml)
- 📬 [Colección Postman](docs/api/postman.json)

---

## 📁 Estructura del Proyecto

```
sube-tu-factura/
├── api/                          # Backend (Vercel Functions)
│   ├── invoice.ts                # POST /api/invoice
│   ├── validate.ts               # POST /api/validate
│   ├── health.ts                 # GET /api/health
│   └── lib/
│       ├── supabase.ts           # Cliente Supabase
│       ├── googleDrive.ts        # Cliente Google Drive
│       ├── validators.ts         # Validaciones
│       └── types.ts              # Tipos TypeScript
│
├── src/                          # Frontend (React)
│   ├── components/
│   │   ├── common/               # Componentes reutilizables
│   │   │   ├── FileUpload.tsx
│   │   │   ├── InputField.tsx
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
│   │   ├── useInvoiceExtraction.ts # Lógica de extracción
│   │   └── useWeekOptions.ts     # Opciones de semanas
│   ├── services/
│   │   ├── geminiService.ts      # Integración Gemini AI
│   │   └── webhookService.ts     # Comunicación con API
│   ├── types/
│   │   └── invoice.ts            # Tipos de factura
│   ├── utils/
│   │   ├── dates.ts              # Utilidades de fechas
│   │   ├── files.ts              # Utilidades de archivos
│   │   └── formatters.ts         # Formateadores
│   ├── constants/
│   │   └── config.ts             # Configuración
│   ├── App.tsx                   # Componente principal
│   └── main.tsx                  # Entry point
│
├── database/
│   ├── 001_initial_schema.sql    # Schema PostgreSQL
│   └── schema.md                 # Documentación del schema
│
├── docs/
│   └── api/
│       ├── README.md             # Guía de integración
│       ├── SETUP.md              # Guía de configuración
│       ├── openapi.yaml          # Especificación OpenAPI
│       └── postman.json          # Colección Postman
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

## 🗄️ Base de Datos

### Diagrama ER

```
┌─────────────┐       ┌──────────────┐       ┌───────────────┐
│   drivers   │       │   projects   │       │ fiscal_regimes│
├─────────────┤       ├──────────────┤       ├───────────────┤
│ id (PK)     │       │ id (PK)      │       │ id (PK)       │
│ rfc (UQ)    │       │ code (UQ)    │       │ code (UQ)     │
│ fiscal_name │       │ name         │       │ name          │
│ email       │       │ is_active    │       │ applies_to    │
│ phone       │       └──────────────┘       └───────────────┘
│ status      │              │
└──────┬──────┘              │
       │                     │
       │    ┌────────────────┴────────────────┐
       │    │           invoices              │
       │    ├─────────────────────────────────┤
       └────│ id (PK)                         │
            │ driver_id (FK)                  │
            │ project_id (FK)                 │
            │ uuid (UQ)                       │
            │ folio, series, invoice_date     │
            │ issuer_*, receiver_*            │
            │ payment_method, payment_form    │
            │ subtotal, total_tax, total      │
            │ status                          │
            └─────────────┬───────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌─────────────────┐ ┌───────────────┐ ┌───────────────┐
│ invoice_items   │ │ invoice_files │ │   payments    │
├─────────────────┤ ├───────────────┤ ├───────────────┤
│ id (PK)         │ │ id (PK)       │ │ id (PK)       │
│ invoice_id (FK) │ │ invoice_id(FK)│ │ status        │
│ description     │ │ file_type     │ │ amount        │
│ quantity        │ │ google_drive_*│ │ payment_date  │
│ unit_price      │ └───────────────┘ └───────────────┘
│ amount          │
└─────────────────┘
```

### Ejecutar schema

```bash
# En Supabase SQL Editor, ejecutar:
database/001_initial_schema.sql
```

📖 [Ver documentación completa del schema](database/schema.md)

---

## ☁️ Google Drive

### Estructura de carpetas

Los archivos se organizan automáticamente en una jerarquía de 3 niveles:

```
📁 Facturas CFDI/                    (Carpeta raíz)
├── 📁 Semana_01_2026/               (Nivel 1: Semana)
│   ├── 📁 MERCADO_LIBRE/            (Nivel 2: Proyecto)
│   │   ├── 📁 XAXX010101000_Juan/   (Nivel 3: Emisor)
│   │   │   ├── UUID-1.xml
│   │   │   └── UUID-1.pdf
│   │   └── 📁 YAXX020202000_Maria/
│   │       └── ...
│   └── 📁 AMAZON/
│       └── ...
├── 📁 Semana_02_2026/
│   └── ...
```

### Relación Proyecto-Facturador

- Un **proyecto** puede tener múltiples **facturadores** (1:N)
- Un **facturador** puede aparecer en múltiples **proyectos**
- Un **facturador** puede aparecer en múltiples **semanas**

---

## 🚀 Despliegue

### Vercel (Recomendado)

1. **Conectar repositorio**
   - Ve a [vercel.com](https://vercel.com)
   - Importa el repositorio de GitHub

2. **Configurar variables de entorno**
   - En Settings → Environment Variables
   - Agregar todas las variables de `.env.example`

3. **Deploy automático**
   - Cada push a `main` despliega automáticamente

### Manual

```bash
# Build
npm run build

# Preview local del build
npm run preview
```

---

## 🤝 Contribuir

### Reportar bugs

1. Verifica que el bug no esté ya reportado
2. Crea un issue con:
   - Descripción clara del problema
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
fix:      Corrección de bug
docs:     Documentación
style:    Formato (no afecta código)
refactor: Refactorización
test:     Tests
chore:    Mantenimiento
```

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

---

## 👥 Equipo

**PartRunner Engineering**

- GitHub: [@workofger](https://github.com/workofger)

---

<div align="center">

**[⬆ Volver arriba](#facturaflow-ai)**

Hecho con ❤️ por PartRunner

</div>
