"""Notebook management endpoints."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth import verify_token
from services.nlm_client import get_nlm_client

router = APIRouter()


class NotebookResponse(BaseModel):
    success: bool
    data: dict


@router.get("/notebooks")
async def list_notebooks(
    user_id: str = Depends(verify_token),
) -> NotebookResponse:
    """List user's NotebookLM notebooks."""
    async with await get_nlm_client(user_id) as client:
        notebooks = await client.notebooks.list()
        return NotebookResponse(
            success=True,
            data={"notebooks": [{"id": nb.id, "title": nb.title} for nb in notebooks]},
        )


@router.delete("/notebooks/{notebook_id}")
async def delete_notebook(
    notebook_id: str,
    user_id: str = Depends(verify_token),
) -> NotebookResponse:
    """Delete a NotebookLM notebook."""
    async with await get_nlm_client(user_id) as client:
        await client.notebooks.delete(notebook_id)
        return NotebookResponse(success=True, data={"deleted": notebook_id})
