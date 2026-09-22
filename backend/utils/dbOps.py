import asyncio

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from constants.models import get_embedding_model
from constants.supabaseClient import sb_client
from utils.load_split import load_data, chunking_data

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _embed(text: str) -> list[float]:
    """Return the embedding vector for a piece of text."""
    return get_embedding_model().embed_query(text)


# ---------------------------------------------------------------------------
# Core DB operations (use Supabase + pgvector)
# ---------------------------------------------------------------------------

async def addData(documents, subject: str, session_id: str = None):
    """
    Embed every chunk and upsert it into the `documents` table.

    Expected table schema (run once in Supabase SQL editor):
    ──────────────────────────────────────────────────────────
    create extension if not exists vector;

    create table if not exists documents (
        id        bigserial primary key,
        subject   text      not null,
        content   text      not null,
        embedding vector(768),           -- text-embedding-004 outputs 768 dims
        session_id text
    );

    create index if not exists documents_subject_idx on documents (subject);
    create index if not exists documents_session_idx on documents (session_id);
    ──────────────────────────────────────────────────────────
    """
    print(f"Adding {len(documents)} chunks for subject '{subject}'")

    rows = []
    for doc in documents:
        embedding = await asyncio.to_thread(_embed, doc.page_content)
        row = {
            "subject":   subject,
            "content":   doc.page_content,
            "embedding": embedding,
        }
        if session_id:
            row["session_id"] = session_id
        rows.append(row)

    # Batch insert
    sb_client.table("documents").insert(rows).execute()
    print(f"Inserted {len(rows)} rows into 'documents'")


async def getData(query: str, subject: str) -> list[dict]:
    """
    Similarity-search against pgvector using an RPC function.

    Run this SQL once in Supabase SQL editor:
    ──────────────────────────────────────────────────────────
    create or replace function match_documents(
        query_embedding vector(768),
        match_subject   text,
        match_count     int default 5
    )
    returns table (
        id        bigint,
        subject   text,
        content   text,
        similarity float
    )
    language sql stable
    as $$
        select
            id,
            subject,
            content,
            1 - (embedding <=> query_embedding) as similarity
        from documents
        where subject = match_subject
        order by embedding <=> query_embedding
        limit match_count;
    $$;
    ──────────────────────────────────────────────────────────
    """
    print(f"Querying '{subject}' for: {query}")
    query_embedding = await asyncio.to_thread(_embed, query)

    response = sb_client.rpc(
        "match_documents",
        {
            "query_embedding": query_embedding,
            "match_subject":   subject,
            "match_count":     5,
        },
    ).execute()

    return response.data or []


def deleteCollection(subject: str):
    """Delete all document rows that belong to `subject`."""
    print(f"Deleting all documents for subject '{subject}'")
    try:
        sb_client.table("documents").delete().eq("subject", subject).execute()
    except Exception as e:
        print(f"Failed to delete documents for '{subject}': {e}")


# ---------------------------------------------------------------------------
# Route: embed a subject's files end-to-end (SSE streaming)
# ---------------------------------------------------------------------------

@router.get('/embed')
async def embed(subject: str, request: Request):
    async def embedder():
        tasks = [
            {"function": load_data,     "msg": "Loading documents..."},
            {"function": chunking_data, "msg": "Chunking data..."},
            {"function": addData,       "msg": "Learning from your data..."},
        ]
        results = subject
        for task in tasks:
            if await request.is_disconnected():
                return

            if task["function"] == addData:
                process = asyncio.create_task(task["function"](results, subject))
            else:
                process = asyncio.create_task(task["function"](results))

            yield f"data: {task['msg']}\n\n"
            while not process.done():
                if await request.is_disconnected():
                    return
                yield f"data: {task['msg']}\n\n"
                await asyncio.sleep(0.5)

            if process.exception():
                yield f"data: Error — {process.exception()}\n\n"
                return

            results = process.result()

        yield "data: Completed the Process\n\n"

    return StreamingResponse(embedder(), media_type="text/event-stream")