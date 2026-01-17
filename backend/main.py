from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import httpx
import json
import os
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from dotenv import load_dotenv
from openai import OpenAI
import warnings
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from database import (
    get_db, Conversation, DailyReport, 
    add_issue_to_vector_db, find_similar_issues
)

load_dotenv()

# Load credentials from .env file
api_key = os.getenv('GPT_OSS_API_KEY')
proxy_username = os.getenv('proxy_username')
proxy_password = os.getenv('proxy_password')
username = os.getenv("PRACTICUS_USERNAME", "")
pwd = os.getenv("PRACTICUS_PASSWORD", "")

# Verify API key is loaded
if not api_key:
    raise ValueError("GPT_OSS_API_KEY not found in .env file")
print(f"✅ API Key loaded: {api_key[:20]}...")

proxy = f"http://{proxy_username}:{proxy_password}@172.31.53.99:8080/"
os.environ['http_proxy'] = proxy
os.environ['HTTP_PROXY'] = proxy
os.environ['https_proxy'] = proxy
os.environ['HTTPS_PROXY'] = proxy
no_proxy=".vodafone.local,localhost,172.31.0.0/16,172.24.0.0/16"
os.environ['no_proxy'] = no_proxy
os.environ['NO_PROXY'] = no_proxy
import warnings
warnings.filterwarnings('ignore')

app = FastAPI(
    title="Call Center Analysis API - WebSocket Edition",
    description="Real-time customer satisfaction analysis",
    version="2.0.0"
)

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI API configuration for Practicus AI
base_url = "https://practicus.vodafone.local/models/model-gateway-ai-hackathon/latest/v1"

# Initialize OpenAI client with custom HTTP client for proxy support
try:
    # Don't use proxy for internal .vodafone.local domains
    # The base_url is internal, so we should connect directly
    print(f"🔧 Connecting directly to internal endpoint (bypassing proxy)")
    
    client = OpenAI(
        base_url=base_url,
        api_key=api_key,
        http_client=httpx.Client(
            verify=False,  # SSL sertifikası doğrulamasını devre dışı bırak
            timeout=60.0
        )
    )
    print("✅ OpenAI client initialized successfully")
except Exception as e:
    print(f"⚠️ OpenAI client initialization warning: {e}")
    client = OpenAI(base_url=base_url, api_key=api_key)

# WebSocket bağlantı yöneticisi
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.conversation_buffers: Dict[str, str] = defaultdict(str)
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        print(f"✅ Client {client_id} connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        if client_id in self.conversation_buffers:
            del self.conversation_buffers[client_id]
        print(f"❌ Client {client_id} disconnected. Total connections: {len(self.active_connections)}")
    
    async def send_personal_message(self, message: dict, client_id: str):
        if client_id in self.active_connections:
            await self.active_connections[client_id].send_json(message)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections.values():
            await connection.send_json(message)
    
    def append_to_buffer(self, client_id: str, text: str):
        self.conversation_buffers[client_id] += text + "\n"
    
    def get_buffer(self, client_id: str) -> str:
        return self.conversation_buffers[client_id]
    
    def clear_buffer(self, client_id: str):
        self.conversation_buffers[client_id] = ""

manager = ConnectionManager()

# Request/Response modelleri
class ConversationRequest(BaseModel):
    text: str
    conversation_id: Optional[str] = None
    metadata: Optional[Dict] = None

class Insight(BaseModel):
    type: str
    text: str

class Metrics(BaseModel):
    responseTime: str
    empathyLevel: str
    problemResolved: bool
    customerEmotion: str

class AnalysisResponse(BaseModel):
    overallScore: int
    sentiment: int
    resolution: int
    agentPerformance: int
    insights: List[Insight]
    metrics: Metrics
    timestamp: str
    conversation_id: Optional[str] = None

# Tibco Service Request Models
class TibcoServiceRequest(BaseModel):
    LoggedMSISDN: str
    BillingAccountCode: str = ""
    CustomerCode: Optional[str] = None
    MSISDN: str
    ServiceRequestID: str = ""
    TCKN: str = ""
    SRStructure: Dict

class TibcoServiceResponse(BaseModel):
    srNumber: Optional[str] = None
    success: bool
    message: str

# GPT-OSS-20B Prompt Template
ANALYSIS_PROMPT = """Aşağıdaki müşteri hizmetleri konuşmasını detaylı bir şekilde analiz et ve SADECE JSON formatında yanıt ver.

Konuşma:
{conversation_text}

Analiz kriterleri:
1. sentiment: Müşterinin genel duygu durumu (1-10 arası sayı)
2. resolution: Problemin çözüm kalitesi (1-10 arası sayı)
3. agentPerformance: Temsilcinin performansı (1-10 arası sayı)
4. insights: İçgörüler dizisi (array) - En az 2, en fazla 5 içgörü
5. metrics: Ek metrikler nesnesi

JSON formatı (başka hiçbir şey yazma):
{{
  "sentiment": sayı,
  "resolution": sayı,
  "agentPerformance": sayı,
  "insights": [{{"type": "success/warning/info", "text": "açıklama"}}],
  "metrics": {{
    "responseTime": "Hızlı/Orta/Yavaş",
    "empathyLevel": "Yüksek/Orta/Düşük",
    "problemResolved": boolean,
    "customerEmotion": "Pozitif/Nötr/Negatif"
  }}
}}"""

async def call_gpt_oss_20b(conversation_text: str) -> Dict:
    """GPT-OSS-20B modelini çağır ve analiz yap"""
    
    prompt = ANALYSIS_PROMPT.format(conversation_text=conversation_text)
    
    messages = [
        {
            "role": "system",
            "content": "Sen bir müşteri hizmetleri analiz uzmanısın. Sadece JSON yanıt ver."
        },
        {
            "role": "user",
            "content": prompt
        }
    ]
    
    try:
        response = client.chat.completions.create(
            model="practicus/gpt-oss-20b-hackathon",
            messages=messages,
            temperature=0.3,
            max_tokens=1500,
            top_p=0.9,
            frequency_penalty=0.5,
            presence_penalty=0.3,
            seed=-1,
            extra_body={
                "metadata": {
                    "username": username,
                    "pwd": pwd,
                }
            }
        )
        
        model_response = response.choices[0].message.content
        
        # JSON temizleme
        model_response = model_response.strip()
        if model_response.startswith("```json"):
            model_response = model_response[7:]
        if model_response.startswith("```"):
            model_response = model_response[3:]
        if model_response.endswith("```"):
            model_response = model_response[:-3]
        model_response = model_response.strip()
        
        analysis = json.loads(model_response)
            
            # Genel skoru hesapla
        overall_score = round(
            (analysis["sentiment"] + analysis["resolution"] + analysis["agentPerformance"]) / 3
        )
            
        analysis["overallScore"] = overall_score
            
        return analysis
            
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        print(f"GPT-OSS-20B Error: {e}")
        print(f"Error detail:\n{error_detail}")
        raise HTTPException(status_code=500, detail=f"Model API error: {str(e)}")

# REST API Endpoints (önceki gibi)
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Call Center Analysis API - WebSocket Edition",
        "version": "2.0.0",
        "websocket": "/ws/{client_id}",
        "connections": len(manager.active_connections)
    }
@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_conversation(request: ConversationRequest):
    """Tek konuşma analizi (REST endpoint)"""
    
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Konuşma metni boş olamaz")
    
    try:
        analysis = await call_gpt_oss_20b(request.text)
        
        response = AnalysisResponse(
            overallScore=analysis["overallScore"],
            sentiment=analysis["sentiment"],
            resolution=analysis["resolution"],
            agentPerformance=analysis["agentPerformance"],
            insights=[Insight(**insight) for insight in analysis["insights"]],
            metrics=Metrics(**analysis["metrics"]),
            timestamp=datetime.now().isoformat(),
            conversation_id=request.conversation_id
        )
        
        return response
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/tibco/service-request", response_model=TibcoServiceResponse)
async def create_service_request(request: TibcoServiceRequest):
    """Tibco Service Request oluştur (CORS proxy)"""
    
    tibco_url = "http://172.31.70.230:12226/ServiceCatalog/Rest/SiebelServices/ManageServiceRequest/v1/"
    
    headers = {
        'Content-Type': 'application/json',
        'Credentials.ApplicationId': 'VodafoneHackathon',
        'SourceSystem': 'Polaris',
        'Credentials.User': 'hackathon_user'
    }
    
    try:
        # Internal IP için proxy kullanmadan direkt bağlan
        async with httpx.AsyncClient(
            verify=False, 
            timeout=30.0,
            trust_env=False  # Proxy ayarlarını ignore et
        ) as client:
            print(f"🔵 Tibco'ya istek atılıyor: {tibco_url}")
            response = await client.post(
                tibco_url,
                json=request.dict(),
                headers=headers
            )
            
            print(f"📥 Tibco response status: {response.status_code}")
            response.raise_for_status()
            data = response.json()
            print(f"📦 Tibco response data: {json.dumps(data, indent=2)}")
            
            # SR numarasını çıkar
            sr_number = data.get("ManageServiceRequestResponse_v1", {}).get("Body", {}).get("Response", {}).get("SRNumber")
            
            if sr_number:
                return TibcoServiceResponse(
                    srNumber=sr_number,
                    success=True,
                    message="Talep başarıyla oluşturuldu"
                )
            else:
                return TibcoServiceResponse(
                    success=False,
                    message="SR numarası alınamadı"
                )
                
    except httpx.HTTPError as e:
        print(f"❌ Tibco API error: {e}")
        raise HTTPException(status_code=500, detail=f"Tibco API hatası: {str(e)}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Beklenmeyen hata: {str(e)}")

# WebSocket Endpoint - MÜŞTERİ
@app.websocket("/ws/customer/{client_id}")
async def customer_websocket(websocket: WebSocket, client_id: str):
    """
    Müşteri WebSocket endpoint - Sadece mesaj gönderme
    """
    client_id = f"customer-{client_id}"
    await manager.connect(websocket, client_id)
    
    try:
        await manager.send_personal_message({
            "type": "connected",
            "message": "Müşteri olarak bağlandınız",
            "client_id": client_id,
            "role": "customer",
            "timestamp": datetime.now().isoformat()
        }, client_id)
        
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "add_text":
                text = data.get("text", "")
                
                # TÜM client'ların buffer'ına ekle
                for cid in manager.active_connections.keys():
                    manager.append_to_buffer(cid, text)
                
                # Mesajı broadcast et
                await manager.broadcast({
                    "type": "new_message",
                    "text": text,
                    "from_client": client_id,
                    "role": "customer",
                    "timestamp": datetime.now().isoformat()
                })
                
            elif message_type == "ping":
                await manager.send_personal_message({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }, client_id)
    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        print(f"Customer WebSocket Error for {client_id}: {e}")
        manager.disconnect(client_id)

# WebSocket Endpoint - TEMSILİ
@app.websocket("/ws/agent/{client_id}")
async def agent_websocket(websocket: WebSocket, client_id: str):
    """
    Temsilci WebSocket endpoint - Mesaj gönderme + Analiz
    """
    client_id = f"agent-{client_id}"
    await manager.connect(websocket, client_id)
    live_mode = False
    
    try:
        # Hoş geldin mesajı
        await manager.send_personal_message({
            "type": "connected",
            "message": "Temsilci olarak bağlandınız",
            "client_id": client_id,
            "role": "agent",
            "timestamp": datetime.now().isoformat()
        }, client_id)
        
        while True:
            # Client'tan mesaj al
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            # Mesaj tipine göre işlem yap
            if message_type == "add_text":
                # Konuşma parçası ekle
                text = data.get("text", "")
                
                # TÜM client'ların buffer'ına ekle (müşteri ve temsilci senkronizasyonu için)
                for cid in manager.active_connections.keys():
                    manager.append_to_buffer(cid, text)
                
                # Mesajı TÜM bağlı client'lara broadcast et
                await manager.broadcast({
                    "type": "new_message",
                    "text": text,
                    "from_client": client_id,
                    "role": "agent",
                    "timestamp": datetime.now().isoformat()
                })
                
                # Gönderene onay mesajı
                await manager.send_personal_message({
                    "type": "text_added",
                    "message": "Metin eklendi ve paylaşıldı",
                    "current_buffer": manager.get_buffer(client_id),
                    "timestamp": datetime.now().isoformat()
                }, client_id)
                
                # Live mode aktifse otomatik analiz yap
                if live_mode:
                    buffer = manager.get_buffer(client_id)
                    if buffer.strip():
                        await manager.send_personal_message({
                            "type": "analyzing",
                            "message": "Analiz yapılıyor...",
                            "timestamp": datetime.now().isoformat()
                        }, client_id)
                        
                        try:
                            analysis = await call_gpt_oss_20b(buffer)
                            
                            await manager.send_personal_message({
                                "type": "analysis_result",
                                "analysis": analysis,
                                "timestamp": datetime.now().isoformat()
                            }, client_id)
                        except Exception as e:
                            await manager.send_personal_message({
                                "type": "error",
                                "message": f"Analiz hatası: {str(e)}",
                                "timestamp": datetime.now().isoformat()
                            }, client_id)
            
            elif message_type == "analyze":
                # Manuel analiz tetikle
                buffer = manager.get_buffer(client_id)
                
                if not buffer.strip():
                    await manager.send_personal_message({
                        "type": "error",
                        "message": "Analiz için metin bulunamadı",
                        "timestamp": datetime.now().isoformat()
                    }, client_id)
                    continue
                
                # Analiz başladı mesajı
                await manager.send_personal_message({
                    "type": "analyzing",
                    "message": "Analiz yapılıyor...",
                    "timestamp": datetime.now().isoformat()
                }, client_id)
                
                try:
                    # GPT-OSS-20B ile analiz yap
                    analysis = await call_gpt_oss_20b(buffer)
                    
                    # Konuşmayı DB'ye kaydet
                    db = next(get_db())
                    try:
                        # Müşteri ve temsilci mesajlarını ayır
                        lines = buffer.strip().split('\n')
                        customer_msgs = [l.replace('Müşteri: ', '') for l in lines if l.startswith('Müşteri:')]
                        agent_msgs = [l.replace('Temsilci: ', '') for l in lines if l.startswith('Temsilci:')]
                        
                        save_conversation_to_db(
                            db=db,
                            session_id=client_id,
                            customer_msg='\n'.join(customer_msgs),
                            agent_msg='\n'.join(agent_msgs),
                            analysis=analysis
                        )
                    finally:
                        db.close()
                    
                    # Sonuçları gönder
                    await manager.send_personal_message({
                        "type": "analysis_result",
                        "analysis": analysis,
                        "conversation": buffer,
                        "timestamp": datetime.now().isoformat()
                    }, client_id)
                    
                except Exception as e:
                    await manager.send_personal_message({
                        "type": "error",
                        "message": f"Analiz hatası: {str(e)}",
                        "timestamp": datetime.now().isoformat()
                    }, client_id)
            
            elif message_type == "clear":
                # Buffer'ı temizle
                manager.clear_buffer(client_id)
                
                await manager.send_personal_message({
                    "type": "cleared",
                    "message": "Buffer temizlendi",
                    "timestamp": datetime.now().isoformat()
                }, client_id)
            
            elif message_type == "live_mode":
                # Live mode aç/kapat
                live_mode = data.get("enabled", False)
                
                await manager.send_personal_message({
                    "type": "live_mode_changed",
                    "enabled": live_mode,
                    "message": f"Canlı analiz modu {'açıldı' if live_mode else 'kapatıldı'}",
                    "timestamp": datetime.now().isoformat()
                }, client_id)
            
            elif message_type == "ping":
                # Keepalive
                await manager.send_personal_message({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                }, client_id)
            
            else:
                await manager.send_personal_message({
                    "type": "error",
                    "message": f"Bilinmeyen mesaj tipi: {message_type}",
                    "timestamp": datetime.now().isoformat()
                }, client_id)
    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
    except Exception as e:
        print(f"WebSocket Error for {client_id}: {e}")
        manager.disconnect(client_id)

@app.get("/api/stats")
async def get_stats():
    """WebSocket istatistikleri"""
    return {
        "active_connections": len(manager.active_connections),
        "active_clients": list(manager.active_connections.keys()),
        "timestamp": datetime.now().isoformat()
    }

# ==================== ADMIN ENDPOINTS ====================

def save_conversation_to_db(
    db: Session,
    session_id: str,
    customer_msg: str,
    agent_msg: str,
    analysis: dict = None
):
    """Konuşmayı veritabanına kaydet"""
    try:
        # Skorları 0-1 arası normalize et (model 1-10 arası dönüyor)
        sentiment = analysis.get("sentiment") / 10 if analysis and analysis.get("sentiment") else None
        resolution = analysis.get("resolution") / 10 if analysis and analysis.get("resolution") else None
        performance = analysis.get("agentPerformance") / 10 if analysis and analysis.get("agentPerformance") else None
        overall = analysis.get("overallScore") / 10 if analysis and analysis.get("overallScore") else None
        
        # customer_emotion'u seed.py'deki formatla uyumlu hale getir
        emotion_map = {
            "Pozitif": "satisfied",
            "Nötr": "neutral",
            "Negatif": "frustrated"
        }
        customer_emotion_raw = analysis.get("metrics", {}).get("customerEmotion") if analysis else None
        customer_emotion = emotion_map.get(customer_emotion_raw, customer_emotion_raw.lower() if customer_emotion_raw else None)
        
        # empathy_level'i normalize et
        empathy_map = {
            "Yüksek": "high",
            "Orta": "medium", 
            "Düşük": "low"
        }
        empathy_raw = analysis.get("metrics", {}).get("empathyLevel") if analysis else None
        empathy = empathy_map.get(empathy_raw, empathy_raw.lower() if empathy_raw else None)
        
        conversation = Conversation(
            session_id=session_id,
            customer_message=customer_msg,
            agent_message=agent_msg,
            timestamp=datetime.now(),
            sentiment_score=sentiment,
            resolution_score=resolution,
            agent_performance=performance,
            overall_score=overall,
            is_resolved=analysis.get("metrics", {}).get("problemResolved", False) if analysis else False,
            customer_emotion=customer_emotion,
            response_time=analysis.get("metrics", {}).get("responseTime") if analysis else None,
            empathy_level=empathy,
            category="live_support"  # Canlı destek kategorisi
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        
        # Vector DB'ye ekle (benzer sorunları bulmak için)
        if customer_msg:
            add_issue_to_vector_db(
                issue_id=f"conv_{conversation.id}",
                issue_text=customer_msg,
                metadata={
                    "session_id": session_id,
                    "timestamp": datetime.now().isoformat(),
                    "is_resolved": conversation.is_resolved
                }
            )
        
        return conversation
    except Exception as e:
        print(f"DB Save Error: {e}")
        db.rollback()
        return None

@app.get("/api/admin/dashboard")
async def get_admin_dashboard(
    date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Yönetici dashboard verileri"""
    try:
        # Tarih filtresi
        if date:
            target_date = datetime.fromisoformat(date)
        else:
            target_date = datetime.now()
        
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        # Günlük konuşmalar
        conversations = db.query(Conversation).filter(
            and_(
                Conversation.timestamp >= start_of_day,
                Conversation.timestamp <= end_of_day
            )
        ).all()
        
        total_count = len(conversations)
        resolved_count = sum(1 for c in conversations if c.is_resolved)
        
        # Ortalama skorlar
        avg_satisfaction = sum(c.sentiment_score for c in conversations if c.sentiment_score) / total_count if total_count > 0 else 0
        avg_resolution = sum(c.resolution_score for c in conversations if c.resolution_score) / total_count if total_count > 0 else 0
        avg_performance = sum(c.agent_performance for c in conversations if c.agent_performance) / total_count if total_count > 0 else 0
        
        # Duygu dağılımı
        emotions = [c.customer_emotion for c in conversations if c.customer_emotion]
        emotion_distribution = dict(Counter(emotions))
        
        # Saatlik dağılım
        hourly_stats = {}
        for conv in conversations:
            hour = conv.timestamp.hour
            if hour not in hourly_stats:
                hourly_stats[hour] = {"count": 0, "resolved": 0}
            hourly_stats[hour]["count"] += 1
            if conv.is_resolved:
                hourly_stats[hour]["resolved"] += 1
        
        # Ortak sorunları kategorilere göre grupla
        category_issues = {}
        for conv in conversations:
            if conv.category and conv.customer_message:
                if conv.category not in category_issues:
                    category_issues[conv.category] = {
                        "count": 0,
                        "examples": []
                    }
                category_issues[conv.category]["count"] += 1
                # İlk 5 örneği sakla
                if len(category_issues[conv.category]["examples"]) < 5:
                    category_issues[conv.category]["examples"].append(conv.customer_message)
        
        # En sık görülen kategorileri sırala
        common_issues = [
            {
                "category": category,
                "count": data["count"],
                "examples": data["examples"]
            }
            for category, data in sorted(
                category_issues.items(), 
                key=lambda x: x[1]["count"], 
                reverse=True
            )[:10]  # En çok 10 kategori
        ]
        
        return {
            "date": target_date.isoformat(),
            "summary": {
                "total_conversations": total_count,
                "resolved_conversations": resolved_count,
                "resolution_rate": (resolved_count / total_count * 100) if total_count > 0 else 0,
                "avg_satisfaction": round(avg_satisfaction, 2),
                "avg_resolution": round(avg_resolution, 2),
                "avg_performance": round(avg_performance, 2)
            },
            "emotion_distribution": emotion_distribution,
            "hourly_distribution": hourly_stats,
            "common_issues": common_issues[:5],
            "recent_conversations": [
                {
                    "id": c.id,
                    "timestamp": c.timestamp.isoformat(),
                    "customer_message": c.customer_message,
                    "agent_message": c.agent_message,
                    "is_resolved": c.is_resolved,
                    "sentiment_score": c.sentiment_score,
                    "overall_score": c.overall_score,
                    "customer_emotion": c.customer_emotion,
                    "category": c.category,
                    "response_time": c.response_time,
                    "empathy_level": c.empathy_level
                }
                for c in conversations[-10:]  # Son 10 konuşma
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard error: {str(e)}")

@app.get("/api/admin/trends")
async def get_trends(days: int = 7, db: Session = Depends(get_db)):
    """Son N günün trend analizi"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        conversations = db.query(Conversation).filter(
            Conversation.timestamp >= start_date
        ).all()
        
        # Günlük gruplandır
        daily_stats = {}
        for conv in conversations:
            date_key = conv.timestamp.date().isoformat()
            if date_key not in daily_stats:
                daily_stats[date_key] = {
                    "date": date_key,
                    "total": 0,
                    "resolved": 0,
                    "avg_satisfaction": [],
                    "avg_resolution": [],
                    "avg_performance": []
                }
            
            daily_stats[date_key]["total"] += 1
            if conv.is_resolved:
                daily_stats[date_key]["resolved"] += 1
            if conv.sentiment_score:
                daily_stats[date_key]["avg_satisfaction"].append(conv.sentiment_score)
            if conv.resolution_score:
                daily_stats[date_key]["avg_resolution"].append(conv.resolution_score)
            if conv.agent_performance:
                daily_stats[date_key]["avg_performance"].append(conv.agent_performance)
        
        # Ortalamaları hesapla
        trends = []
        for date_key, stats in sorted(daily_stats.items()):
            trends.append({
                "date": date_key,
                "total": stats["total"],
                "resolved": stats["resolved"],
                "resolution_rate": (stats["resolved"] / stats["total"] * 100) if stats["total"] > 0 else 0,
                "avg_satisfaction": round(sum(stats["avg_satisfaction"]) / len(stats["avg_satisfaction"]), 2) if stats["avg_satisfaction"] else 0,
                "avg_resolution": round(sum(stats["avg_resolution"]) / len(stats["avg_resolution"]), 2) if stats["avg_resolution"] else 0,
                "avg_performance": round(sum(stats["avg_performance"]) / len(stats["avg_performance"]), 2) if stats["avg_performance"] else 0
            })
        
        return {
            "period": f"{start_date.date()} to {end_date.date()}",
            "trends": trends
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trends error: {str(e)}")

@app.get("/api/admin/conversations")
async def get_all_conversations(
    skip: int = 0,
    limit: int = 50,
    resolved: Optional[bool] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Tüm konuşmaları listele"""
    try:
        query = db.query(Conversation)
        
        if resolved is not None:
            query = query.filter(Conversation.is_resolved == resolved)
        
        if category:
            query = query.filter(Conversation.category == category)
        
        total = query.count()
        conversations = query.order_by(Conversation.timestamp.desc()).offset(skip).limit(limit).all()
        
        return {
            "total": total,
            "skip": skip,
            "limit": limit,
            "conversations": [
                {
                    "id": c.id,
                    "session_id": c.session_id,
                    "timestamp": c.timestamp.isoformat(),
                    "customer_message": c.customer_message,
                    "agent_message": c.agent_message,
                    "is_resolved": c.is_resolved,
                    "sentiment_score": c.sentiment_score,
                    "resolution_score": c.resolution_score,
                    "agent_performance": c.agent_performance,
                    "overall_score": c.overall_score,
                    "customer_emotion": c.customer_emotion,
                    "category": c.category,
                    "response_time": c.response_time,
                    "empathy_level": c.empathy_level
                }
                for c in conversations
            ]
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversations error: {str(e)}")


@app.get("/api/admin/daily-reports")
async def get_daily_reports(days: int = 30, db: Session = Depends(get_db)):
    """Günlük raporları getir"""
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        reports = db.query(DailyReport).filter(
            DailyReport.date >= start_date,
            DailyReport.date <= end_date
        ).order_by(DailyReport.date.desc()).all()
        
        return {
            "total": len(reports),
            "reports": [
                {
                    "id": r.id,
                    "date": r.date.isoformat(),
                    "total_conversations": r.total_conversations,
                    "resolved_conversations": r.resolved_conversations,
                    "avg_sentiment": r.avg_sentiment,
                    "avg_satisfaction": r.avg_satisfaction,
                    "avg_performance": r.avg_performance,
                    "top_emotion": r.top_emotion,
                    "top_category": r.top_category
                }
                for r in reports
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Daily reports error: {str(e)}")


@app.get("/api/admin/database-stats")
async def get_database_stats(db: Session = Depends(get_db)):
    """Veritabanı istatistikleri"""
    try:
        total_conversations = db.query(Conversation).count()
        total_reports = db.query(DailyReport).count()
        
        # Kategori dağılımı (NULL olmayanlar)
        categories = db.query(
            Conversation.category,
            func.count(Conversation.id).label('count')
        ).filter(Conversation.category.isnot(None)).group_by(Conversation.category).all()
        
        # Duygu dağılımı (NULL olmayanlar)
        emotions = db.query(
            Conversation.customer_emotion,
            func.count(Conversation.id).label('count')
        ).filter(Conversation.customer_emotion.isnot(None)).group_by(Conversation.customer_emotion).all()
        
        # İlk ve son konuşma tarihleri
        first_conversation = db.query(Conversation).order_by(Conversation.timestamp.asc()).first()
        last_conversation = db.query(Conversation).order_by(Conversation.timestamp.desc()).first()
        
        return {
            "total_conversations": total_conversations,
            "total_daily_reports": total_reports,
            "date_range": {
                "first": first_conversation.timestamp.isoformat() if first_conversation else None,
                "last": last_conversation.timestamp.isoformat() if last_conversation else None
            },
            "categories": [{"name": c.category, "count": c.count} for c in categories],
            "emotions": [{"name": e.customer_emotion, "count": e.count} for e in emotions]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database stats error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)