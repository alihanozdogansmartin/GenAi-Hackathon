from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import httpx
import json
import os
import asyncio
from datetime import datetime
from collections import defaultdict

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

# GPT-OSS-20B API konfigürasyonu
GPT_OSS_API_URL = os.getenv("GPT_OSS_API_URL", "http://your-gpt-oss-endpoint/v1/chat/completions")
GPT_OSS_API_KEY = os.getenv("GPT_OSS_API_KEY", "your-api-key-here")

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
    
    payload = {
        "model": "gpt-oss-20b",
        "messages": [
            {
                "role": "system",
                "content": "Sen bir müşteri hizmetleri analiz uzmanısın. Sadece JSON yanıt ver."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.3,
        "max_tokens": 1500,
        "top_p": 0.9
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GPT_OSS_API_KEY}"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                GPT_OSS_API_URL,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            
            data = response.json()
            model_response = data["choices"][0]["message"]["content"]
            
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
        print(f"GPT-OSS-20B Error: {e}")
        raise

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

# WebSocket Endpoint - GERÇEK ZAMANLI ANALİZ
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint - Gerçek zamanlı konuşma analizi
    
    Client mesaj formatları:
    
    1. Konuşma parçası ekle:
    {
        "type": "add_text",
        "text": "Müşteri: Merhaba..."
    }
    
    2. Analiz yap:
    {
        "type": "analyze"
    }
    
    3. Buffer'ı temizle:
    {
        "type": "clear"
    }
    
    4. Canlı konuşma modu (her mesajda otomatik analiz):
    {
        "type": "live_mode",
        "enabled": true
    }
    """
    
    await manager.connect(websocket, client_id)
    live_mode = False
    
    try:
        # Hoş geldin mesajı
        await manager.send_personal_message({
            "type": "connected",
            "message": "WebSocket bağlantısı kuruldu",
            "client_id": client_id,
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
                manager.append_to_buffer(client_id, text)
                
                # Onay mesajı gönder
                await manager.send_personal_message({
                    "type": "text_added",
                    "message": "Metin eklendi",
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)