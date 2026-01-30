# API de Facturación Electrónica

Esta documentación describe los endpoints de facturación electrónica para flotilleros usando Facturapi.

## Índice

1. [Configuración](#configuración)
2. [Gestión de CSD](#gestión-de-csd)
3. [Emisión de Facturas](#emisión-de-facturas)
4. [Listado y Descarga](#listado-y-descarga)
5. [Cancelación](#cancelación)
6. [Tipos y Catálogos](#tipos-y-catálogos)

---

## Configuración

### Variables de Entorno Requeridas

```env
# Facturapi API Keys
FACTURAPI_API_KEY=sk_live_xxxxx        # API Key de producción
FACTURAPI_API_KEY_TEST=sk_test_xxxxx   # API Key de pruebas
FACTURAPI_ENVIRONMENT=test             # 'test' o 'live'
```

### Flujo de Configuración

1. El flotillero completa su información fiscal en el perfil
2. El flotillero sube su CSD (archivos `.cer` y `.key` + contraseña)
3. El sistema crea una organización en Facturapi
4. El flotillero puede emitir facturas

---

## Gestión de CSD

### Obtener Estado del CSD

```http
GET /api/user/csd
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "message": "Estado del CSD obtenido",
  "data": {
    "status": "active",
    "invoicingEnabled": true,
    "certificate": {
      "serialNumber": "30001000000500003416",
      "validUntil": "2027-05-15",
      "daysUntilExpiry": 850,
      "uploadedAt": "2026-01-30T12:00:00Z"
    },
    "fiscalInfo": {
      "rfc": "XAXX010101000",
      "name": "NOMBRE DEL CONTRIBUYENTE",
      "regime": "612",
      "zipCode": "06600"
    }
  }
}
```

**Estados posibles:**
- `none` - Sin CSD configurado
- `active` - CSD activo y vigente
- `expired` - CSD vencido
- `error` - Error al verificar el CSD

---

### Cargar CSD

```http
POST /api/user/csd
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**

```json
{
  "cerFile": "base64_encoded_cer_content",
  "keyFile": "base64_encoded_key_content",
  "password": "contraseña_del_key"
}
```

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "message": "CSD cargado exitosamente. Ya puedes emitir facturas.",
  "data": {
    "status": "active",
    "invoicingEnabled": true,
    "certificate": {
      "serialNumber": "30001000000500003416",
      "validUntil": "2027-05-15",
      "daysUntilExpiry": 850,
      "uploadedAt": "2026-01-30T12:00:00Z"
    }
  }
}
```

**Errores Comunes:**

| Código | Error | Descripción |
|--------|-------|-------------|
| 400 | `VALIDATION_ERROR` | Faltan archivos o contraseña |
| 400 | `INVALID_CSD` | Archivos CSD con formato incorrecto |
| 400 | `CSD_UPLOAD_FAILED` | Error de Facturapi (contraseña incorrecta, CSD vencido, etc.) |
| 400 | `INCOMPLETE_FISCAL_INFO` | Información fiscal incompleta en el perfil |

---

### Eliminar CSD

```http
DELETE /api/user/csd
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "message": "CSD eliminado exitosamente",
  "data": {
    "status": "none",
    "invoicingEnabled": false,
    "certificate": null
  }
}
```

---

## Emisión de Facturas

### Crear Factura de Ingreso (Tipo I)

```http
POST /api/user/invoices/create?type=ingreso
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**

```json
{
  "customer": {
    "legalName": "CLIENTE SA DE CV",
    "rfc": "XAXX010101000",
    "fiscalRegime": "601",
    "zipCode": "06600",
    "email": "cliente@ejemplo.com"
  },
  "items": [
    {
      "description": "Servicio de transporte de mercancías",
      "productKey": "78102200",
      "unitKey": "E48",
      "unitName": "Servicio",
      "quantity": 1,
      "price": 1000.00,
      "taxIncluded": true,
      "taxes": [
        {
          "type": "IVA",
          "rate": 0.16,
          "factor": "Tasa"
        }
      ]
    }
  ],
  "paymentForm": "03",
  "paymentMethod": "PUE",
  "cfdiUse": "G03"
}
```

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "message": "Factura creada exitosamente",
  "data": {
    "id": "uuid-interno",
    "facturapiId": "abc123",
    "uuid": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
    "folio": 1,
    "series": "A",
    "total": 1160.00,
    "status": "stamped",
    "verificationUrl": "https://verificacfdi.facturaelectronica.sat.gob.mx/..."
  }
}
```

---

### Crear Nota de Crédito (Tipo E)

```http
POST /api/user/invoices/create?type=egreso
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**

```json
{
  "customer": {
    "legalName": "CLIENTE SA DE CV",
    "rfc": "XAXX010101000",
    "fiscalRegime": "601",
    "zipCode": "06600"
  },
  "items": [
    {
      "description": "Descuento por pronto pago",
      "productKey": "84111506",
      "unitKey": "ACT",
      "quantity": 1,
      "price": 100.00,
      "taxes": [
        {
          "type": "IVA",
          "rate": 0.16,
          "factor": "Tasa"
        }
      ]
    }
  ],
  "paymentForm": "03",
  "cfdiUse": "G02",
  "relatedUuids": ["XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"]
}
```

---

### Crear Complemento de Pago (Tipo P)

```http
POST /api/user/invoices/create?type=pago
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**

```json
{
  "customer": {
    "legalName": "CLIENTE SA DE CV",
    "rfc": "XAXX010101000",
    "fiscalRegime": "601",
    "zipCode": "06600"
  },
  "payments": [
    {
      "paymentForm": "03",
      "currency": "MXN",
      "date": "2026-01-30T12:00:00Z",
      "amount": 5000.00,
      "operationNumber": "REF123456",
      "relatedDocuments": [
        {
          "uuid": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
          "currency": "MXN",
          "installment": 1,
          "previousBalance": 10000.00,
          "amountPaid": 5000.00
        }
      ]
    }
  ]
}
```

---

## Listado y Descarga

### Listar Facturas Emitidas

```http
GET /api/user/invoices/list
Authorization: Bearer {token}
```

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `page` | number | Página (default: 1) |
| `limit` | number | Registros por página (default: 10) |
| `type` | string | Filtrar por tipo: `I`, `E`, `P` |
| `status` | string | Filtrar por estado: `stamped`, `cancelled` |
| `search` | string | Buscar por RFC o nombre |
| `startDate` | string | Fecha inicial (ISO) |
| `endDate` | string | Fecha final (ISO) |

**Respuesta Exitosa (200):**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid-interno",
        "facturapiId": "abc123",
        "cfdiType": "I",
        "cfdiTypeName": "Ingreso",
        "uuid": "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
        "folio": "1",
        "series": "A",
        "issueDate": "2026-01-30T12:00:00Z",
        "receiverRfc": "XAXX010101000",
        "receiverName": "CLIENTE SA DE CV",
        "total": 1160.00,
        "currency": "MXN",
        "status": "stamped",
        "statusName": "Timbrada",
        "createdAt": "2026-01-30T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 50,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

---

### Descargar XML/PDF

```http
GET /api/user/invoices/download?id={invoiceId}&format={xml|pdf}
Authorization: Bearer {token}
```

Retorna el archivo binario con los headers correspondientes.

---

## Cancelación

### Cancelar Factura

```http
POST /api/user/invoices/cancel?id={invoiceId}
Authorization: Bearer {token}
Content-Type: application/json
```

**Body:**

```json
{
  "motive": "02",
  "substitutionUuid": null
}
```

**Motivos de Cancelación (SAT):**

| Código | Descripción | ¿Requiere UUID sustitución? |
|--------|-------------|---------------------------|
| `01` | Comprobante emitido con errores con relación | Sí |
| `02` | Comprobante emitido con errores sin relación | No |
| `03` | No se llevó a cabo la operación | No |
| `04` | Operación nominativa relacionada en factura global | No |

---

## Tipos y Catálogos

### Formas de Pago

| Código | Descripción |
|--------|-------------|
| 01 | Efectivo |
| 02 | Cheque nominativo |
| 03 | Transferencia electrónica |
| 04 | Tarjeta de crédito |
| 28 | Tarjeta de débito |
| 99 | Por definir |

### Usos de CFDI

| Código | Descripción |
|--------|-------------|
| G01 | Adquisición de mercancías |
| G02 | Devoluciones, descuentos o bonificaciones |
| G03 | Gastos en general |
| I01 | Construcciones |
| I03 | Equipo de transporte |
| S01 | Sin efectos fiscales |
| CP01 | Pagos |

### Regímenes Fiscales Comunes

| Código | Descripción |
|--------|-------------|
| 601 | General de Ley Personas Morales |
| 612 | Personas Físicas con Actividades Empresariales |
| 621 | Incorporación Fiscal |
| 626 | Régimen Simplificado de Confianza (RESICO) |

---

## Consideraciones de Seguridad

1. **Archivos CSD**: Los archivos `.cer` y `.key` se transmiten en Base64 y nunca se almacenan localmente. Solo se envían a Facturapi.

2. **Contraseña del CSD**: La contraseña solo se usa en el momento de carga y nunca se persiste.

3. **Tokens**: Todos los endpoints requieren autenticación JWT del usuario.

4. **Organización Facturapi**: Cada flotillero tiene su propia organización en Facturapi para aislamiento de datos.

---

## Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `UNAUTHORIZED` | Token inválido o expirado | Iniciar sesión nuevamente |
| `INVOICING_DISABLED` | CSD no configurado | Cargar CSD en perfil |
| `INVALID_CSD` | Archivos CSD corruptos | Verificar archivos del SAT |
| `CSD_EXPIRED` | CSD vencido | Renovar CSD en SAT |
| `INVALID_RFC` | RFC no coincide | Verificar RFC en perfil |

---

## Ejemplos de Código (Frontend)

### Cargar CSD

```typescript
import { uploadCSD } from '@/services/invoicingService';

const handleUpload = async (cerFile: File, keyFile: File, password: string) => {
  try {
    const result = await uploadCSD(cerFile, keyFile, password);
    console.log('CSD cargado:', result.certificate.serialNumber);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```

### Crear Factura

```typescript
import { createIncomeInvoice } from '@/services/invoicingService';

const handleCreateInvoice = async () => {
  const payload = {
    customer: {
      legalName: 'CLIENTE SA DE CV',
      rfc: 'XAXX010101000',
      fiscalRegime: '601',
      zipCode: '06600',
    },
    items: [{
      description: 'Servicio de transporte',
      productKey: '78102200',
      unitKey: 'E48',
      quantity: 1,
      price: 1000,
      taxes: [{ type: 'IVA', rate: 0.16, factor: 'Tasa' }],
    }],
    paymentForm: '03',
    paymentMethod: 'PUE',
    cfdiUse: 'G03',
  };

  try {
    const invoice = await createIncomeInvoice(payload);
    console.log('Factura creada:', invoice.uuid);
  } catch (error) {
    console.error('Error:', error.message);
  }
};
```
