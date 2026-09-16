from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_ollama.chat_models import ChatOllama
from langchain_ollama.embeddings import OllamaEmbeddings

GOOGLE_API_KEY = "your-google-api-key"

chatModel = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    google_api_key=GOOGLE_API_KEY,
    temperature=0.7,
    top_k=20,
    top_p=0.5
)

embdModel = GoogleGenerativeAIEmbeddings(
    model="models/text-embedding-004",
    google_api_key=GOOGLE_API_KEY
)

localChatModel=ChatOllama(model='gemma4', top_k=20, temperature=0.7, top_p=0.5)

localEmdbModel=OllamaEmbeddings(model='embeddinggemma', num_ctx=2000)