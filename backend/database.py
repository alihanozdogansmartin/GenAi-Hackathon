from sqlalchemy import create_engine, Column, Integer, String, DateTime, Float, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import chromadb
from chromadb.utils import embedding_functions

# SQLite Database
SQLALCHEMY_DATABASE_URL = "sqlite:///./callcenter.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    customer_message = Column(Text)
    agent_message = Column(Text)
    timestamp = Column(DateTime, default=datetime.now)
    sentiment_score = Column(Float, nullable=True)
    resolution_score = Column(Float, nullable=True)
    agent_performance = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)
    is_resolved = Column(Boolean, default=False)
    customer_emotion = Column(String, nullable=True)
    response_time = Column(String, nullable=True)
    empathy_level = Column(String, nullable=True)
    category = Column(String, nullable=True)  # Problem kategorisi
    keywords = Column(Text, nullable=True)  # Anahtar kelimeler (JSON)

class DailyReport(Base):
    __tablename__ = "daily_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, index=True)
    total_conversations = Column(Integer)
    resolved_conversations = Column(Integer)
    avg_sentiment = Column(Float)
    avg_satisfaction = Column(Float)
    avg_performance = Column(Float)
    top_emotion = Column(String, nullable=True)
    top_category = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now)

# Create tables
Base.metadata.create_all(bind=engine)

# ChromaDB for Vector Search (Ortak sorunları bulmak için)
chroma_client = chromadb.PersistentClient(path="./chroma_db")
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# Collection for customer issues
try:
    issues_collection = chroma_client.get_collection(
        name="customer_issues",
        embedding_function=sentence_transformer_ef
    )
except:
    issues_collection = chroma_client.create_collection(
        name="customer_issues",
        embedding_function=sentence_transformer_ef,
        metadata={"description": "Customer complaints and issues"}
    )

def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def add_issue_to_vector_db(issue_id: str, issue_text: str, metadata: dict):
    """Vector DB'ye sorun ekle"""
    try:
        issues_collection.add(
            documents=[issue_text],
            metadatas=[metadata],
            ids=[issue_id]
        )
    except Exception as e:
        print(f"Vector DB Error: {e}")

def find_similar_issues(issue_text: str, n_results: int = 5):
    """Benzer sorunları bul"""
    try:
        results = issues_collection.query(
            query_texts=[issue_text],
            n_results=n_results
        )
        return results
    except Exception as e:
        print(f"Vector Search Error: {e}")
        return None
