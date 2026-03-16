/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_SENTRY_DSN: string;
    readonly VITE_CUSTOM_APP_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
