import React, { useState, useEffect, useRef } from 'react';
import { Phone, Send, Wifi, WifiOff, FileText, MessageCircle } from 'lucide-react';

function CustomerView() {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  
  // Self-service state
  const [mode, setMode] = useState('initial'); // 'initial', 'self-service', 'agent'
  const [serviceStep, setServiceStep] = useState(0); // 0: form, 1: processing, 2: success
  const [phoneNumber, setPhoneNumber] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [srNumber, setSrNumber] = useState('');
  
  const wsRef = useRef(null);
  const conversationEndRef = useRef(null);

  // WebSocket bağlantısı kur
  const connectWebSocket = () => {
    const clientId = `${Date.now()}`;
    const socket = new WebSocket(`ws://localhost:8000/ws/customer/${clientId}`);
    
    socket.onopen = () => {
      console.log('✅ WebSocket connected as CUSTOMER');
      setConnected(true);
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📩 Received:', data);
      
      // Yeni mesaj geldiğinde konuşmaya ekle
      if (data.type === 'new_message') {
        const text = data.text;
        // "Müşteri: mesaj" veya "Temsilci: mesaj" formatını parse et
        const match = text.match(/^(Müşteri|Temsilci):\s*(.+)$/);
        if (match) {
          const [, role, messageText] = match;
          setConversation(prev => {
            // Aynı mesajı tekrar eklememek için kontrol et
            const lastMsg = prev[prev.length - 1];
            if (lastMsg && lastMsg.text === messageText && lastMsg.role === role) {
              return prev;
            }
            return [...prev, { role, text: messageText, timestamp: Date.now() }];
          });
        }
      }
    };
    
    socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
    
    socket.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setConnected(false);
      setWs(null);
    };
    
    wsRef.current = socket;
    setWs(socket);
  };

  // WebSocket'e mesaj gönder
  const sendWebSocketMessage = (data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      console.log('📤 Sent:', data);
      return true;
    } else {
      console.error('❌ WebSocket not connected');
      return false;
    }
  };

  // Müşteri mesajı gönder
  const sendMessage = () => {
    if (!message.trim()) return;
    
    console.log('🔵 Sending message:', message);
    
    // WebSocket'e gönder (broadcast olarak dönecek)
    const sent = sendWebSocketMessage({
      type: 'add_text',
      text: `Müşteri: ${message}`
    });
    
    if (sent) {
      setMessage('');
    }
  };

  // Self-service fatura talebi
  const handleInvoiceRequest = async () => {
    if (!phoneNumber || !year || !month) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    setServiceStep(1); // Processing

    try {
      const requestBody = {
        "LoggedMSISDN": phoneNumber,
        "BillingAccountCode": "",
        "CustomerCode": null,
        "MSISDN": phoneNumber,
        "ServiceRequestID": "",
        "TCKN": "",
        "SRStructure": {
          "TripletNumber": "9",
          "Type": "",
          "Area": "",
          "SubArea": "",
          "Status": "Closed",
          "Priority": "",
          "Owner": "",
          "Description": "Ayrıntılı fatura talebi - Polaris müşterisi",
          "OrderID": "",
          "InvoiceNumber": "",
          "Conclusion": "",
          "SubConclusion": "",
          "Reason": "",
          "MaximoTicketId": "",
          "ContactNumber": "",
          "Details": [],
          "ListOfExternalQuestions": {
            "PathName": "9-Ayrıntılı Fatura Talebi",
            "Duration": "60",
            "ExternalQuestions": [
              {
                "Question": "9-Ayrıntılı Fatura Talebi_Question_1",
                "Answer": year
              },
              {
                "Question": "9-Ayrıntılı Fatura Talebi_Question_3",
                "Answer": month
              },
              {
                "Question": "9-Ayrıntılı Fatura Talebi_Question_4",
                "Answer": month
              }
            ]
          },
          "SubStatus": "",
          "IBAN": "",
          "Amount": ""
        }
      };

      // Backend üzerinden Tibco'ya istek at (CORS sorununu çözmek için)
      const response = await fetch('http://localhost:8000/api/tibco/service-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      
      if (data.success && data.srNumber) {
        setSrNumber(data.srNumber);
        setServiceStep(2); // Success
      } else {
        throw new Error(data.message || 'SR numarası alınamadı');
      }
    } catch (error) {
      console.error('Fatura talebi hatası:', error);
      alert('Talebiniz işlenirken bir hata oluştu. Lütfen tekrar deneyin.');
      setServiceStep(0);
    }
  };

  // Müşteri temsilcisine bağlan
  const connectToAgent = () => {
    setMode('agent');
    connectWebSocket();
  };

  // Cleanup
  useEffect(() => {
    // WebSocket bağlantısını sadece agent modunda kur
    if (mode === 'agent') {
      connectWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [mode]);

  // Auto scroll
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 p-8">
      <div className="max-w-3xl mx-auto">
        {/* Vodafone Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <Phone className="w-10 h-10 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-white">
                Vodafone
              </h1>
              <p className="text-red-500 font-semibold">Müşteri Hizmetleri</p>
            </div>
            {mode === 'agent' && (connected ? (
              <Wifi className="w-8 h-8 text-green-400 animate-pulse" />
            ) : (
              <WifiOff className="w-8 h-8 text-red-400" />
            ))}
          </div>
          <p className="text-gray-300 text-lg">Size nasıl yardımcı olabiliriz?</p>
        </div>

        {/* Initial Selection Screen */}
        {mode === 'initial' && (
          <div className="bg-gray-800 border-2 border-red-600 rounded-2xl shadow-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Bir seçenek seçin
            </h2>
            <div className="space-y-4">
              <button
                onClick={() => setMode('self-service')}
                className="w-full p-6 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-xl transition-all shadow-lg flex items-center gap-4 group"
              >
                <FileText className="w-8 h-8 group-hover:scale-110 transition-transform" />
                <div className="text-left flex-1">
                  <p className="font-bold text-lg">Önceki Dönem Faturamı Talep Ediyorum</p>
                  <p className="text-sm text-red-100">Hızlı işlem - Temsilci beklemeye gerek yok</p>
                </div>
              </button>
              
              <button
                onClick={connectToAgent}
                className="w-full p-6 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl transition-all shadow-lg flex items-center gap-4 group"
              >
                <MessageCircle className="w-8 h-8 group-hover:scale-110 transition-transform" />
                <div className="text-left flex-1">
                  <p className="font-bold text-lg">Müşteri Temsilcisine Bağlan</p>
                  <p className="text-sm text-gray-300">Diğer talepleriniz için canlı destek</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Self-Service Mode */}
        {mode === 'self-service' && (
          <div className="bg-gray-800 border-2 border-red-600 rounded-2xl shadow-2xl p-8">
            {serviceStep === 0 && (
              <>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-red-500" />
                  Ayrıntılı Fatura Talebi
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Telefon Numarası</label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="5012009070"
                      className="w-full px-4 py-3 bg-gray-700 border-2 border-gray-600 text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Yıl</label>
                    <input
                      type="text"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      placeholder="2025"
                      className="w-full px-4 py-3 bg-gray-700 border-2 border-gray-600 text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2 font-medium">Ay (1-12)</label>
                    <input
                      type="text"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      placeholder="2"
                      className="w-full px-4 py-3 bg-gray-700 border-2 border-gray-600 text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setMode('initial')}
                      className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
                    >
                      Geri
                    </button>
                    <button
                      onClick={handleInvoiceRequest}
                      className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold"
                    >
                      Talebi Gönder
                    </button>
                  </div>
                </div>
              </>
            )}

            {serviceStep === 1 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white text-lg">Talebiniz işleniyor...</p>
              </div>
            )}

            {serviceStep === 2 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Talebiniz Alındı!</h3>
                <div className="bg-gray-700 border-2 border-green-500 rounded-xl p-4 mb-6">
                  <p className="text-gray-300 mb-2">Talep Numaranız:</p>
                  <p className="text-2xl font-bold text-green-400">{srNumber}</p>
                </div>
                <p className="text-gray-300 mb-6">
                  Talebiniz en kısa sürede işleme alınacak ve size dönüş yapılacaktır.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={connectToAgent}
                    className="w-full px-6 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-bold flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Müşteri Temsilcisine Bağlan
                  </button>
                  <button
                    onClick={() => {
                      setMode('initial');
                      setServiceStep(0);
                      setPhoneNumber('');
                      setYear('');
                      setMonth('');
                      setSrNumber('');
                    }}
                    className="w-full px-6 py-4 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
                  >
                    Ana Sayfaya Dön
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Agent Mode */}
        {mode === 'agent' && (
          <>
            <div className="bg-gray-800 border-2 border-red-600 rounded-2xl shadow-2xl p-5 mb-6">
              <div className="flex items-center justify-center gap-3">
                <div className={`w-4 h-4 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500 animate-pulse'}`}></div>
                <span className={`font-bold text-lg ${connected ? 'text-green-400' : 'text-red-400'}`}>
                  {connected ? '✓ Temsilciye Bağlı' : '⏳ Bağlantı Kuruluyor...'}
                </span>
              </div>
            </div>

            {/* Konuşma Alanı */}
            <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl shadow-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                Canlı Görüşme
              </h2>
              
              <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-900 rounded-xl border border-gray-700">
                {conversation.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-gray-400 mb-2 text-lg">Görüşmeye başlamak için mesajınızı yazın</p>
                    <p className="text-sm text-gray-500">Vodafone müşteri temsilcileri size yardımcı olmaya hazır</p>
                  </div>
                ) : (
                  conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`mb-3 p-4 rounded-xl ${msg.role === 'Müşteri' ? 'bg-red-600 ml-8' : 'bg-gray-700 mr-8'}`}
                    >
                      <p className="text-white font-medium">{msg.text}</p>
                      <span className="text-xs text-gray-300 mt-2 block">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
                <div ref={conversationEndRef} />
              </div>

              {/* Mesaj Gönderme */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Mesajınızı yazın..."
                  disabled={!connected}
                  className="flex-1 px-5 py-4 bg-gray-700 border-2 border-gray-600 text-white rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:opacity-50 placeholder-gray-400"
                />
                <button
                  onClick={sendMessage}
                  disabled={!connected || !message.trim()}
                  className="px-8 py-4 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bold shadow-lg"
                >
                  <Send className="w-5 h-5" />
                  Gönder
                </button>
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
            <p className="text-gray-400 text-sm">
              💬 Mesajlarınız Vodafone müşteri temsilcisi tarafından yanıtlanacaktır
            </p>
            <p className="text-red-500 text-xs mt-2 font-semibold">
              Powered by AI • Vodafone Hackathon 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerView;
