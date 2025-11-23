
import axios from 'axios';

// --- n8n API ---
const N8N_BASE_URL = import.meta.env.VITE_N8N_URL;
const N8N_API_KEY = import.meta.env.VITE_N8N_API_KEY;

export const n8nApi = axios.create({
    baseURL: N8N_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': N8N_API_KEY
    },
});

// --- Evolution API ---
const EVOLUTION_BASE_URL = import.meta.env.VITE_EVOLUTION_URL;
const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY;

export const evolutionApi = axios.create({
    baseURL: EVOLUTION_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
    },
});

// --- Custom App API ---
const CUSTOM_APP_URL = import.meta.env.VITE_CUSTOM_APP_URL || 'https://aica-5562559893.us-west1.run.app/';

export const customAppApi = axios.create({
    baseURL: CUSTOM_APP_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});
