# Stage 1: Build do React/Vite
FROM node:20-slim AS builder

WORKDIR /app

# Copiar apenas package.json (ignorando lockfile do Windows para evitar erros de plataforma)
COPY package.json ./

# Instalar dependências (incluindo devDependencies para o build)
RUN npm install

# Copiar código fonte
COPY . .

# Build da aplicação para produção
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
ENV VITE_PLANE_BASE_URL=https://project-management-plane.w9jo16.easypanel.host

# Usar o entrypoint padrão do nginx:alpine que processa templates
CMD ["nginx", "-g", "daemon off;"]
