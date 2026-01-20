# Guía de Configuración de Credenciales

Esta guía detalla cómo configurar las credenciales necesarias para el backend de FacturaFlow.

---

## Índice

1. [Supabase](#1-supabase)
2. [Google Cloud Service Account](#2-google-cloud-service-account)
3. [Google Drive](#3-google-drive)
4. [Variables de Entorno en Vercel](#4-variables-de-entorno-en-vercel)
5. [Verificación](#5-verificación)

---

## 1. Supabase

### 1.1 Crear proyecto (si no existe)

1. Ve a [supabase.com](https://supabase.com)
2. Click en **New Project**
3. Configura:
   - **Name:** `facturaflow`
   - **Database Password:** Guarda esta contraseña
   - **Region:** Selecciona la más cercana

### 1.2 Ejecutar schema de base de datos

1. Ve a **SQL Editor** en el dashboard de Supabase
2. Copia el contenido de `database/001_initial_schema.sql`
3. Ejecuta el script

### 1.3 Obtener credenciales

1. Ve a **Project Settings** → **API**
2. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (⚠️ NO anon key) → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **IMPORTANTE:** El `service_role` key tiene acceso total a la base de datos. NUNCA lo expongas en el frontend.

### 1.4 Ejemplo de credenciales

```env
SUPABASE_URL=https://lrzcturtxtzhdzqacefy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 2. Google Cloud Service Account

### 2.1 Crear proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Click en **Select a project** → **New Project**
3. Nombre: `FacturaFlow`
4. Click **Create**

### 2.2 Habilitar Google Drive API

1. Ve a **APIs & Services** → **Library**
2. Busca "Google Drive API"
3. Click **Enable**

### 2.3 Crear Service Account

1. Ve a **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Configura:
   - **Name:** `facturaflow-drive`
   - **Description:** `Service account para subir facturas a Drive`
4. Click **Create and Continue**
5. Skip role assignment (lo haremos en Drive)
6. Click **Done**

### 2.4 Generar clave JSON

1. Click en el Service Account creado
2. Ve a la pestaña **Keys**
3. Click **Add Key** → **Create new key**
4. Selecciona **JSON**
5. Click **Create**
6. **Guarda el archivo JSON descargado** (⚠️ No lo pierdas, no se puede recuperar)

### 2.5 Extraer credenciales del JSON

Del archivo JSON descargado, necesitas:

```json
{
  "client_email": "facturaflow-drive@facturaflow-xxxxx.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----\n"
}
```

Estas se convertirán en:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email`
- `GOOGLE_PRIVATE_KEY` = `private_key`

---

## 3. Google Drive

### 3.1 Crear carpeta raíz

1. Ve a [Google Drive](https://drive.google.com)
2. Crea una nueva carpeta: `Facturas CFDI`
3. Abre la carpeta

### 3.2 Obtener ID de la carpeta

De la URL de la carpeta:
```
https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz123456
                                        ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑
                                        Este es el GOOGLE_DRIVE_ROOT_FOLDER_ID
```

### 3.3 Compartir con Service Account

1. Click derecho en la carpeta → **Share**
2. En el campo de email, pega el `client_email` del Service Account:
   ```
   facturaflow-drive@facturaflow-xxxxx.iam.gserviceaccount.com
   ```
3. Selecciona rol: **Editor**
4. Desmarca "Notify people"
5. Click **Share**

> **Nota:** El Service Account ahora puede crear carpetas y subir archivos a esta carpeta.

---

## 4. Variables de Entorno en Vercel

### 4.1 Configurar en Vercel Dashboard

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en tu proyecto → **Settings** → **Environment Variables**

### 4.2 Agregar cada variable

| Variable | Valor | Entornos |
|----------|-------|----------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` | Production, Preview, Development |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `xxx@xxx.iam.gserviceaccount.com` | Production, Preview, Development |
| `GOOGLE_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n...` | Production, Preview, Development |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | `1AbCdEfGhIjKlMn...` | Production, Preview, Development |
| `EXPECTED_RECEIVER_RFC` | `BLI180227F23` | Production, Preview, Development |
| `GEMINI_API_KEY` | `AIzaSy...` | Production, Preview, Development |

### 4.3 Formato de GOOGLE_PRIVATE_KEY

⚠️ **MUY IMPORTANTE:** Al copiar la private key a Vercel:

**Opción A: En una sola línea con `\n` literales**
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----\n
```

**Opción B: Multi-línea (Vercel lo soporta)**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
...más líneas...
-----END PRIVATE KEY-----
```

### 4.4 Redeploy

Después de agregar las variables:
1. Ve a **Deployments**
2. Click en los **⋮** del último deployment
3. Click **Redeploy**

---

## 5. Verificación

### 5.1 Verificar health endpoint

```bash
curl https://sube-tu-factura.vercel.app/api/health
```

Respuesta esperada:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-20T...",
  "services": {
    "supabase": "connected",
    "googleDrive": "connected"
  }
}
```

### 5.2 Si Supabase falla

- Verificar `SUPABASE_URL` no tiene `/` al final
- Verificar `SUPABASE_SERVICE_ROLE_KEY` es el **service_role**, no el anon key
- Verificar que el schema fue ejecutado (tablas existen)

### 5.3 Si Google Drive falla

- Verificar que el Service Account tiene acceso a la carpeta
- Verificar `GOOGLE_PRIVATE_KEY` tiene el formato correcto
- Verificar `GOOGLE_DRIVE_ROOT_FOLDER_ID` es correcto
- En Google Cloud Console, verificar que Drive API está habilitada

### 5.4 Logs de debugging

En Vercel:
1. Ve a **Deployments** → Click en un deployment
2. Click en **Functions**
3. Ver logs de ejecución

---

## Resumen de Variables

```env
# Supabase
SUPABASE_URL=https://lrzcturtxtzhdzqacefy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Drive Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=facturaflow-drive@facturaflow-12345.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
GOOGLE_DRIVE_ROOT_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz

# Configuración de negocio
EXPECTED_RECEIVER_RFC=BLI180227F23

# Gemini AI (para extracción)
GEMINI_API_KEY=AIzaSyA...
```

---

## Soporte

Si tienes problemas con la configuración:
- Abre un issue en GitHub
- Contacta a soporte@partrunner.com
