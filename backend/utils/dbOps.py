from langchain_chroma import Chroma
from fastapi import APIRouter , Request 
from fastapi.responses import StreamingResponse
import asyncio

from constants.models import emdbModel , reranker
from utils.load_split import load_files , chunking_data


router=APIRouter()

async def addData(document,collectionName):
    print(f"Adding data to {collectionName}")
    vectorDb=Chroma(
        embedding_function=emdbModel,
        persist_directory='./testing/chroma_db',
        collection_name=collectionName
    )
    try:
        vectorDb.add_documents(documents=document)
    except Exception as e:
        return e
    

def getData(query,collectionName):
    print(f"Getting data from {collectionName}")
    vectorDb=Chroma(embedding_function=emdbModel,
                    persist_directory='./testing/chroma_db',
                    collection_name=collectionName)
    try:
        docs=vectorDb.similarity_search(query,k=10)
        content=[doc.page_content for doc in docs]
        results=rankChucks(query,content)
        return ([res[0] for res in results])
    except Exception as e:
        return e

def rankChucks(query,chunks):
   print("Ranking the Chunks") 
   scores=[]
   scores = reranker.predict([(query, c) for c in chunks])
   ranked_chunks = sorted(zip(chunks, scores), key=lambda x: x[1], reverse=True)
   return ranked_chunks

@router.get('/embed')
async def embed(subject:str,request:Request):
    async def embedder():
        tasks=[{"function":load_files,"msg":"Loading Files..."},{"function":chunking_data,"msg":"Chunking data..."},{"function":addData,"msg":"Learning from your data..."}]
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
