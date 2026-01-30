# Deploy: Facturación Electrónica

Guía para desplegar la funcionalidad de facturación electrónica en ambiente de pruebas.

## Pre-requisitos

1. Cuenta en [Facturapi](https://www.facturapi.io/)
2. API Keys de prueba de Facturapi
3. Migración SQL `014_add_facturacion_electronica.sql` ejecutada en Supabase

## Paso 1: Obtener API Keys de Facturapi

1. Ingresa a tu [Dashboard de Facturapi](https://dashboard.facturapi.io/)
2. Ve a **Configuración > API Keys**
3. Copia tu **Test Secret Key** (comienza con `sk_test_`)

> ⚠️ **Importante**: Usa SIEMPRE las llaves de prueba (`sk_test_`) en ambientes de desarrollo.

## Paso 2: Configurar Variables de Entorno en Vercel

Ve a tu proyecto en [Vercel Dashboard](https://vercel.com/) y agrega las siguientes variables:

### Variables Requeridas

| Variable | Valor | Ejemplo |
|----------|-------|---------|
| `FACTURAPI_API_KEY_TEST` | Tu API Key de pruebas | `sk_test_abc123...` |
| `FACTURAPI_ENVIRONMENT` | `test` | `test` |

### Para Producción (cuando esté listo)

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `FACTURAPI_API_KEY` | Tu API Key de producción | `sk_live_abc123...` |
| `FACTURAPI_ENVIRONMENT` | `live` | Activar modo producción |

## Paso 3: Deploy en Preview Environment

### Opción A: Desde GitHub (Recomendado)

1. El branch `feature/facturacion-electronica` se desplegará automáticamente en Vercel como Preview
2. Accede a la URL de preview: `https://sube-tu-factura-{hash}-{team}.vercel.app`

### Opción B: Deploy Manual

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy preview
vercel --prebuilt
```

## Paso 4: Verificar la Instalación

### 4.1 Verificar Health Check

```bash
curl https://tu-preview-url.vercel.app/api/health
```

Debe incluir `facturapi: true` si las credenciales están configuradas.

### 4.2 Probar Flujo Completo

1. **Login como Flotillero**
   - Usa un flotillero de prueba o crea uno nuevo

2. **Completar Perfil Fiscal**
   - RFC (puede ser ficticio para pruebas)
   - Nombre fiscal
   - Régimen fiscal
   - Código postal

3. **Cargar CSD de Prueba**
   - Facturapi proporciona CSD de prueba en su dashboard
   - O usa los CSD del SAT para ambiente de pruebas

4. **Emitir Factura de Prueba**
   - Usa RFC genérico: `XAXX010101000`
   - Las facturas de prueba NO se envían al SAT

## Archivos CSD de Prueba

Facturapi proporciona certificados de prueba. También puedes usar:

- **RFC de Prueba**: `EKU9003173C9`
- Archivos disponibles en el portal del SAT para pruebas

## Estructura de la Base de Datos

La migración `014_add_facturacion_electronica.sql` crea:

### Tabla `flotilleros` (columnas nuevas)
- `facturapi_organization_id` - ID de organización en Facturapi
- `csd_uploaded_at` - Fecha de carga del CSD
- `csd_valid_until` - Vigencia del certificado
- `csd_serial_number` - Número de serie
- `invoicing_enabled` - Flag de facturación habilitada

### Tabla `issued_invoices`
- Almacena facturas, notas de crédito y complementos de pago emitidos
- Relacionada con `flotilleros`

### Tabla `payment_complement_details`
- Detalle de documentos relacionados en complementos de pago

## Endpoints Disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/user/csd` | GET | Estado del CSD |
| `/api/user/csd` | POST | Cargar CSD |
| `/api/user/csd` | DELETE | Eliminar CSD |
| `/api/user/invoices/create?type=ingreso` | POST | Crear factura |
| `/api/user/invoices/create?type=egreso` | POST | Crear nota de crédito |
| `/api/user/invoices/create?type=pago` | POST | Crear complemento de pago |
| `/api/user/invoices/list` | GET | Listar facturas |
| `/api/user/invoices/download` | GET | Descargar XML/PDF |
| `/api/user/invoices/cancel` | POST | Cancelar factura |

## Troubleshooting

### Error: "Facturapi API key not configured"

- Verifica que `FACTURAPI_API_KEY_TEST` esté configurada en Vercel
- Verifica que `FACTURAPI_ENVIRONMENT=test`

### Error: "Contraseña incorrecta para archivo .key"

- La contraseña del CSD es sensible a mayúsculas/minúsculas
- Verifica que estés usando el CSD correcto (prueba vs producción)

### Error: "RFC no coincide"

- El RFC del CSD debe coincidir con el RFC del perfil del flotillero
- Para pruebas, usa RFC de prueba de Facturapi

### Error: "Información fiscal incompleta"

- El flotillero debe completar: RFC, nombre fiscal, régimen fiscal, código postal
- Estos datos se usan para crear la organización en Facturapi

## Limitaciones del Ambiente de Prueba

1. Las facturas NO se envían al SAT
2. Los UUID generados son ficticios
3. No hay validación real del RFC
4. Las cancelaciones son simuladas

## Checklist Pre-Producción

- [ ] Migrar a API Key de producción
- [ ] Cambiar `FACTURAPI_ENVIRONMENT` a `live`
- [ ] Verificar que flotilleros tengan CSD reales
- [ ] Configurar alertas de expiración de CSD
- [ ] Revisar logs de facturación
- [ ] Probar flujo completo con factura real

## Soporte

- **Documentación Facturapi**: https://docs.facturapi.io/
- **Portal SAT**: https://www.sat.gob.mx/
- **Soporte Facturapi**: soporte@facturapi.io
