from langchain_chroma import Chroma
from fastapi import APIRouter , Request 
from fastapi.responses import StreamingResponse
import asyncio

from constants.models import emdbModel
from utils.load_split import load_pdfData , chunking_data


router=APIRouter()

async def addData(document,collectionName):
    print(f"Adding data to {collectionName}")
    vectorDb=Chroma(
        embedding_function=emdbModel,
        persist_directory='./testing/chroma_db',
        collection_name=collectionName
    )
    vectorDb.add_documents(documents=document)
    

async def getData(query,collectionName):
    print(f"Getting data from {collectionName}")
    vectorDb=Chroma(embedding_function=emdbModel,
                    persist_directory='./testing/chroma_db',
                    collection_name=collectionName)
    results=vectorDb.similarity_search(query,k=5)
    return results

@router.get('/embed')
async def embed(subject:str,request:Request):
    async def embedder():
        tasks=[{"function":load_pdfData,"msg":"Loading PDF..."},{"function":chunking_data,"msg":"Chunking data..."},{"function":addData,"msg":"Learning from your data..."}]
        results=subject
        for task in tasks:
            
            if await request.is_disconnected():
                return
            
            if task['function']==addData:
                process=asyncio.create_task(task['function'](results,subject))
            else:
                process=asyncio.create_task(task['function'](results))
                
            yield f'data: {task['msg']}\n\n'
            while not process.done():
                if await request.is_disconnected():
                    return
                yield f'data: {task['msg']}\n\n'
                await asyncio.sleep(0.5)
            if process.done():
                results=process.result()
            else:
                return
        yield f'data: Completed the Process\n\n'
    
    return StreamingResponse(embedder(),media_type='text/event-stream')
