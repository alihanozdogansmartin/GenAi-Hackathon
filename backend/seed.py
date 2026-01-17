"""
Veritabanını telekomunikasyon sektörüne uygun gerçekçi örneklerle dolduran seed script
"""
from datetime import datetime, timedelta
from database import get_db, Conversation, DailyReport, add_issue_to_vector_db
from sqlalchemy.orm import Session
import random

# Gerçekçi telekom konuşma örnekleri
SAMPLE_CONVERSATIONS = [
    {
        "messages": [
            {"sender": "customer", "content": "Merhaba, internetim çok yavaş. Speedtest yaptım 2 Mbps gösteriyor ama 100 Mbps fiber paketim var."},
            {"sender": "agent", "content": "Merhaba! Size yardımcı olmaktan mutluluk duyarım. Modem ışıkları yanıyor mu? Modemi resetlemeyi denediniz mi?"},
            {"sender": "customer", "content": "Evet, ışıklar yanıyor. 3 kez resetledim ama değişen bir şey olmadı. Bu 1 haftadır böyle."},
            {"sender": "agent", "content": "Anladım. Hatta bu durumun 1 haftadır devam etmesi kabul edilemez. Teknik ekibimizle irtibata geçiyorum, yarın sabah teknisyen göndereceğiz. Sorun çözülene kadar da internet ücretinizi iade edeceğim."}
        ],
        "sentiment_score": 0.65,
        "resolution_status": "resolved",
        "emotion": "frustrated",
        "category": "internet_speed",
        "tags": "fiber,yavaşlık,teknik_destek"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Bu ay faturamda 450 TL ekstra ücret var! Ne bu?"},
            {"sender": "agent", "content": "Faturanızı inceliyorum hemen. Ekstra ücret 15 Aralık'ta yapılan 200 dakikalık yurtdışı aramadan kaynaklanıyor."},
            {"sender": "customer", "content": "Yurtdışı aramam yok ki! Türkiye'den çıkmadım."},
            {"sender": "agent", "content": "Özür dilerim, kontrol ediyorum. Görüyorum ki bu teknik bir hata. Ücreti iptal ediyorum ve 50 TL indirim kuponu tanımlıyorum. Düzeltilmiş faturanız yarın SMS ile gelecek."}
        ],
        "sentiment_score": 0.55,
        "resolution_status": "resolved",
        "emotion": "angry",
        "category": "billing_error",
        "tags": "fatura,hata,ücret_iadesi"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Merhaba, numara taşıma için başvurmuştum. Ne zaman tamamlanır?"},
            {"sender": "agent", "content": "Merhaba! Başvuru numaranız nedir?"},
            {"sender": "customer", "content": "NT123456"},
            {"sender": "agent", "content": "Teşekkürler! Başvurunuz onaylandı ve 2 gün içinde taşıma işlemi tamamlanacak. SMS ile bilgilendirme alacaksınız."}
        ],
        "sentiment_score": 0.85,
        "resolution_status": "resolved",
        "emotion": "neutral",
        "category": "number_portability",
        "tags": "numara_taşıma,başvuru"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Evde hiç sinyal çekmiyor! Her arama düşüyor."},
            {"sender": "agent", "content": "Bu çok rahatsız edici olmalı. Hangi ilçedesiniz?"},
            {"sender": "customer", "content": "Kadıköy, Moda'da oturuyorum."},
            {"sender": "agent", "content": "Bölgenizde baz istasyonu bakımı var, bugün saat 18:00'de bitecek. Sonrasında sorun düzelecektir. Rahatsızlık için özür dilerim."}
        ],
        "sentiment_score": 0.70,
        "resolution_status": "resolved",
        "emotion": "frustrated",
        "category": "signal_coverage",
        "tags": "sinyal,kapsama,baz_istasyonu"
    },
    {
        "messages": [
            {"sender": "customer", "content": "10GB internet paketim bitti. Ek paket nasıl alırım?"},
            {"sender": "agent", "content": "Hemen yardımcı olayım! *123*1# tuşlayarak veya mobil uygulamamızdan paket satın alabilirsiniz."},
            {"sender": "customer", "content": "Uygulamadan aldım teşekkürler!"},
            {"sender": "agent", "content": "Rica ederim! İyi günler dilerim."}
        ],
        "sentiment_score": 0.95,
        "resolution_status": "resolved",
        "emotion": "satisfied",
        "category": "data_package",
        "tags": "internet_paketi,ek_paket"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Tarifemi değiştirmek istiyorum. Daha uygun bir şey var mı?"},
            {"sender": "agent", "content": "Tabii ki! Şu an hangi tarifede kullanıyorsunuz ve ne kadar internet/konuşma kullanıyorsunuz?"},
            {"sender": "customer", "content": "Ayda 20GB internet ve 500 dakika konuşma kullanıyorum. 150 TL ödüyorum."},
            {"sender": "agent", "content": "Size daha uygun bir tarife önerebilirim: 25GB internet, sınırsız konuşma, 125 TL. Geçiş yapalım mı?"}
        ],
        "sentiment_score": 0.80,
        "resolution_status": "pending",
        "emotion": "interested",
        "category": "tariff_change",
        "tags": "tarife,kampanya,değişiklik"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Yurtdışında internet çalışmıyor. Almanya'dayım."},
            {"sender": "agent", "content": "Yurtdışı veri dolaşımı aktif mi? Ayarlar > Mobil Veri > Veri Dolaşımı açık olmalı."},
            {"sender": "customer", "content": "Evet açık. Ama yine de bağlanmıyor."},
            {"sender": "agent", "content": "Manuel operatör seçimi yapın: Ayarlar > Mobil Ağ > Ağ Operatörleri > Vodafone DE seçin. Bu çözecektir."},
            {"sender": "customer", "content": "Olmadı yine. Çok acil ihtiyacım var!"},
            {"sender": "agent", "content": "Anlıyorum, teknik ekip inceliyor. 1 saat içinde dönüş yapacağız."}
        ],
        "sentiment_score": 0.35,
        "resolution_status": "pending",
        "emotion": "anxious",
        "category": "roaming",
        "tags": "yurtdışı,dolaşım,teknik_sorun"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Kurumsal hat açmak istiyorum. Firma olarak 50 hat gerekiyor."},
            {"sender": "agent", "content": "Kurumsal müşterilerimize özel avantajlı paketlerimiz var. Size kurumsal satış ekibimizden bir yetkili ile görüşme ayarlayabilir miyim?"},
            {"sender": "customer", "content": "Evet lütfen. En kısa zamanda arayabilirler."},
            {"sender": "agent", "content": "İletişim bilgilerinizi alıyorum. Yarın öğleden önce size ulaşacaklar."}
        ],
        "sentiment_score": 0.90,
        "resolution_status": "resolved",
        "emotion": "professional",
        "category": "corporate_sales",
        "tags": "kurumsal,toplu_hat,satış"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Modemim sürekli yeniden başlıyor. Gün içinde 10 kez kopuyor internet."},
            {"sender": "agent", "content": "Bu kesinlikle normal değil. Modem kaç yaşında? Garanti kapsamında mı?"},
            {"sender": "customer", "content": "2 yıllık, garantisi bitti sanırım."},
            {"sender": "agent", "content": "Modem arızalı görünüyor. Size yeni modem gönderelim mi? 24 saat içinde kargoya verilir."}
        ],
        "sentiment_score": 0.60,
        "resolution_status": "resolved",
        "emotion": "frustrated",
        "category": "device_problem",
        "tags": "modem,arıza,değişim"
    },
    {
        "messages": [
            {"sender": "customer", "content": "SMS gönderemiyorum. Mesaj merkezi numarası kaybolmuş."},
            {"sender": "agent", "content": "Mesaj merkezi numarasını tekrar girebilirsiniz: Ayarlar > Mesajlar > Mesaj Merkezi > +905327000000"},
            {"sender": "customer", "content": "Harika! Düzeldi, çok teşekkürler!"},
            {"sender": "agent", "content": "Sevindim! Başka bir sorun olursa buradayız."}
        ],
        "sentiment_score": 0.95,
        "resolution_status": "resolved",
        "emotion": "satisfied",
        "category": "sms_issue",
        "tags": "sms,mesaj_merkezi,ayar"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Fiber internet başvurum ne durumda? 2 hafta oldu."},
            {"sender": "agent", "content": "Başvuru numaranızı alabilir miyim?"},
            {"sender": "customer", "content": "FB987654"},
            {"sender": "agent", "content": "İnceliyorum... Maalesef bölgenizde fiber alt yapı hazır değil. Altyapı 3 ay içinde tamamlanacak. Müsait olunca haber verelim mi?"}
        ],
        "sentiment_score": 0.45,
        "resolution_status": "pending",
        "emotion": "disappointed",
        "category": "fiber_installation",
        "tags": "fiber,altyapı,kurulum"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Otomatik ödeme talimatı vermek istiyorum."},
            {"sender": "agent", "content": "Harika tercih! Mobil uygulamadan Hesabım > Fatura > Otomatik Ödeme kısmından kredi kartınızı tanımlayabilirsiniz."},
            {"sender": "customer", "content": "Bir de e-fatura geçmek istiyorum."},
            {"sender": "agent", "content": "E-fatura için *123# tuşlayıp seçenekleri takip edebilir ya da uygulamadan aktif edebilirsiniz. 5 TL indirim kazanırsınız!"},
            {"sender": "customer", "content": "Süper, teşekkürler!"}
        ],
        "sentiment_score": 0.92,
        "resolution_status": "resolved",
        "emotion": "satisfied",
        "category": "billing_setup",
        "tags": "otomatik_ödeme,e-fatura"
    },
    {
        "messages": [
            {"sender": "customer", "content": "YouTube ve Netflix açılmıyor mobilden. Diğer siteler açılıyor."},
            {"sender": "agent", "content": "APN ayarlarınızı kontrol edelim. Ayarlar > Mobil Ağ > APN > internet yazmalı."},
            {"sender": "customer", "content": "APN doğru. Sorun devam ediyor."},
            {"sender": "agent", "content": "DNS ayarı olabilir. Telefonu yeniden başlatır mısınız? Sorun devam ederse VPN kullanıyor musunuz?"},
            {"sender": "customer", "content": "Yeniden başlattım, düzeldi! Teşekkürler."}
        ],
        "sentiment_score": 0.80,
        "resolution_status": "resolved",
        "emotion": "confused",
        "category": "app_connectivity",
        "tags": "uygulama,bağlantı,apn"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Telefon rehberindeki numaraları göremiyorum. SIM kart sorunu mu?"},
            {"sender": "agent", "content": "Rehber telefonunuzda mı SIM kartta mı kayıtlı? Ayarlar > Rehber > Gösterim kısmından kontrol edin."},
            {"sender": "customer", "content": "SIM kartta kayıtlıymış. Telefona aktardım, teşekkürler!"},
            {"sender": "agent", "content": "Rica ederim! İyi günler."}
        ],
        "sentiment_score": 0.88,
        "resolution_status": "resolved",
        "emotion": "neutral",
        "category": "sim_card",
        "tags": "sim,rehber,ayar"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Kampanyadaki bedava Netflix 3 ay bitmiş. Nasıl iptal ederim?"},
            {"sender": "agent", "content": "Netflix üyeliğini Netflix hesabınızdan iptal edebilirsiniz. Vodafone tarafından otomatik ücretlendirme yapılmaz."},
            {"sender": "customer", "content": "Anladım, teşekkürler. Başka kampanyanız var mı?"},
            {"sender": "agent", "content": "Evet! Şu an YouTube Premium 6 ay bedava kampanyamız var. İlginizi çekerse tanımlayabilirim."}
        ],
        "sentiment_score": 0.85,
        "resolution_status": "resolved",
        "emotion": "satisfied",
        "category": "campaign",
        "tags": "kampanya,netflix,iptal"
    },
    {
        "messages": [
            {"sender": "customer", "content": "5G telefonum var ama 4.5G çekiyor. 5G nasıl aktif olur?"},
            {"sender": "agent", "content": "5G tarifeniz var mı? 5G için uyumlu tarife gerekiyor."},
            {"sender": "customer", "content": "Hayır, nasıl geçerim?"},
            {"sender": "agent", "content": "5G Super tarife 200 TL, 50GB internet sınırsız konuşma. Geçiş yapalım mı?"},
            {"sender": "customer", "content": "Şimdilik 4.5G devam edeyim. Düşüneceğim."}
        ],
        "sentiment_score": 0.70,
        "resolution_status": "pending",
        "emotion": "interested",
        "category": "5g_upgrade",
        "tags": "5g,tarife,yükseltme"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Hattımı kaybettim, çalındı sanırım. Kapatabilir misiniz?"},
            {"sender": "agent", "content": "Hemen kapatıyorum! Kimlik doğrulaması için TC kimlik numaranız?"},
            {"sender": "customer", "content": "12345678901"},
            {"sender": "agent", "content": "Hattınız askıya alındı. Yeni SIM kart için en yakın Vodafone mağazasına kimliğinizle gelebilirsiniz. Ücretsiz yeni SIM verilecek."}
        ],
        "sentiment_score": 0.65,
        "resolution_status": "resolved",
        "emotion": "anxious",
        "category": "line_suspension",
        "tags": "hırsızlık,hat_kapatma,sim_değişim"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Aramalar 10 saniye sonra otomatik kapanıyor. Bu ne?"},
            {"sender": "agent", "content": "Garip bir durum. Hangi telefon modelini kullanıyorsunuz?"},
            {"sender": "customer", "content": "iPhone 14 Pro"},
            {"sender": "agent", "content": "Ağ ayarlarını sıfırlayın: Ayarlar > Genel > Sıfırla > Ağ Ayarlarını Sıfırla. Sorun devam ederse SIM kartı değiştirelim."},
            {"sender": "customer", "content": "Düzeldi! Ağ sıfırlama işe yaradı."}
        ],
        "sentiment_score": 0.75,
        "resolution_status": "resolved",
        "emotion": "frustrated",
        "category": "call_dropping",
        "tags": "arama,teknik_sorun,iphone"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Sesli mesaj servisi nasıl aktif edilir?"},
            {"sender": "agent", "content": "*123*1*1*3# tuşlayarak aktif edebilirsiniz. Aylık 5 TL."},
            {"sender": "customer", "content": "Aktif ettim ama nasıl dinlerim?"},
            {"sender": "agent", "content": "555 numarasını arayarak sesli mesajlarınızı dinleyebilirsiniz."}
        ],
        "sentiment_score": 0.82,
        "resolution_status": "resolved",
        "emotion": "neutral",
        "category": "voicemail",
        "tags": "sesli_mesaj,aktivasyon"
    },
    {
        "messages": [
            {"sender": "customer", "content": "Faturamı taksit yapmak istiyorum. Mümkün mü?"},
            {"sender": "agent", "content": "Fatura tutarınız 500 TL'nin üzerindeyse 3 taksit imkanı sunuyoruz. Faturanız kaç TL?"},
            {"sender": "customer", "content": "850 TL"},
            {"sender": "agent", "content": "3 taksit yapabiliriz. Aylık 283 TL olarak yansıyacak. Onaylıyor musunuz?"},
            {"sender": "customer", "content": "Evet lütfen, çok teşekkürler!"}
        ],
        "sentiment_score": 0.88,
        "resolution_status": "resolved",
        "emotion": "relieved",
        "category": "billing_installment",
        "tags": "fatura,taksit,ödeme"
    }
]

def seed_database():
    """Veritabanını örnek verilerle doldur"""
    db: Session = next(get_db())
    
    print("🌱 Veritabanı seed işlemi başlıyor...")
    
    # Mevcut verileri temizle
    db.query(Conversation).delete()
    db.query(DailyReport).delete()
    db.commit()
    print("✅ Mevcut veriler temizlendi")
    
    # Son 7 gün için konuşmalar ekle (bugün dahil 8 gün)
    base_date = datetime.now() - timedelta(days=7)
    
    total_conversations = 0
    
    for day in range(8):  # 0-7 = 8 gün (bugün dahil)
        current_date = base_date + timedelta(days=day)
        
        # Her gün için rastgele sayıda konuşma (5-15 arası)
        conversations_per_day = random.randint(5, 15)
        
        for i in range(conversations_per_day):
            # Rastgele bir örnek seç
            sample = random.choice(SAMPLE_CONVERSATIONS)
            
            # Rastgele saat ekle (09:00 - 20:00 arası)
            hour = random.randint(9, 20)
            minute = random.randint(0, 59)
            conversation_time = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            # Müşteri ve agent mesajlarını birleştir
            customer_msgs = " | ".join([msg["content"] for msg in sample["messages"] if msg["sender"] == "customer"])
            agent_msgs = " | ".join([msg["content"] for msg in sample["messages"] if msg["sender"] == "agent"])
            
            # Konuşmayı oluştur (database.py modeline uygun)
            conversation = Conversation(
                session_id=f"session_{random.randint(1000, 9999)}_{day}_{i}",
                customer_message=customer_msgs,
                agent_message=agent_msgs,
                timestamp=conversation_time,
                sentiment_score=sample["sentiment_score"],
                resolution_score=sample["sentiment_score"] + random.uniform(0.05, 0.15),
                agent_performance=random.uniform(0.70, 0.95),
                overall_score=sample["sentiment_score"],
                is_resolved=(sample["resolution_status"] == "resolved"),
                customer_emotion=sample["emotion"],
                response_time=f"{random.randint(30, 300)}s",
                empathy_level=random.choice(["high", "medium", "low"]),
                category=sample["category"],
                keywords=sample["tags"]
            )
            
            db.add(conversation)
            
            # Vector DB'ye sorun ekle
            if sample["messages"]:
                issue_text = " ".join([msg["content"] for msg in sample["messages"] if msg["sender"] == "customer"])
                add_issue_to_vector_db(
                    issue_id=f"conv_{total_conversations}",
                    issue_text=issue_text,
                    metadata={
                        "category": sample["category"],
                        "emotion": sample["emotion"],
                        "date": conversation_time.isoformat()
                    }
                )
            
            total_conversations += 1
        
        # Her gün için günlük rapor oluştur
        daily_stats = db.query(Conversation).filter(
            Conversation.timestamp >= current_date.date(),
            Conversation.timestamp < (current_date + timedelta(days=1)).date()
        ).all()
        
        if daily_stats:
            total = len(daily_stats)
            resolved = sum(1 for c in daily_stats if c.is_resolved)
            avg_sentiment = sum(c.sentiment_score for c in daily_stats) / total
            avg_satisfaction = sum(c.sentiment_score for c in daily_stats) / total
            avg_performance = sum(c.agent_performance for c in daily_stats if c.agent_performance) / total
            
            # En çok görülen duygu
            emotions = [c.customer_emotion for c in daily_stats if c.customer_emotion]
            top_emotion = max(set(emotions), key=emotions.count) if emotions else None
            
            # En çok görülen kategori
            categories = [c.category for c in daily_stats if c.category]
            top_category = max(set(categories), key=categories.count) if categories else None
            
            daily_report = DailyReport(
                date=current_date,
                total_conversations=total,
                resolved_conversations=resolved,
                avg_sentiment=avg_sentiment,
                avg_satisfaction=avg_satisfaction,
                avg_performance=avg_performance,
                top_emotion=top_emotion,
                top_category=top_category
            )
            
            db.add(daily_report)
    
    db.commit()
    
    print(f"✅ {total_conversations} konuşma eklendi")
    print(f"✅ {total_conversations} vector DB kaydı eklendi")
    print(f"✅ 7 günlük rapor oluşturuldu")
    print("🎉 Seed işlemi tamamlandı!")
    
    # İstatistikler
    print("\n📊 Veritabanı İstatistikleri:")
    print(f"Toplam Konuşma: {db.query(Conversation).count()}")
    print(f"Çözülen: {db.query(Conversation).filter(Conversation.is_resolved == True).count()}")
    print(f"Bekleyen: {db.query(Conversation).filter(Conversation.is_resolved == False).count()}")
    all_convs = db.query(Conversation).all()
    if all_convs:
        print(f"Ortalama Memnuniyet: {sum(c.sentiment_score for c in all_convs) / len(all_convs):.2f}")
    
    db.close()

if __name__ == "__main__":
    seed_database()
