# Guia de Configuracion de Credenciales

Esta guia detalla como configurar todas las credenciales necesarias para FacturaFlow AI.

---

## Indice

1. [OpenAI](#1-openai)
2. [Supabase](#2-supabase)
3. [Google Cloud Service Account](#3-google-cloud-service-account)
4. [Google Drive](#4-google-drive)
5. [Variables de Entorno en Vercel](#5-variables-de-entorno-en-vercel)
6. [Verificacion](#6-verificacion)

---

## 1. OpenAI

### 1.1 Crear cuenta

1. Ve a [platform.openai.com](https://platform.openai.com)
2. Crea una cuenta o inicia sesion
3. Agrega metodo de pago (requerido para GPT-4o)

### 1.2 Generar API Key

1. Ve a **API Keys** en el menu lateral
2. Click **Create new secret key**
3. Nombre: `facturaflow-production`
4. Click **Create**
5. **Copia la key inmediatamente** (no se puede ver de nuevo)

### 1.3 Formato de la key

```
sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Esta sera tu `OPENAI_API_KEY`.

> **Nota:** Esta key se usa SOLO en el backend (Vercel Functions). NO la expongas en el frontend.

---

## 2. Supabase

### 2.1 Crear proyecto

1. Ve a [supabase.com](https://supabase.com)
2. Click en **New Project**
3. Configura:
   - **Name:** `facturaflow`
   - **Database Password:** Guarda esta contrasena
   - **Region:** Selecciona la mas cercana

### 2.2 Ejecutar schema de base de datos

1. Ve a **SQL Editor** en el dashboard de Supabase
2. Ejecuta en orden:
   ```sql
   -- Primero el schema inicial
   -- Copia contenido de: database/001_initial_schema.sql
   
   -- Luego la migracion de flotilleros
   -- Copia contenido de: database/002_add_flotilleros.sql
   ```

### 2.3 Obtener credenciales

1. Ve a **Project Settings** → **API**
2. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (⚠️ NO anon key) → `SUPABASE_SERVICE_ROLE_KEY`

> ⚠️ **IMPORTANTE:** El `service_role` key tiene acceso total a la base de datos. NUNCA lo expongas en el frontend.

### 2.4 Ejemplo de credenciales

```env
SUPABASE_URL=https://lrzcturtxtzhdzqacefy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 3. Google Cloud Service Account

### 3.1 Crear proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Click en **Select a project** → **New Project**
3. Nombre: `FacturaFlow`
4. Click **Create**

### 3.2 Habilitar Google Drive API

1. Ve a **APIs & Services** → **Library**
2. Busca "Google Drive API"
3. Click **Enable**

### 3.3 Crear Service Account

1. Ve a **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Configura:
   - **Name:** `facturaflow-drive`
   - **Description:** `Service account para subir facturas a Drive`
4. Click **Create and Continue**
5. Skip role assignment (lo haremos en Drive)
6. Click **Done**

### 3.4 Generar clave JSON

1. Click en el Service Account creado
2. Ve a la pestana **Keys**
3. Click **Add Key** → **Create new key**
4. Selecciona **JSON**
5. Click **Create**
6. **Guarda el archivo JSON descargado** (⚠️ No lo pierdas)

### 3.5 Extraer credenciales del JSON

Del archivo JSON descargado, necesitas:

```json
{
  "client_email": "facturaflow-drive@facturaflow-xxxxx.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----\n"
}
```

Estas se convertiran en:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email`
- `GOOGLE_PRIVATE_KEY` = `private_key`

---

## 4. Google Drive

### 4.1 Crear carpeta raiz

1. Ve a [Google Drive](https://drive.google.com)
2. Crea una nueva carpeta: `Facturas CFDI`
3. Abre la carpeta

### 4.2 Obtener ID de la carpeta

De la URL de la carpeta:
```
https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz123456
                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                        Este es el GOOGLE_DRIVE_ROOT_FOLDER_ID
```

### 4.3 Compartir con Service Account

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

## 5. Variables de Entorno en Vercel

### 5.1 Configurar en Vercel Dashboard

1. Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/dashboard)
2. Click en tu proyecto → **Settings** → **Environment Variables**

### 5.2 Agregar cada variable

| Variable | Descripcion | Entornos |
|----------|-------------|----------|
| `OPENAI_API_KEY` | API key de OpenAI (sk-...) - Server-side | All |
| `SUPABASE_URL` | URL de Supabase | All |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | All |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email de Service Account | All |
| `GOOGLE_PRIVATE_KEY` | Private key del JSON | All |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | ID de carpeta raiz | All |
| `EXPECTED_RECEIVER_RFC` | RFC del receptor esperado | All |

### 5.3 Formato de GOOGLE_PRIVATE_KEY

⚠️ **MUY IMPORTANTE:** Al copiar la private key a Vercel:

**Opcion A: En una sola linea con `\n` literales**
```
-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkq...\n-----END PRIVATE KEY-----\n
```

**Opcion B: Multi-linea (Vercel lo soporta)**
```
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
...mas lineas...
-----END PRIVATE KEY-----
```

### 5.4 Redeploy

Despues de agregar las variables:
1. Ve a **Deployments**
2. Click en los **...** del ultimo deployment
3. Click **Redeploy**

---

## 6. Verificacion

### 6.1 Verificar health endpoint

```bash
curl https://tu-app.vercel.app/api/health
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

### 6.2 Si OpenAI falla

- Verificar que `OPENAI_API_KEY` esta configurada en Vercel (NO en el frontend)
- Verificar que la key comienza con `sk-`
- Verificar que tienes creditos en tu cuenta
- Verificar que el modelo `gpt-4o` esta disponible para tu cuenta

### 6.3 Si Supabase falla

- Verificar `SUPABASE_URL` no tiene `/` al final
- Verificar `SUPABASE_SERVICE_ROLE_KEY` es el **service_role**, no el anon key
- Verificar que el schema fue ejecutado (tablas existen)

### 6.4 Si Google Drive falla

- Verificar que el Service Account tiene acceso a la carpeta
- Verificar `GOOGLE_PRIVATE_KEY` tiene el formato correcto
- Verificar `GOOGLE_DRIVE_ROOT_FOLDER_ID` es correcto
- En Google Cloud Console, verificar que Drive API esta habilitada

### 6.5 Logs de debugging

En Vercel:
1. Ve a **Deployments** → Click en un deployment
2. Click en **Functions**
3. Ver logs de ejecucion

---

## Resumen de Variables

```env
# Backend - OpenAI (Server-side only - NEVER expose in frontend)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxx

# Backend - Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend - Google Drive Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=facturaflow@proyecto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n
GOOGLE_DRIVE_ROOT_FOLDER_ID=1AbCdEfGhIjKlMnOpQrStUvWxYz

# Backend - Configuracion
EXPECTED_RECEIVER_RFC=BLI180227F23
```

---

## Desarrollo Local

Para desarrollo local, crea `.env.local` en la raiz del proyecto:

```bash
cp .env.example .env.local
# Edita .env.local con tus credenciales
```

Luego ejecuta:
```bash
npm run dev
```

---

## Soporte

Si tienes problemas con la configuracion:
- Abre un issue en [GitHub](https://github.com/workofger/sube-tu-factura/issues)
- Revisa la [documentacion de arquitectura](../../ARCHITECTURE.md)
