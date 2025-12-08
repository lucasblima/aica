from fastapi import FastAPI, UploadFile, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pymupdf4llm
import fitz  # PyMuPDF
import tempfile
import os
import hashlib
from datetime import datetime
import httpx
import json

app = FastAPI(title="PDF Extractor Service", version="1.0.0")

# Configuração
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Service role key para bypass RLS quando necessário

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Models
class ExtractionResult(BaseModel):
    id: Optional[str] = None
    markdown: str
    filename: str
    pages: int
    tables_count: int
    file_hash: str
    tables: list
    extracted_at: str
    saved_to_db: bool = False


class StatementCreate(BaseModel):
    user_id: str
    file_name: str
    file_size_bytes: int
    file_hash: str
    markdown_content: str
    raw_text: Optional[str] = None
    tables_json: list
    pages_count: int
    tables_count: int
    pdf_metadata: dict
    processing_status: str = "completed"


# Helpers
def get_supabase_headers(user_token: Optional[str] = None):
    """Headers para chamadas ao Supabase"""
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    if user_token:
        headers["Authorization"] = f"Bearer {user_token}"
    else:
        headers["Authorization"] = f"Bearer {SUPABASE_SERVICE_KEY}"
    return headers


async def check_duplicate(file_hash: str, user_id: str) -> Optional[dict]:
    """Verifica se já existe um extrato com mesmo hash para o usuário"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/finance_statements",
            headers=get_supabase_headers(),
            params={
                "select": "id,file_name,created_at",
                "file_hash": f"eq.{file_hash}",
                "user_id": f"eq.{user_id}"
            }
        )
        if response.status_code == 200:
            data = response.json()
            return data[0] if data else None
    return None


async def save_to_supabase(statement: StatementCreate) -> Optional[str]:
    """Salva o extrato processado no Supabase"""
    async with httpx.AsyncClient() as client:
        payload = {
            "user_id": statement.user_id,
            "file_name": statement.file_name,
            "file_size_bytes": statement.file_size_bytes,
            "file_hash": statement.file_hash,
            "markdown_content": statement.markdown_content,
            "raw_text": statement.raw_text,
            "tables_json": json.dumps(statement.tables_json),
            "pages_count": statement.pages_count,
            "tables_count": statement.tables_count,
            "pdf_metadata": json.dumps(statement.pdf_metadata),
            "processing_status": statement.processing_status,
            "processed_at": datetime.utcnow().isoformat()
        }
        
        response = await client.post(
            f"{SUPABASE_URL}/rest/v1/finance_statements",
            headers=get_supabase_headers(),
            json=payload
        )
        
        if response.status_code == 201:
            data = response.json()
            return data[0]["id"] if data else None
        else:
            print(f"Erro ao salvar no Supabase: {response.status_code} - {response.text}")
            return None


# Endpoints
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "pdf-extractor",
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)
    }


@app.post("/extract", response_model=ExtractionResult)
async def extract_pdf(
    file: UploadFile,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    save_to_db: bool = True
):
    """
    Extrai PDF para Markdown e opcionalmente salva no Supabase.
    
    Headers:
    - X-User-Id: ID do usuário (obrigatório se save_to_db=True)
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(400, "Apenas arquivos PDF são aceitos")
    
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()
    file_size = len(content)
    
    # Verificar duplicata se temos user_id
    if x_user_id and save_to_db:
        existing = await check_duplicate(file_hash, x_user_id)
        if existing:
            raise HTTPException(
                409, 
                detail={
                    "message": "Este arquivo já foi processado anteriormente",
                    "existing_id": existing["id"],
                    "existing_file": existing["file_name"],
                    "created_at": existing["created_at"]
                }
            )
    
    # Salvar temporariamente
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    
    try:
        # Extrair markdown completo
        markdown = pymupdf4llm.to_markdown(tmp_path)
        
        # Extrair informações detalhadas
        doc = fitz.open(tmp_path)
        pages = len(doc)
        metadata = dict(doc.metadata) if doc.metadata else {}
        
        # Extrair tabelas individualmente
        tables_data = []
        for page_num, page in enumerate(doc):
            for idx, table in enumerate(page.find_tables().tables):
                tables_data.append({
                    "page": page_num + 1,
                    "index": idx + 1,
                    "markdown": table.to_markdown(),
                    "data": table.extract()
                })
        
        tables_count = len(tables_data)
        
        # Extrair texto puro para busca
        raw_text = ""
        for page in doc:
            raw_text += page.get_text("text") + "\n"
        
        doc.close()
        
        # Salvar no Supabase se solicitado
        record_id = None
        saved = False
        
        if save_to_db and x_user_id and SUPABASE_URL:
            statement = StatementCreate(
                user_id=x_user_id,
                file_name=file.filename,
                file_size_bytes=file_size,
                file_hash=file_hash,
                markdown_content=markdown,
                raw_text=raw_text,
                tables_json=tables_data,
                pages_count=pages,
                tables_count=tables_count,
                pdf_metadata=metadata
            )
            record_id = await save_to_supabase(statement)
            saved = record_id is not None
        
        return ExtractionResult(
            id=record_id,
            markdown=markdown,
            filename=file.filename,
            pages=pages,
            tables_count=tables_count,
            file_hash=file_hash,
            tables=tables_data,
            extracted_at=datetime.utcnow().isoformat(),
            saved_to_db=saved
        )
        
    finally:
        os.unlink(tmp_path)


@app.get("/statements/{statement_id}")
async def get_statement(
    statement_id: str,
    x_user_id: str = Header(..., alias="X-User-Id")
):
    """Busca um extrato pelo ID"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/finance_statements",
            headers=get_supabase_headers(),
            params={
                "select": "*",
                "id": f"eq.{statement_id}",
                "user_id": f"eq.{x_user_id}"
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            if data:
                return data[0]
            raise HTTPException(404, "Extrato não encontrado")
        
        raise HTTPException(response.status_code, "Erro ao buscar extrato")


@app.get("/statements")
async def list_statements(
    x_user_id: str = Header(..., alias="X-User-Id"),
    limit: int = 20,
    offset: int = 0
):
    """Lista extratos do usuário"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{SUPABASE_URL}/rest/v1/finance_statements",
            headers={
                **get_supabase_headers(),
                "Range": f"{offset}-{offset + limit - 1}"
            },
            params={
                "select": "id,file_name,file_hash,pages_count,tables_count,processing_status,created_at",
                "user_id": f"eq.{x_user_id}",
                "order": "created_at.desc"
            }
        )
        
        if response.status_code in [200, 206]:
            return {
                "data": response.json(),
                "total": response.headers.get("content-range", "").split("/")[-1] or None
            }
        
        raise HTTPException(response.status_code, "Erro ao listar extratos")


@app.delete("/statements/{statement_id}")
async def delete_statement(
    statement_id: str,
    x_user_id: str = Header(..., alias="X-User-Id")
):
    """Remove um extrato"""
    async with httpx.AsyncClient() as client:
        response = await client.delete(
            f"{SUPABASE_URL}/rest/v1/finance_statements",
            headers=get_supabase_headers(),
            params={
                "id": f"eq.{statement_id}",
                "user_id": f"eq.{x_user_id}"
            }
        )
        
        if response.status_code == 204:
            return {"message": "Extrato removido com sucesso"}
        
        raise HTTPException(response.status_code, "Erro ao remover extrato")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
