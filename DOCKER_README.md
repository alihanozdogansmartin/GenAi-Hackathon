# Docker Deployment Guide

Bu proje Docker Compose kullanılarak kolayca çalıştırılabilir.

## Gereksinimler

- Docker Desktop (Windows/Mac) veya Docker Engine (Linux)
- Docker Compose

## Kurulum ve Çalıştırma

### 1. Environment Ayarları

Backend klasöründe `.env` dosyası oluşturun:

```bash
cd backend
cp ../.env.example .env
```

`.env` dosyasını düzenleyerek gerekli API anahtarlarını ve bilgilerini ekleyin:

```env
GPT_OSS_API_KEY=your_actual_api_key
proxy_username=your_proxy_username
proxy_password=your_proxy_password
PRACTICUS_USERNAME=your_username
PRACTICUS_PASSWORD=your_password
```

### 2. Docker Container'ları Başlatma

Proje ana dizininde:

```bash
docker-compose up -d
```

İlk çalıştırmada build işlemi birkaç dakika sürebilir.

### 3. Uygulamaya Erişim

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### 4. Logları İzleme

```bash
# Tüm servislerin logları
docker-compose logs -f

# Sadece backend
docker-compose logs -f backend

# Sadece frontend
docker-compose logs -f frontend
```

### 5. Container'ları Durdurma

```bash
# Durdur
docker-compose stop

# Durdur ve kaldır
docker-compose down

# Volume'ları da sil (veritabanı dahil)
docker-compose down -v
```

### 6. Yeniden Build Etme

Kod değişikliklerinden sonra:

```bash
# Sadece build
docker-compose build

# Build ve başlat
docker-compose up -d --build
```

## Development Modu

Development modunda volumes sayesinde kod değişiklikleri otomatik yansır:

- Backend: `--reload` flag'i ile çalışır, kod değişiklikleri anında yansır
- Frontend: Production build kullanır, değişiklikler için rebuild gerekir

Frontend'i development modunda çalıştırmak için:

```bash
cd frontend
npm start
```

## Troubleshooting

### Port Zaten Kullanımda

Eğer 3000 veya 8000 portları kullanımdaysa, `docker-compose.yml` dosyasındaki port mapping'leri değiştirebilirsiniz:

```yaml
ports:
  - "3001:80"  # Frontend için
  - "8001:8000"  # Backend için
```

### Container Yeniden Başlatma

```bash
docker-compose restart backend
docker-compose restart frontend
```

### Container İçine Girme

```bash
# Backend
docker exec -it genai-backend bash

# Frontend
docker exec -it genai-frontend sh
```

### Database Reset

```bash
docker-compose down -v
docker-compose up -d
```

## Production Deployment

Production ortamı için:

1. `.env` dosyasında production credentials kullanın
2. `docker-compose.yml` içindeki `--reload` flag'ini kaldırın
3. Uygun güvenlik ayarlarını yapın
4. Reverse proxy (nginx, traefik) kullanın
5. SSL/TLS sertifikaları ekleyin

## Volume Yönetimi

Veritabanı ve ChromaDB verileri `backend-db` volume'ünde saklanır:

```bash
# Volume listesi
docker volume ls

# Volume detayları
docker volume inspect genai-hackathon_backend-db

# Volume backup
docker run --rm -v genai-hackathon_backend-db:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data
```
