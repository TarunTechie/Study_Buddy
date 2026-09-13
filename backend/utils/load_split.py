from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from constants.constants import root_path
import os

async def load_data(subject):
    print("Loading Data")
    path = os.path.join(root_path, subject)
    files = []
    try:
        folder = os.scandir(path)
        for file in folder:
            if file.is_file():
                files.append(file.path)
    except:
        return {"Wrong file path"}
        
    try:
        documents = []
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext == '.pdf':
                loader = PyPDFLoader(file)
            elif ext in ['.doc', '.docx']:
                loader = Docx2txtLoader(file)
            elif ext == '.txt':
                loader = TextLoader(file, encoding='utf-8')
            else:
                continue
            
            content = loader.load()
            documents.extend(content)
        return documents
    except Exception as e:
        print(f"Error loading files: {e}")
        return {"Files not found"}

async def chunking_data(documents):
    print("Chunking data")
    try:
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        chunk = splitter.split_documents(documents)
        return chunk
    except:
        return {"Data not found"}
