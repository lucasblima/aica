/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_GEMINI_API_KEY: string;
    readonly VITE_N8N_URL: string;
    readonly VITE_N8N_API_KEY: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_PLANE_BASE_URL: string;
    readonly VITE_PLANE_API_KEY: string;
    readonly VITE_PLANE_WORKSPACE_SLUG: string;
    readonly VITE_METABASE_API_URL: string;
    readonly VITE_CUSTOM_APP_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
