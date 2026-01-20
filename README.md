# FacturaFlow AI - Sube tu Factura

![FacturaFlow AI](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

Aplicación web para procesar facturas CFDI mexicanas utilizando inteligencia artificial (Google Gemini) para extraer automáticamente los datos fiscales.

## 🚀 Características

- **Extracción automática con IA**: Sube XML y PDF, la IA extrae todos los campos automáticamente
- **Validación de RFC**: Verifica que el RFC receptor sea el esperado
- **Soporte completo CFDI 4.0**: Extrae todos los campos del estándar mexicano
- **Envío a Webhook**: Envía los datos estructurados + archivos en Base64 a n8n
- **UI moderna**: Interfaz intuitiva con Tailwind CSS

## 📋 Datos que se extraen y envían

El webhook recibe un payload JSON estructurado con:

### Emisor (Issuer)
- RFC, Nombre, Régimen Fiscal, Código Postal

### Receptor (Receiver)  
- RFC, Nombre, Régimen Fiscal, Código Postal, Uso CFDI

### Factura (Invoice)
- UUID (Folio Fiscal), Folio, Serie, Fecha, Fecha de Timbrado, No. Certificado SAT

### Pago (Payment)
- Método de Pago (PUE/PPD), Forma de Pago, Condiciones

### Financiero (Financial)
- Subtotal, IVA Trasladado, Retención IVA (monto y tasa), Retención ISR (monto y tasa), Total, Moneda, Tipo de Cambio

### Conceptos (Items)
- Descripción, Cantidad, Unidad, Precio Unitario, Importe, Clave Producto, Objeto de Impuesto

### Archivos (Files)
- XML en Base64
- PDF en Base64

## 🛠️ Tecnologías

- **React 19** - Framework UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool
- **Tailwind CSS** - Estilos
- **Google Gemini AI** - Extracción de datos
- **Lucide React** - Iconos

## 📦 Instalación

```bash
# Clonar el repositorio
git clone <repo-url>
cd sube-tu-factura

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tu GEMINI_API_KEY

# Iniciar servidor de desarrollo
npm run dev
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env.local` con:

```env
GEMINI_API_KEY=tu_api_key_de_gemini
```

Obtén tu API key en: https://aistudio.google.com/app/apikey

### Configuración del Webhook

Edita `src/constants/config.ts` para cambiar:

- `WEBHOOK_URL`: URL de tu webhook n8n
- `EXPECTED_RECEIVER_RFC`: RFC esperado del receptor

## 📁 Estructura del Proyecto

```
src/
├── components/
│   ├── common/           # Componentes UI reutilizables
│   │   ├── InputField.tsx
│   │   ├── SelectField.tsx
│   │   └── FileUpload.tsx
│   ├── sections/         # Secciones del formulario
│   │   ├── FileUploadSection.tsx
│   │   ├── FiscalInfoSection.tsx
│   │   ├── PaymentSection.tsx
│   │   └── ItemsTable.tsx
│   └── layout/
│       ├── Header.tsx
│       └── WhatsAppButton.tsx
├── hooks/
│   ├── useWeekOptions.ts
│   ├── useInvoiceForm.ts
│   └── useInvoiceExtraction.ts
├── services/
│   ├── geminiService.ts  # Extracción con IA
│   └── webhookService.ts # Envío al webhook
├── types/
│   └── invoice.ts        # Tipos TypeScript
├── utils/
│   ├── dates.ts          # Funciones de fecha/semana
│   ├── files.ts          # Conversión Base64
│   └── formatters.ts     # Formateo de números
├── constants/
│   └── config.ts         # Configuración
├── App.tsx
├── main.tsx
└── index.css
```

## 🔗 Integración con n8n

El webhook envía un payload JSON con la siguiente estructura:

```json
{
  "submittedAt": "2026-01-19T12:00:00.000Z",
  "week": "4",
  "project": "MERCADO LIBRE",
  "issuer": { "rfc": "...", "name": "...", "regime": "...", "zipCode": "..." },
  "receiver": { "rfc": "...", "name": "...", "regime": "...", "zipCode": "...", "cfdiUse": "..." },
  "invoice": { "uuid": "...", "folio": "...", "series": "...", "date": "...", "certificationDate": "...", "satCertNumber": "..." },
  "payment": { "method": "PUE", "form": "03", "conditions": "..." },
  "financial": { "subtotal": 1000, "totalTax": 160, "retentionIva": 40, "retentionIvaRate": 0.04, "retentionIsr": 0, "retentionIsrRate": 0, "totalAmount": 1120, "currency": "MXN", "exchangeRate": "" },
  "items": [{ "description": "...", "quantity": 1, "unitPrice": 1000, "amount": 1000, "unit": "E48", "productKey": "80131500", "taxObject": "02" }],
  "contact": { "email": "usuario@gmail.com", "phone": "5512345678" },
  "files": {
    "xml": { "name": "factura.xml", "content": "<base64>", "mimeType": "application/xml" },
    "pdf": { "name": "factura.pdf", "content": "<base64>", "mimeType": "application/pdf" }
  }
}
```

### En n8n puedes:

1. **Guardar en Supabase**: Usar el nodo de Supabase para insertar los datos estructurados
2. **Subir a Google Drive**: Decodificar Base64 y subir los archivos
3. **Enviar notificaciones**: Email, Slack, etc.

## 📝 Scripts

```bash
npm run dev      # Servidor de desarrollo
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Lint del código
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT
