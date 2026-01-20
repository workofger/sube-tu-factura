# 🔄 Flujo n8n - Procesamiento de Facturas CFDI

> **Versión:** 1.0.0  
> **Última actualización:** Enero 2026  
> **Requiere:** n8n 1.0+, PostgreSQL (Supabase), Google Drive

---

## 📋 Índice

1. [Descripción General](#descripción-general)
2. [Diagrama del Flujo](#diagrama-del-flujo)
3. [Requisitos Previos](#requisitos-previos)
4. [Configuración de Credenciales](#configuración-de-credenciales)
5. [JSON del Workflow](#json-del-workflow)
6. [Explicación de Nodos](#explicación-de-nodos)
7. [Estructura de Carpetas en Drive](#estructura-de-carpetas-en-drive)
8. [Respuestas al Frontend](#respuestas-al-frontend)
9. [Cómo Importar](#cómo-importar)
10. [Troubleshooting](#troubleshooting)

---

## Descripción General

Este flujo de n8n procesa las facturas CFDI enviadas desde la aplicación FacturaFlow AI:

### Funcionalidades

✅ Recibe payload con datos de factura + archivos en Base64  
✅ Verifica si el UUID ya existe en PostgreSQL (evita duplicados)  
✅ Guarda la factura y sus items en la base de datos  
✅ Crea estructura de carpetas organizada en Google Drive  
✅ Sube archivos XML y PDF a las carpetas correspondientes  
✅ Retorna respuesta de éxito o error al frontend  

---

## Diagrama del Flujo

```
                                    ┌─────────────────┐
                                    │    Webhook      │
                                    │  (Recibe POST)  │
                                    └────────┬────────┘
                                             │
                                             ▼
                                    ┌─────────────────┐
                                    │  Postgres:      │
                                    │  Check UUID     │
                                    └────────┬────────┘
                                             │
                              ┌──────────────┴──────────────┐
                              │                             │
                              ▼                             ▼
                    ┌─────────────────┐           ┌─────────────────┐
                    │  UUID Exists?   │           │  UUID NOT Found │
                    │    (ERROR)      │           │   (Continue)    │
                    └────────┬────────┘           └────────┬────────┘
                             │                             │
                             ▼                             ▼
                    ┌─────────────────┐           ┌─────────────────┐
                    │ Respond Error   │           │ Postgres:       │
                    │  "Duplicada"    │           │ Upsert Driver   │
                    └─────────────────┘           └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │ Postgres:       │
                                                  │ Insert Invoice  │
                                                  └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │ Postgres:       │
                                                  │ Insert Items    │
                                                  └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │  Google Drive:  │
                                                  │  Create Folders │
                                                  └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │  Google Drive:  │
                                                  │  Upload Files   │
                                                  └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │ Postgres:       │
                                                  │ Save File URLs  │
                                                  └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │ Respond Success │
                                                  │  to Frontend    │
                                                  └─────────────────┘
```

---

## Requisitos Previos

### 1. Supabase (PostgreSQL)
- Proyecto creado con el schema de base de datos ejecutado
- Credenciales de conexión PostgreSQL:
  - Host: `db.xxxxx.supabase.co`
  - Puerto: `5432` (o `6543` para connection pooling)
  - Database: `postgres`
  - Usuario: `postgres`
  - Password: Tu password de Supabase

### 2. Google Drive
- Cuenta de Google con acceso a Drive
- Carpeta raíz creada para las facturas (guardar el ID)
- OAuth2 configurado en n8n

### 3. n8n
- Instancia de n8n corriendo (self-hosted o cloud)
- Credenciales configuradas para **Postgres** y **Google Drive**

---

## Configuración de Credenciales

### PostgreSQL (Supabase)

1. Ve a **Settings > Credentials** en n8n
2. Añade nueva credencial **Postgres**
3. Configura:
   - **Host**: `db.xxxxx.supabase.co` (desde Project Settings > Database)
   - **Database**: `postgres`
   - **User**: `postgres`
   - **Password**: Tu database password
   - **Port**: `5432`
   - **SSL**: Activar ✅

> **💡 Tip:** Encuentra las credenciales en Supabase: **Project Settings > Database > Connection string**

### Google Drive

1. Ve a **Settings > Credentials** en n8n
2. Añade nueva credencial **Google Drive OAuth2**
3. Sigue el flujo de autorización OAuth2
4. Crea una carpeta raíz en Drive y copia su ID

---

## JSON del Workflow

> **📁 El JSON completo está en:** [`workflow-facturas.json`](./workflow-facturas.json)

### Nodos utilizados

| Tipo de Nodo | Operación | Uso |
|--------------|-----------|-----|
| `n8n-nodes-base.webhook` | POST | Recibir payload del frontend |
| `n8n-nodes-base.postgres` | executeQuery | SELECT, INSERT, UPSERT en Supabase |
| `n8n-nodes-base.googleDrive` | search, createFolder, upload | Gestión de carpetas y archivos |
| `n8n-nodes-base.if` | Condicional | Verificar existencia de registros/carpetas |
| `n8n-nodes-base.code` | JavaScript | Preparar y transformar datos |
| `n8n-nodes-base.respondToWebhook` | JSON | Respuestas HTTP al frontend |

### Credenciales a configurar

Después de importar, busca y reemplaza estos IDs:

| Placeholder | Reemplazar con |
|-------------|----------------|
| `YOUR_POSTGRES_CREDENTIAL_ID` | ID de tu credencial Postgres |
| `YOUR_GOOGLE_DRIVE_CREDENTIAL_ID` | ID de tu credencial Google Drive |

### Variable de entorno

Configura en **Settings > Variables**:

```
GOOGLE_DRIVE_ROOT_FOLDER_ID = 1AbCdEfGhIjKlMnOpQrStUvWxYz
```

---

## Explicación de Nodos

### 1. Webhook
Recibe el POST del frontend con el payload JSON completo (datos + archivos Base64).

### 2. Check UUID (Postgres)
```sql
SELECT id, uuid FROM invoices WHERE uuid = '...' LIMIT 1
```
Verifica si ya existe una factura con ese UUID.

### 3. IF - UUID Exists?
- **True**: Responde error 409 (Duplicado)
- **False**: Continúa el flujo

### 4. Upsert Driver (Postgres)
```sql
INSERT INTO drivers (...) VALUES (...)
ON CONFLICT (rfc) DO UPDATE SET ...
RETURNING id;
```
Crea o actualiza el driver basándose en el RFC.

### 5. Insert Invoice (Postgres)
Inserta la factura con todos los campos del CFDI y retorna el ID.

### 6. Insert Items (Postgres)
Inserta todos los conceptos/items de la factura.

### 7-12. Carpetas en Google Drive
Estructura jerárquica de 3 niveles:
1. **Semana**: `Semana 04 - 2026`
2. **Proyecto**: `MERCADO LIBRE`
3. **Facturador**: `RFC - Nombre`

Para cada nivel: busca si existe → si no, crea → pasa al siguiente.

### 13-14. Upload Files
- Convierte Base64 a buffer
- Sube XML y PDF a la carpeta del facturador
- Nombra archivos con el UUID

### 15-16. Save File Records (Postgres)
Guarda en `invoice_files` las URLs de Google Drive.

### 17. Success Response
Responde 201 con los datos de la factura y URLs de archivos.

---

## Estructura de Carpetas en Drive

```
📁 Facturas CFDI (Root - GOOGLE_DRIVE_ROOT_FOLDER_ID)
│
├── 📁 Semana 01 - 2026 (🟡 Amarillo)
│   ├── 📁 MERCADO LIBRE (🔵 Azul)
│   │   ├── 📁 GAPJ850101ABC - García Pérez Juan (🟢 Verde)
│   │   │   ├── 3FA85F64-5717-4562-B3FC-2C963F66AFA6.xml
│   │   │   └── 3FA85F64-5717-4562-B3FC-2C963F66AFA6.pdf
│   │   └── 📁 LOMA900215XYZ - López Martínez Ana
│   │       └── ...
│   │
│   ├── 📁 AMAZON
│   │   └── 📁 GAPJ850101ABC - García Pérez Juan
│   │       └── ... (mismo driver, diferente proyecto)
│   │
│   └── 📁 OTRO
│       └── ...
│
├── 📁 Semana 02 - 2026
│   └── ...
│
└── 📁 Semana 03 - 2026
    └── ...
```

**Nota:** Un mismo facturador (RFC) puede aparecer en:
- Diferentes proyectos de la misma semana
- Diferentes semanas

---

## Respuestas al Frontend

### ✅ Éxito (201 Created)

```json
{
  "success": true,
  "message": "¡Factura registrada exitosamente!",
  "data": {
    "invoiceId": "uuid-de-la-factura-en-db",
    "uuid": "uuid-fiscal-del-cfdi",
    "status": "pending_review",
    "issuer": "Nombre del Emisor",
    "total": 15000.00,
    "files": {
      "xml": "https://drive.google.com/file/d/xxx/view",
      "pdf": "https://drive.google.com/file/d/yyy/view"
    }
  }
}
```

### ❌ Error - Factura Duplicada (409 Conflict)

```json
{
  "success": false,
  "error": "DUPLICATE_INVOICE",
  "message": "Esta factura ya fue registrada anteriormente.",
  "uuid": "uuid-fiscal-duplicado"
}
```

### ✅ Éxito sin Archivos (201 Created)

```json
{
  "success": true,
  "message": "¡Factura registrada exitosamente! (Sin archivos adjuntos)",
  "data": {
    "invoiceId": "uuid-db",
    "uuid": "uuid-fiscal",
    "status": "pending_review"
  }
}
```

---

## Cómo Importar

### Paso 1: Importar el workflow

1. Abre n8n
2. Ve a **Workflows**
3. Click en **⋮** > **Import from File**
4. Selecciona `workflow-facturas.json`

### Paso 2: Configurar credenciales

1. Ve a **Settings > Credentials**
2. Crea credencial **Postgres** con datos de Supabase
3. Crea credencial **Google Drive OAuth2**
4. Anota los IDs de ambas credenciales

### Paso 3: Actualizar IDs en el workflow

1. Abre el workflow importado
2. Usa **Ctrl+H** (buscar y reemplazar) o edita cada nodo:
   - `YOUR_POSTGRES_CREDENTIAL_ID` → tu ID de Postgres
   - `YOUR_GOOGLE_DRIVE_CREDENTIAL_ID` → tu ID de Google Drive

### Paso 4: Configurar variable de entorno

1. Ve a **Settings > Variables**
2. Añade:
   - **Name**: `GOOGLE_DRIVE_ROOT_FOLDER_ID`
   - **Value**: ID de tu carpeta raíz en Drive

### Paso 5: Activar

1. Guarda el workflow
2. Click en **Active** para activarlo
3. El webhook estará listo en: `https://tu-n8n.com/webhook/a1ed99cc-3561-4592-8459-3aad11492b03`

---

## Troubleshooting

### Error: "UUID already exists"
- La factura ya fue registrada
- Verificar en Supabase: `SELECT * FROM invoices WHERE uuid = '...'`

### Error: "Could not create folder"
- Verificar permisos de Google Drive
- Verificar que `GOOGLE_DRIVE_ROOT_FOLDER_ID` es correcto
- Verificar que la credencial OAuth2 tiene permisos de escritura

### Error: "Connection refused" (Postgres)
- Verificar host: debe ser `db.xxxxx.supabase.co`
- Verificar que SSL está activado
- Probar puerto `6543` (pooler) si `5432` falla

### Error: "File upload failed"
- Verificar que el Base64 es válido
- Archivos muy grandes (>10MB) pueden fallar
- Verificar límite de n8n: `N8N_PAYLOAD_SIZE_MAX`

### Error: "relation does not exist"
- Ejecutar el schema SQL en Supabase primero
- Verificar que las tablas `drivers`, `invoices`, `invoice_items`, `invoice_files` existen

### Workflow no se activa
- Verificar que el workflow está en estado **Active**
- Verificar la URL del webhook en los logs de n8n
- Probar con un POST manual usando curl o Postman

---

**Generado para:** FacturaFlow AI  
**Versión:** 1.0.0  
**Última actualización:** Enero 2026
