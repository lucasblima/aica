# Dockerfile para servidor Python LLM - Aica Life OS
# Deploy via Easypanel

FROM python:3.11-slim

# Variáveis de ambiente
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Diretório de trabalho
WORKDIR /app

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primeiro (melhor cache)
COPY requirements.txt .

# Instalar dependências Python
RUN pip install --no-cache-dir -r requirements.txt

# Baixar modelo spaCy para português
RUN python -m spacy download pt_core_news_lg

# Copiar código da aplicação
COPY . .

# Criar usuário não-root
RUN useradd -m -u 1000 aica && chown -R aica:aica /app
USER aica

# Expor porta
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health')"

# Comando de inicialização
CMD ["uvicorn", "aica_llm_server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
