from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from constants.constants import root_path
import os

async def load_pdfData(subject):
    print("Loading PDF Data")
    path=os.path.join(root_path,subject)
    files=[]
    try :
        folder=os.scandir(path)
        for file in folder:
            files.append(file.path)
    except:
        return {"Wrong file path"}
        
    try:
        pdfs=[]
        for file in files:
            loader=PyPDFLoader(file)
            content=loader.load()
            pdfs.extend(content)
        return pdfs
    except:
        return {"Files not found"}
    

async def chunking_data(documents):
    print("Chunking data")
    try:
        splitter=RecursiveCharacterTextSplitter(chunk_size=1000,chunk_overlap=200)
        chunk=splitter.split_documents(documents)
        return chunk
    except:
        return {"Data not found"}

