from langchain_chroma import Chroma
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
import asyncio
import re

from constants.models import get_embedding_model
from utils.load_split import load_data, chunking_data

router = APIRouter()

def sanitize_name(name: str) -> str:
    s = re.sub(r'[^a-zA-Z0-9._-]', '_', name)
    s = re.sub(r'^[^a-zA-Z0-9]+', '', s)
    s = re.sub(r'[^a-zA-Z0-9]+$', '', s)
    if len(s) < 3:
        s = (s + "abc")[:3]
    return s[:512]

async def addData(document, collectionName):
    collectionName = sanitize_name(collectionName)
    print(f"Adding data to {collectionName}")
    vectorDb = Chroma(
        embedding_function=get_embedding_model(),
        persist_directory='./testing/chroma_db',
        collection_name=collectionName
    )
    vectorDb.add_documents(documents=document)

async def getData(query, collectionName):
    collectionName = sanitize_name(collectionName)
    print(f"Getting data from {collectionName}")
    vectorDb = Chroma(
        embedding_function=get_embedding_model(),
        persist_directory='./testing/chroma_db',
        collection_name=collectionName
    )
    results = vectorDb.similarity_search(query, k=5)
    return results

def deleteCollection(collectionName: str):
    collectionName = sanitize_name(collectionName)
    print(f"Deleting collection {collectionName}")
    try:
        vectorDb = Chroma(
            embedding_function=get_embedding_model(),
            persist_directory='./testing/chroma_db',
            collection_name=collectionName
        )
        vectorDb.delete_collection()
    except Exception as e:
        print(f"Failed to delete collection {collectionName}: {e}")

@router.get('/embed')
async def embed(subject: str, request: Request):
    async def embedder():
        tasks = [
            {"function": load_data,     "msg": "Loading documents..."},
            {"function": chunking_data, "msg": "Chunking data..."},
            {"function": addData,       "msg": "Learning from your data..."}
        ]
        results = subject
        for task in tasks:
            if await request.is_disconnected():
                return

            if task['function'] == addData:
                process = asyncio.create_task(task['function'](results, subject))
            else:
                process = asyncio.create_task(task['function'](results))

            yield f"data: {task['msg']}\n\n"
            while not process.done():
                if await request.is_disconnected():
                    return
                yield f"data: {task['msg']}\n\n"
                await asyncio.sleep(0.5)

            if process.done():
                results = process.result()
            else:
                return

        yield "data: Completed the Process\n\n"

    return StreamingResponse(embedder(), media_type='text/event-stream')