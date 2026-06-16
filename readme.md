# 📚 RAG Powered - AI Study Assistant  
**Study Buddy** is an AI-powered Study Assistant built using **Retrieval-Augmented Generation (RAG)**.  
The backend uses **LangChain with Python**, **ChromaDB** for vector storage, and supports **Ollama** for running language models locally or cloud-based LLMs when needed.  
The frontend is built with **Next.js**, providing a smooth and intuitive study experience.

---

## 🚀 Project Overview

This project allows users to interact intelligently with their own study materials.  
Instead of generating generic answers, the assistant retrieves relevant information from documents and generates responses grounded in that content.

The result is a system that is more accurate, contextual, and useful for learning.

---

## 🧠 How RAG Works

Retrieval-Augmented Generation combines search and generation:

1. Study materials are split into manageable chunks  
2. Chunks are converted into embeddings  
3. Embeddings are stored in **ChromaDB**  
4. A user query retrieves the most relevant chunks  
5. A language model generates a response using the retrieved context  

This approach significantly improves answer quality and reduces hallucinations.

---

## 🏗️ Tech Stack

### Backend
- **Python**
- **LangChain**
- **ChromaDB** (Vector Database)
- **Ollama** (Local LLM runtime)
- Support for cloud-based LLMs
- Embedding models for semantic search

### Frontend
- **Next.js**
- React
- API-based communication with backend
- Clean, study-focused UI

---

## ✨ Features

- 📄 Upload and process study documents (PDFs, notes, text files)
- 🔍 Semantic search using vector embeddings
- 🤖 Context-aware responses powered by RAG
- ⚡ Fast similarity search with ChromaDB
- 🔐 Supports local inference with Ollama for privacy-sensitive use cases, with flexibility to switch to cloud models
- 🌐 Modern and responsive frontend

---