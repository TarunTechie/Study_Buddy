import os
from functools import lru_cache

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

@lru_cache(maxsize=1)
def get_chat_model():
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=GOOGLE_API_KEY,
        temperature=0.7,
        top_k=20,
        top_p=0.5
    )

@lru_cache(maxsize=1)
def get_embedding_model():
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    return GoogleGenerativeAIEmbeddings(
        model="models/text-embedding-004",
        google_api_key=GOOGLE_API_KEY
    )

