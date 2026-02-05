"""
Google Search Tools for ADK Agents

Custom tool functions that use Gemini's Google Search grounding
internally, avoiding the incompatibility between google_search
built-in tool and function calling in multi-agent systems.
"""

import os
from google import genai
from google.genai import types

_client = None


def _get_genai_client():
    global _client
    if _client is None:
        api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        _client = genai.Client(api_key=api_key)
    return _client


def search_editals(query: str) -> dict:
    """Search for open research funding editals from Brazilian agencies
    (FAPERJ, FINEP, CNPq, CAPES, FAPESP) using real-time web search.
    Returns text response with sources."""
    client = _get_genai_client()

    full_query = f"""Busque editais de fomento abertos para pesquisa sobre: {query}.
Priorize agencias brasileiras: FAPERJ, FINEP, CNPq, CAPES, FAPESP.
Inclua: nome do edital, agencia, prazo, valor, areas contempladas.
Se nao encontrar abertos, mencione editais recentes."""

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=full_query,
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
            temperature=0.7,
        ),
    )

    # Extract sources from grounding metadata
    sources = []
    if response.candidates and response.candidates[0].grounding_metadata:
        chunks = response.candidates[0].grounding_metadata.grounding_chunks or []
        for chunk in chunks:
            if chunk.web:
                sources.append({"title": chunk.web.title or "", "url": chunk.web.uri or ""})

    return {
        "status": "success",
        "text": response.text,
        "sources": sources,
        "source_count": len(sources),
    }


def search_guest_info(guest_name: str) -> dict:
    """Search for public information about a podcast guest using
    real-time web search. Returns bio, career, key topics, and sources."""
    client = _get_genai_client()

    full_query = f"""Pesquise informacoes publicas sobre: {guest_name}.
Organize assim:
1. Bio resumida (2-3 frases)
2. Trajetoria profissional
3. Temas-chave e expertise
4. Trabalhos recentes (ultimos 2 anos)
5. Polemicas ou controversias (se houver)
6. Links uteis (LinkedIn, Lattes, redes sociais)
Priorize fontes verificaveis."""

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=full_query,
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
            temperature=0.7,
        ),
    )

    sources = []
    if response.candidates and response.candidates[0].grounding_metadata:
        chunks = response.candidates[0].grounding_metadata.grounding_chunks or []
        for chunk in chunks:
            if chunk.web:
                sources.append({"title": chunk.web.title or "", "url": chunk.web.uri or ""})

    return {
        "status": "success",
        "text": response.text,
        "sources": sources,
        "source_count": len(sources),
    }


def web_search(query: str) -> dict:
    """General web search using Google Search grounding.
    Use for any real-time information needs."""
    client = _get_genai_client()

    response = client.models.generate_content(
        model="gemini-2.0-flash",
        contents=query,
        config=types.GenerateContentConfig(
            tools=[types.Tool(google_search=types.GoogleSearch())],
            temperature=0.7,
        ),
    )

    sources = []
    if response.candidates and response.candidates[0].grounding_metadata:
        chunks = response.candidates[0].grounding_metadata.grounding_chunks or []
        for chunk in chunks:
            if chunk.web:
                sources.append({"title": chunk.web.title or "", "url": chunk.web.uri or ""})

    return {
        "status": "success",
        "text": response.text,
        "sources": sources,
        "source_count": len(sources),
    }
