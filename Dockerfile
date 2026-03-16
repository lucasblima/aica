# Stage 1: Build do React/Vite
FROM node:20-slim AS builder

WORKDIR /app

# =============================================================================
# BUILD ARGUMENTS - Environment variables for Vite build
# These are passed via --build-arg in cloudbuild.yaml
# Vite replaces import.meta.env.VITE_* at compile time, so they MUST be set here
# =============================================================================

# Required: Supabase configuration
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

# Required: Frontend URL for OAuth redirects
ARG VITE_FRONTEND_URL

# Optional: AI features
ARG VITE_GEMINI_API_KEY

# Optional: Google OAuth (if using direct OAuth instead of Supabase Auth)
ARG VITE_GOOGLE_OAUTH_CLIENT_ID
# SECURITY: Client secret removed (2026-01-03) - now in Supabase Edge Function

# Optional: External services
ARG VITE_PDF_EXTRACTOR_URL
ARG VITE_N8N_WEBHOOK_URL
ARG VITE_N8N_URL
ARG VITE_EVOLUTION_URL
ARG VITE_EVOLUTION_INSTANCE_NAME
ARG VITE_API_URL
ARG VITE_SENTRY_DSN

# =============================================================================
# Convert ARG to ENV - Makes variables available during npm run build
# =============================================================================

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_FRONTEND_URL=$VITE_FRONTEND_URL
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV VITE_GOOGLE_OAUTH_CLIENT_ID=$VITE_GOOGLE_OAUTH_CLIENT_ID
# SECURITY: VITE_GOOGLE_OAUTH_CLIENT_SECRET removed - token refresh via Edge Function
ENV VITE_PDF_EXTRACTOR_URL=$VITE_PDF_EXTRACTOR_URL
ENV VITE_N8N_WEBHOOK_URL=$VITE_N8N_WEBHOOK_URL
ENV VITE_N8N_URL=$VITE_N8N_URL
ENV VITE_EVOLUTION_URL=$VITE_EVOLUTION_URL
ENV VITE_EVOLUTION_INSTANCE_NAME=$VITE_EVOLUTION_INSTANCE_NAME
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Copiar apenas package.json (ignorando lockfile do Windows para evitar erros de plataforma)
COPY package.json ./

# Instalar dependencias (incluindo devDependencies para o build)
RUN npm install

# Copiar codigo fonte
COPY . .

# Debug: Print environment variables during build (sanitized output)
RUN echo "=== Build Environment ===" && \
    echo "VITE_SUPABASE_URL: SET" && \
    echo "VITE_SUPABASE_ANON_KEY: SET" && \
    echo "VITE_GEMINI_API_KEY: SET" && \
    echo "VITE_FRONTEND_URL: ${VITE_FRONTEND_URL}" && \
    echo "VITE_SENTRY_DSN: ${VITE_SENTRY_DSN:+SET}" && \
    echo "========================="

# Validate that critical environment variables are actually set
RUN echo "=== Validating Build Arguments ===" && \
    test -n "${VITE_SUPABASE_URL}" && echo "✓ VITE_SUPABASE_URL: SET" || (echo "✗ VITE_SUPABASE_URL: MISSING" && exit 1) && \
    test -n "${VITE_SUPABASE_ANON_KEY}" && echo "✓ VITE_SUPABASE_ANON_KEY: SET" || (echo "✗ VITE_SUPABASE_ANON_KEY: MISSING" && exit 1) && \
    test -n "${VITE_GEMINI_API_KEY}" && echo "✓ VITE_GEMINI_API_KEY: SET" || (echo "✗ VITE_GEMINI_API_KEY: MISSING" && exit 1) && \
    echo "✓ VITE_GOOGLE_OAUTH_CLIENT_SECRET: Removed (now in Edge Function)" && \
    echo "==================================="

# Build da aplicacao para producao
RUN npm run build

# Stage 2: Servidor Nginx para servir arquivos estáticos
FROM nginx:alpine

# Copiar arquivos built da etapa anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Expor porta 8080 (Cloud Run)
EXPOSE 8080

# Nginx irá automaticamente processar templates em /etc/nginx/templates/
# e substituir variáveis de ambiente
ENV PORT=8080

# Usar o entrypoint padrão do nginx:alpine que processa templates
CMD ["nginx", "-g", "daemon off;"]
