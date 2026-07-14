/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_SOURCE?: string;
  readonly VITE_POLL_INTERVAL_MS?: string;
  readonly VITE_RELOAD_INTERVAL_MS?: string;
  readonly VITE_BOARD?: 'full' | 'mini' | 'auto';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
