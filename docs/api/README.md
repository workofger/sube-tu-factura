# FacturaFlow API - Guía de Integración

> **Versión:** 3.0.0  
> **Base URL:** `https://sube-tu-factura.vercel.app/api`  
> **Documentación Interactiva:** [/docs](/docs) (Swagger UI)  
> **Última actualización:** Enero 2026

---

## Índice

1. [Autenticación](#autenticación)
2. [Endpoints Públicos](#endpoints-públicos)
3. [Endpoints de Administración](#endpoints-de-administración)
4. [Endpoints de Usuario](#endpoints-de-usuario)
5. [API Keys](#api-keys)
6. [Ejemplos con cURL](#ejemplos-con-curl)
7. [Códigos de Error](#códigos-de-error)
8. [Rate Limiting](#rate-limiting)

---

## Autenticación

### Métodos de Autenticación

| Tipo | Header/Cookie | Uso |
|------|---------------|-----|
| API Key | `X-API-Key: pk_xxx...` | Acceso programático |
| Admin JWT | Cookie `admin_token` | Panel de administración |
| User JWT | Cookie `user_token` | Portal de usuarios (flotilleros) |

### Sin Autenticación

Los endpoints públicos (`/api/invoice`, `/api/validate`, `/api/health`) no requieren autenticación.
Las validaciones se realizan mediante:
- RFC del receptor esperado (configurado en el servidor)
- Validación de duplicados por UUID

---

## Endpoints Públicos

### POST /api/invoice

Procesa y registra una factura CFDI completa.

**Request Body:**

```json
{
  "week": 4,
  "project": "MERCADO LIBRE",
  "paymentProgram": "standard",
  "issuer": {
    "rfc": "XAXX010101000",
    "name": "Juan Pérez García",
    "regime": "626 - Régimen Simplificado de Confianza",
    "zipCode": "06600"
  },
  "receiver": {
    "rfc": "BLI180227F23",
    "name": "PartRunner Logistics SA de CV",
    "regime": "601",
    "zipCode": "01000",
    "cfdiUse": "G03"
  },
  "invoice": {
    "uuid": "3FA85F64-5717-4562-B3FC-2C963F66AFA6",
    "folio": "A-001",
    "series": "A",
    "date": "2026-01-20",
    "certificationDate": "2026-01-20T10:30:00",
    "satCertNumber": "00001000000509465028"
  },
  "payment": {
    "method": "PUE",
    "form": "03",
    "conditions": "Contado"
  },
  "financial": {
    "subtotal": 10000.00,
    "totalTax": 1600.00,
    "retentionIva": 640.00,
    "retentionIvaRate": 0.04,
    "retentionIsr": 125.00,
    "retentionIsrRate": 0.0125,
    "totalAmount": 10835.00,
    "currency": "MXN",
    "exchangeRate": 1
  },
  "items": [
    {
      "description": "Servicio de transporte de paquetería - Ruta CDMX-GDL",
      "quantity": 1,
      "unit": "E48",
      "unitPrice": 10000.00,
      "amount": 10000.00,
      "productKey": "78101802",
      "taxObject": "02"
    }
  ],
  "contact": {
    "email": "juan.perez@gmail.com",
    "phone": "5512345678"
  },
  "files": {
    "xml": {
      "name": "factura.xml",
      "content": "PD94bWwgdmVyc2l...", 
      "mimeType": "application/xml"
    },
    "pdf": {
      "name": "factura.pdf",
      "content": "JVBERi0xLjQKJe...",
      "mimeType": "application/pdf"
    }
  }
}
```

> **Nota:** `paymentProgram` puede ser `"standard"` (pago semana siguiente) o `"pronto_pago"` (pago inmediato con 8% de costo financiero).

**Response 201 (Éxito):**

```json
{
  "success": true,
  "message": "¡Factura registrada exitosamente!",
  "data": {
    "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
    "billerId": "660e8400-e29b-41d4-a716-446655440001",
    "driverId": "770e8400-e29b-41d4-a716-446655440002",
    "uuid": "3FA85F64-5717-4562-B3FC-2C963F66AFA6",
    "paymentProgram": "standard",
    "netPaymentAmount": 10835.00,
    "scheduledPaymentDate": "2026-01-27",
    "files": {
      "xml": "https://xxx.supabase.co/storage/v1/object/public/invoices/...",
      "pdf": "https://xxx.supabase.co/storage/v1/object/public/invoices/..."
    }
  }
}
```

---

### POST /api/validate

Verifica si un UUID ya existe en el sistema.

**Request Body:**

```json
{
  "uuid": "3FA85F64-5717-4562-B3FC-2C963F66AFA6"
}
```

**Response 200:**

```json
{
  "exists": false,
  "message": "UUID disponible para registro"
}
```

---

### POST /api/extract

Extrae datos de factura usando IA (OpenAI GPT-4o).

**Request Body:**

```json
{
  "xmlContent": "<?xml version=\"1.0\"...>",
  "pdfBase64": "JVBERi0xLjQKJe..."
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "issuer": { "rfc": "...", "name": "...", "regime": "..." },
    "receiver": { "rfc": "...", "name": "..." },
    "invoice": { "uuid": "...", "date": "...", "folio": "..." },
    "financial": { "subtotal": 10000, "totalTax": 1600, "totalAmount": 11600 },
    "items": [...]
  }
}
```

---

### GET /api/health

Verifica el estado de los servicios.

**Response 200:**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-20T10:30:00.000Z",
  "services": {
    "supabase": "connected",
    "supabaseStorage": "connected",
    "googleDrive": "connected"
  }
}
```

---

### GET /api/projects

Obtiene la lista de proyectos activos.

**Response 200:**

```json
{
  "success": true,
  "projects": [
    { "id": "...", "code": "MERCADO_LIBRE", "name": "Mercado Libre" },
    { "id": "...", "code": "AMAZON", "name": "Amazon" }
  ]
}
```

---

## Endpoints de Administración

Requieren autenticación con cookie `admin_token` JWT.

### POST /api/admin/login

Inicia sesión como administrador.

**Request Body:**

```json
{
  "email": "admin@company.com",
  "password": "secure_password"
}
```

**Response 200:**

```json
{
  "success": true,
  "user": {
    "id": "...",
    "email": "admin@company.com",
    "full_name": "Admin User",
    "role": "super_admin"
  }
}
```

---

### GET /api/admin/session

Verifica la sesión actual.

**Response 200:**

```json
{
  "authenticated": true,
  "user": {
    "id": "...",
    "email": "admin@company.com",
    "role": "super_admin"
  }
}
```

---

### POST /api/admin/logout

Cierra la sesión de administrador.

---

### GET /api/admin/invoices

Lista facturas con filtros y paginación.

**Query Parameters:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| page | number | Página (default: 1) |
| limit | number | Items por página (default: 50) |
| status | string | Filtro por estado |
| week | number | Filtro por semana |
| year | number | Filtro por año |
| project | string | Filtro por proyecto |
| paymentProgram | string | `standard` o `pronto_pago` |

---

### GET /api/admin/export-payments

Exporta archivo XLSX para pagos bancarios.

**Query Parameters:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| week | number | Semana de pago |
| year | number | Año de pago |
| paymentProgram | string | `standard`, `pronto_pago`, o `all` |

**Response:** Archivo XLSX con formato bancario (Shinkansen).

---

### GET /api/admin/config/:key

Obtiene una configuración del sistema.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "key": "payment_source_account",
    "value": {
      "account_number": "012180001182078281",
      "institution_id": "BBVA_MEXICO_MX"
    }
  }
}
```

---

### PUT /api/admin/config/:key

Actualiza una configuración (solo `super_admin`).

**Request Body:**

```json
{
  "value": {
    "account_number": "new_account",
    "institution_id": "NEW_BANK_MX"
  }
}
```

---

### GET /api/admin/api-keys

Lista API keys (solo muestra prefijo).

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "name": "Development Team",
      "key_prefix": "pk_abc12345",
      "scopes": ["public", "export"],
      "is_active": true,
      "created_at": "2026-01-20T10:00:00Z",
      "last_used_at": "2026-01-20T15:30:00Z"
    }
  ]
}
```

---

### POST /api/admin/api-keys

Crea una nueva API key (retorna key completo solo una vez).

**Request Body:**

```json
{
  "name": "Integration Key",
  "description": "Key para integración con ERP",
  "scopes": ["public", "export"],
  "rate_limit_per_minute": 100,
  "expires_at": "2027-01-20T00:00:00Z"
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Integration Key",
    "key": "pk_live_abc123xyz789...",
    "key_prefix": "pk_live_ab"
  },
  "message": "Guarda este key de forma segura. No se mostrará de nuevo."
}
```

---

### DELETE /api/admin/api-keys/:id

Revoca una API key.

---

## Endpoints de Usuario

Para flotilleros y drivers independientes. Autenticación con cookie `user_token`.

### POST /api/user/register

Registra un nuevo usuario.

**Request Body:**

```json
{
  "email": "driver@email.com",
  "password": "secure_password",
  "rfc": "XAXX010101000"
}
```

---

### POST /api/user/login

Inicia sesión como usuario.

**Request Body:**

```json
{
  "email": "driver@email.com",
  "password": "secure_password"
}
```

---

### POST /api/user/magic-link

Solicita un magic link para login sin contraseña.

**Request Body:**

```json
{
  "email": "driver@email.com"
}
```

---

### GET /api/user/verify-magic-link

Verifica el magic link y autentifica al usuario.

**Query Parameters:**

| Param | Tipo | Descripción |
|-------|------|-------------|
| token | string | Token del magic link |

---

### GET /api/user/profile

Obtiene el perfil del usuario autenticado.

---

## API Keys

### Uso

Incluir en el header de la petición:

```bash
curl -X GET https://sube-tu-factura.vercel.app/api/endpoint \
  -H "X-API-Key: pk_live_abc123xyz789..."
```

### Scopes

| Scope | Acceso |
|-------|--------|
| `public` | Endpoints públicos |
| `export` | Exportación de datos |
| `admin` | Endpoints de administración |
| `user` | Endpoints de usuario |

---

## Ejemplos con cURL

### Registrar factura con Pronto Pago

```bash
curl -X POST https://sube-tu-factura.vercel.app/api/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "week": 4,
    "project": "MERCADO LIBRE",
    "paymentProgram": "pronto_pago",
    "issuer": { "rfc": "XAXX010101000", "name": "Juan Pérez" },
    "receiver": { "rfc": "BLI180227F23" },
    "invoice": { "uuid": "3FA85F64-5717-4562-B3FC-2C963F66AFA6", "date": "2026-01-20" },
    "payment": { "method": "PUE" },
    "financial": { "subtotal": 10000, "totalTax": 1600, "totalAmount": 11600, "currency": "MXN" },
    "items": [{ "description": "Servicio", "quantity": 1, "unitPrice": 10000, "amount": 10000 }],
    "contact": { "email": "driver@email.com" },
    "files": { "xml": { "name": "f.xml", "content": "BASE64...", "mimeType": "application/xml" } }
  }'
```

### Exportar pagos (con API Key)

```bash
curl -X GET "https://sube-tu-factura.vercel.app/api/admin/export-payments?week=4&year=2026" \
  -H "X-API-Key: pk_live_abc123..." \
  -o pagos_sem4.xlsx
```

---

## Códigos de Error

| Código | Error | Descripción |
|--------|-------|-------------|
| 200 | - | Operación exitosa |
| 201 | - | Recurso creado |
| 400 | VALIDATION_ERROR | Datos inválidos |
| 401 | UNAUTHORIZED | No autenticado |
| 403 | FORBIDDEN | Sin permisos |
| 404 | NOT_FOUND | Recurso no encontrado |
| 409 | DUPLICATE_INVOICE | Factura duplicada |
| 429 | RATE_LIMIT | Límite de peticiones excedido |
| 500 | INTERNAL_ERROR | Error interno |

---

## Rate Limiting

### Límites por defecto

| Tipo | Por Minuto | Por Día |
|------|------------|---------|
| Sin API Key | 10 | 100 |
| API Key (public) | 60 | 10,000 |
| API Key (admin) | 100 | 50,000 |

### Headers de respuesta

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1706187600
```

---

## Almacenamiento de Archivos

Los archivos se almacenan en dos ubicaciones:

1. **Supabase Storage** (principal) - URLs públicas accesibles
2. **Google Drive** (backup) - Organizado por semana/proyecto/emisor

### Estructura en Supabase Storage

```
invoices/
├── 2026/
│   ├── sem04/
│   │   ├── MERCADO_LIBRE/
│   │   │   └── XAXX010101000/
│   │   │       ├── uuid-factura.xml
│   │   │       └── uuid-factura.pdf
```

---

## Soporte

- **Documentación Interactiva:** [/docs](/docs)
- **Email:** soporte@partrunner.com
- **GitHub Issues:** [github.com/workofger/sube-tu-factura/issues](https://github.com/workofger/sube-tu-factura/issues)
