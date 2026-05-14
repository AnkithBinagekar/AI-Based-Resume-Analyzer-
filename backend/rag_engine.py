import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_core.documents import Document

# 1. Initialize the local embedding model
# We use all-MiniLM-L6-v2 because it is free, runs locally, and is blazing fast.
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
VECTOR_DB_PATH = "./chroma_db"

def ingest_resume_to_vector_db(resume_text: str, candidate_id: str):
    """
    Safely chunks the raw resume text and adds it to the local ChromaDB vector store.
    Runs as a background task.
    """
    try:
        if not resume_text or not resume_text.strip():
            print(f"[RAG] Skipping ingestion for {candidate_id}: Empty text.")
            return

        # 2. Split the text into manageable semantic chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            separators=["\n\n", "\n", "•", " ", ""]
        )
        chunks = text_splitter.split_text(resume_text)

        # 3. Convert string chunks into LangChain Document objects with Metadata
        # The metadata is CRITICAL so we can filter vectors by candidate later.
        documents = [
            Document(
                page_content=chunk, 
                metadata={"candidate_id": candidate_id}
            ) for chunk in chunks
        ]

        # 4. Store in ChromaDB
        vectorstore = Chroma.from_documents(
            documents=documents,
            embedding=embeddings,
            persist_directory=VECTOR_DB_PATH
        )
        print(f"✅ [RAG Engine] Successfully ingested {len(chunks)} chunks for {candidate_id}")
        
    except Exception as e:
        print(f"❌ [RAG Engine] Ingestion Error for {candidate_id}: {e}")

def retrieve_relevant_chunks(candidate_id: str, question: str, k: int = 4):
    """
    Retrieves the top 'k' most relevant chunks for a specific candidate based on the question.
    """
    try:
        # 1. Connect to the existing local DB
        vectorstore = Chroma(
            persist_directory=VECTOR_DB_PATH, 
            embedding_function=embeddings
        )
        
        # 2. Setup the Retriever with Metadata Filtering
        # This ensures we only search THIS specific candidate's resume.
        retriever = vectorstore.as_retriever(
            search_kwargs={
                "k": k, 
                "filter": {"candidate_id": candidate_id}
            }
        )
        
        # 3. Fetch the semantic matches
        docs = retriever.invoke(question)
        
        print(f"🔍 [RAG Engine] Retrieved {len(docs)} chunks for question: '{question}'")
        return [doc.page_content for doc in docs]
        
    except Exception as e:
        print(f"❌ [RAG Engine] Retrieval Error: {e}")
        return []