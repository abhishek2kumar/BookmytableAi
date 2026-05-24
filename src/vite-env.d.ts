/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PAYTM_MID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
