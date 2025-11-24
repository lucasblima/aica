# Stage 1: Build do React/Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências (incluindo devDependencies para o build)
# Instalar dependências (forçando devDependencies mesmo se NODE_ENV=production)
RUN npm ci --include=dev

# Copiar código fonte
COPY . .

# Build da aplicação para produção
RUN npm run build

# Stage 2: Servidor Nginx para servir arquivos estáticos
FROM nginx:alpine

# Copiar arquivos built da etapa anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuração customizada do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta (Cloud Run usa $PORT, mas nginx usa 80 por padrão)
EXPOSE 8080

# Cloud Run espera que o servidor ouça na porta $PORT
# Criar script para substituir a porta
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'export PORT=${PORT:-8080}' >> /docker-entrypoint.sh && \
    echo 'envsubst '\''$PORT'\'' < /etc/nginx/conf.d/default.conf > /etc/nginx/conf.d/default.conf.tmp' >> /docker-entrypoint.sh && \
    echo 'mv /etc/nginx/conf.d/default.conf.tmp /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo 'nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

CMD ["/docker-entrypoint.sh"]
