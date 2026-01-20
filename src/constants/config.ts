// Configuration constants
export const CONFIG = {
  // Expected receiver RFC for validation
  EXPECTED_RECEIVER_RFC: "BLI180227F23",
  
  // n8n Webhook URL
  WEBHOOK_URL: "https://partrunnern8n.com/webhook/a1ed99cc-3561-4592-8459-3aad11492b03",
  
  // Email domain options
  EMAIL_DOMAINS: [
    { value: '@gmail.com', label: '@gmail.com' },
    { value: '@hotmail.com', label: '@hotmail.com' },
    { value: '@outlook.com', label: '@outlook.com' },
    { value: '@yahoo.com', label: '@yahoo.com' },
    { value: '@icloud.com', label: '@icloud.com' },
    { value: 'other', label: 'Otro...' },
  ],
  
  // Supported currencies
  CURRENCIES: ['MXN', 'USD'] as const,
  
  // Payment methods
  PAYMENT_METHODS: {
    PUE: 'PUE',
    PPD: 'PPD',
  } as const,
} as const;

export type Currency = typeof CONFIG.CURRENCIES[number];
export type PaymentMethod = keyof typeof CONFIG.PAYMENT_METHODS | '';
