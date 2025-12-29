🚀 Kurulum
Gereksinimler

Python 3.9+

Node.js 16+ ve npm

Git

GPT-OSS-20B API erişimi

📁 Proje Yapısı  
call-center-analysis/  
│  
├── backend/  
│   ├── main.py            # FastAPI + WebSocket backend    
│   ├── requirements.txt   # Python dependencies    
│   └── .env               # Environment variables (gitignore)  
│  
├── frontend/  
│   ├── public/  
│   ├── src/  
│   │   ├── App.js         # Main React component  
│   │   ├── index.js       # Entry point  
│   │   └── index.css      # Tailwind CSS  
│   ├── package.json       # npm dependencies  
│   ├── tailwind.config.js # Tailwind config  
│    
│
└── README.md              # Main documentation  

🔧 Backend Kurulumu
1. Repository'yi klonlayın  
git clone https://github.com/your-username/call-center-analysis.git  
cd call-center-analysis/backend  

.env.example dosyasını .env olarak değiştirin

2. Virtual environment oluşturun  
python -m venv venv  

Windows  
venv\Scripts\activate  

Mac / Linux  
source venv/bin/activate  

3. Dependencies'i yükleyin  
pip install -r requirements.txt  

4. Backend'i başlatın  
uvicorn main:app --reload --host 0.0.0.0 --port 8000  


✅ Backend çalışıyor:  
👉 http://localhost:8000  

🎨 Frontend Kurulumu  

Yeni bir terminal açın:  
  
cd frontend  

1. Dependencies'i yükleyin  
npm install  

2. Frontend'i başlatın  
npm start  


✅ Frontend çalışıyor:  
👉 http://localhost:3000  

📡 API Dokümantasyonu

Backend çalışırken otomatik API dokümantasyonu:

Swagger UI: http://localhost:8000/docs

🔄 Gerçek Zamanlı Analiz Akışı
Müşteri Mesajı
      ↓
WebSocket
      ↓
Backend
      ↓
GPT-OSS-20B
      ↓
Analiz Sonucu
      ↓
WebSocket
      ↓
Frontend

📊 Örnek Dashboard

Call Center Analiz Dashboard

⭐ Genel Skor: 8 / 10

😊 Duygu: 7 / 10

✅ Çözüm: 9 / 10

👤 Temsilci: 8 / 10

🤖 AI Önerileri

✅ Temsilci hızlı ve profesyonel yanıt verdi

⚠️ Müşteri bekleme süresinden rahatsız

🧠 Kullanılan Teknolojiler

Backend: FastAPI, WebSocket, Python

Frontend: React, Tailwind CSS

AI: GPT-OSS-20B

Gerçek Zamanlı İletişim: WebSocket
