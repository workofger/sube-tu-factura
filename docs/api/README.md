# FacturaFlow API - Guía de Integración

> **Versión:** 1.0.0  
> **Base URL:** `https://sube-tu-factura.vercel.app/api`  
> **Última actualización:** Enero 2026

---

## Índice

1. [Autenticación](#autenticación)
2. [Endpoints](#endpoints)
3. [Ejemplos con cURL](#ejemplos-con-curl)
4. [Códigos de Error](#códigos-de-error)
5. [Rate Limiting](#rate-limiting)

---

## Autenticación

Actualmente la API no requiere autenticación. Las validaciones se realizan mediante:
- RFC del receptor esperado (configurado en el servidor)
- Validación de duplicados por UUID

---

## Endpoints

### 1. POST /api/invoice

Procesa y registra una factura CFDI completa.

**URL:** `POST /api/invoice`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**

```json
{
  "week": 4,
  "project": "MERCADO LIBRE",
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

> **Nota:** Los campos `content` en `files` deben ser el contenido del archivo codificado en **Base64**.

**Response 201 (Éxito):**

```json
{
  "success": true,
  "message": "¡Factura registrada exitosamente!",
  "data": {
    "invoiceId": "550e8400-e29b-41d4-a716-446655440000",
    "uuid": "3FA85F64-5717-4562-B3FC-2C963F66AFA6",
    "driveFolderPath": "Semana_04_2026/MERCADO_LIBRE/XAXX010101000_Juan_Perez_Garcia",
    "files": {
      "xml": "https://drive.google.com/file/d/1abc.../view",
      "pdf": "https://drive.google.com/file/d/2def.../view"
    }
  }
}
```

**Response 409 (Duplicado):**

```json
{
  "success": false,
  "error": "DUPLICATE_INVOICE",
  "message": "Esta factura ya fue registrada anteriormente",
  "data": {
    "existingInvoiceId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Response 400 (Error de Validación):**

```json
{
  "success": false,
  "error": "VALIDATION_ERROR",
  "message": "Datos inválidos",
  "details": [
    "RFC del emisor es requerido",
    "UUID tiene formato inválido"
  ]
}
```

---

### 2. POST /api/validate

Verifica si un UUID ya existe en el sistema (sin guardar datos).

**URL:** `POST /api/validate`

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

```json
{
  "exists": true,
  "message": "Esta factura ya está registrada en el sistema",
  "existingInvoiceId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 3. GET /api/health

Verifica el estado de los servicios conectados.

**URL:** `GET /api/health`

**Response 200 (Healthy):**

```json
{
  "status": "healthy",
  "timestamp": "2026-01-20T10:30:00.000Z",
  "services": {
    "supabase": "connected",
    "googleDrive": "connected"
  }
}
```

**Response 207 (Degraded):**

```json
{
  "status": "degraded",
  "timestamp": "2026-01-20T10:30:00.000Z",
  "services": {
    "supabase": "connected",
    "googleDrive": "disconnected"
  }
}
```

---

## Ejemplos con cURL

### Registrar una factura

```bash
curl -X POST https://sube-tu-factura.vercel.app/api/invoice \
  -H "Content-Type: application/json" \
  -d '{
    "week": 4,
    "project": "MERCADO LIBRE",
    "issuer": {
      "rfc": "XAXX010101000",
      "name": "Juan Pérez"
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
    "items": [{
      "description": "Servicio de transporte",
      "quantity": 1,
      "unitPrice": 10000,
      "amount": 10000
    }],
    "contact": {},
    "files": {
      "xml": {
        "name": "factura.xml",
        "content": "BASE64_CONTENT_HERE",
        "mimeType": "application/xml"
      }
    }
  }'
```

### Validar UUID

```bash
curl -X POST https://sube-tu-factura.vercel.app/api/validate \
  -H "Content-Type: application/json" \
  -d '{"uuid": "3FA85F64-5717-4562-B3FC-2C963F66AFA6"}'
```

### Verificar salud del API

```bash
curl https://sube-tu-factura.vercel.app/api/health
```

---

## Códigos de Error

| Código | Error | Descripción |
|--------|-------|-------------|
| 200 | - | Operación exitosa |
| 201 | - | Recurso creado exitosamente |
| 207 | - | Multi-Status (servicios degradados) |
| 400 | VALIDATION_ERROR | Datos de entrada inválidos |
| 405 | METHOD_NOT_ALLOWED | Método HTTP no permitido |
| 409 | DUPLICATE_INVOICE | La factura ya existe |
| 500 | INTERNAL_ERROR | Error interno del servidor |
| 503 | - | Servicios no disponibles |

---

## Rate Limiting

La API está desplegada en Vercel y hereda sus límites:

- **Hobby:** 100 invocaciones/día
- **Pro:** 1000 invocaciones/día (expandible)

Para proyectos de alto volumen, considera:
- Implementar caché en cliente
- Usar la validación `/api/validate` antes de enviar facturas completas
- Contactar para plan Enterprise

---

## Estructura de Carpetas en Google Drive

Los archivos se organizan automáticamente:

```
Facturas/
├── Semana_01_2026/
│   ├── MERCADO_LIBRE/
│   │   └── XAXX010101000_Juan_Perez/
│   │       ├── UUID-FACTURA-1.xml
│   │       └── UUID-FACTURA-1.pdf
│   └── AMAZON/
│       └── YAXX020202000_Maria_Lopez/
└── Semana_02_2026/
    └── ...
```

---

## Soporte

Para dudas o problemas:
- **Email:** soporte@partrunner.com
- **GitHub Issues:** [github.com/workofger/sube-tu-factura/issues](https://github.com/workofger/sube-tu-factura/issues)
