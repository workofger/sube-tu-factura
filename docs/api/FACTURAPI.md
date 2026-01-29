# Facturapi Integration Setup

This document describes how to configure Facturapi for electronic invoicing.

## Prerequisites

1. Create an account at [Facturapi](https://www.facturapi.io/)
2. Obtain your API keys from the dashboard

## Environment Variables

Add the following environment variables to your Vercel project:

```bash
# Facturapi API Keys
FACTURAPI_API_KEY=sk_live_...        # Live (production) API key
FACTURAPI_API_KEY_TEST=sk_test_...   # Test (development) API key

# Facturapi Webhook Secret (optional, for webhook verification)
FACTURAPI_WEBHOOK_SECRET=whsec_...
```

### Getting Your API Keys

1. Log in to [Facturapi Dashboard](https://dashboard.facturapi.io/)
2. Go to **Settings** → **API Keys**
3. Copy the **Test Secret Key** for development
4. Copy the **Live Secret Key** for production

## Test Environment

During development, the system uses the Test API key:
- Invoices are NOT sent to SAT
- You can use SAT's test certificates (CSD de prueba)
- No real fiscal validity

## Production Environment

For production:
- Use the Live API key
- Real invoices will be stamped and sent to SAT
- Use real CSD certificates from flotilleros

## CSD (Certificado de Sello Digital)

Each flotillero needs to upload their own CSD:
- `.cer` file (certificate)
- `.key` file (private key)
- Password for the private key

**Security Note**: The `.key` file and password are sent directly to Facturapi. We do NOT store them in our database.

## Features Supported

### Invoice Types (CFDI Types)

| Type | Code | Description |
|------|------|-------------|
| Ingreso | I | Standard invoice for services |
| Egreso | E | Credit note (for discounts, returns) |
| Pago | P | Payment complement (for PPD invoices) |

### Cancellation Motives

| Code | Description |
|------|-------------|
| 01 | Comprobante emitido con errores con relación |
| 02 | Comprobante emitido con errores sin relación |
| 03 | No se llevó a cabo la operación |
| 04 | Operación nominativa relacionada |

## API Endpoints

### CSD Management

- `POST /api/user/csd` - Upload CSD files
- `GET /api/user/csd/status` - Check CSD status
- `DELETE /api/user/csd` - Remove CSD

### Invoice Issuance

- `POST /api/user/invoices/create` - Create any invoice type
- `GET /api/user/invoices` - List issued invoices
- `GET /api/user/invoices/:id` - Get invoice details
- `GET /api/user/invoices/:id/pdf` - Download PDF
- `GET /api/user/invoices/:id/xml` - Download XML
- `POST /api/user/invoices/:id/cancel` - Cancel invoice

## Webhook Events

Facturapi can send webhook notifications for:
- `invoice.stamped` - Invoice successfully stamped
- `invoice.global_stamped` - Global invoice stamped
- `invoice.cancelled` - Invoice cancelled
- `invoice.cancellation_pending` - Cancellation pending SAT response
- `invoice.cancellation_rejected` - Cancellation rejected by SAT

Configure your webhook URL in Facturapi dashboard:
```
https://your-domain.com/api/webhooks/facturapi
```

## Testing with SAT Test Certificates

For testing, you can use SAT's official test certificates:
- Download from: https://www.sat.gob.mx/consultas/19964/conoce-los-servicios-especializados-de-validacion

Test RFC examples:
- `EKU9003173C9` (Escuela Kemper Urgate)
- `CACX7605101P8` (Xochitl Casas Chavez)
