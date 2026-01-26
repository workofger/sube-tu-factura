/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly BASE_URL: string;
  // Note: No frontend env vars needed - all API keys are server-side only
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
