from langchain_core.tools import tool
import asyncio
from utils.dbOps import getData

@tool
async def search_with_model(query:str,subject:str) ->str:
    """Queries the internal RAG (Retrieval-Augmented Generation) vector database 
    to retrieve relevant textbook notes, syllabus info, and study materials.
    
    Use this tool whenever a student asks a specific factual question about a subject 
    and you need exact contextual details from your stored notes to answer them accurately.

    Args:
        query: The semantic search string or question. This should be a concise 
               phrase summarizing what specific information you are looking for 
               (e.g., 'stack array implementation' or 'Act 3 Scene 1 stage directions').
        subject: The exact database collection name matching the course subject. 
                 This parameter determines which folder/notes to search within 
                 (e.g., 'dsa', 'story', 'physics').

    Returns:
        A combined string containing the exact text blocks and page contents 
        retrieved from the vector database.
    """
    dbans=await getData(query,subject)
    return dbans