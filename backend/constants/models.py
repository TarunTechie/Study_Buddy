from langchain_ollama.chat_models import ChatOllama
from langchain_ollama.embeddings import OllamaEmbeddings
import os
os.environ["HF_HUB_OFFLINE"] = "1"
from sentence_transformers import CrossEncoder

chatModel=ChatOllama(model='gemma4', top_k=20, temperature=0.7, top_p=0.5)

emdbModel=OllamaEmbeddings(model='embeddinggemma', num_ctx=2000)

reranker=CrossEncoder("BAAI/bge-reranker-base",device='cuda')