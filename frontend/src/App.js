import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Phone, Send, Trash2, Activity, WifiOff, Wifi, PlayCircle, StopCircle } from 'lucide-react';

function App() {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [logs, setLogs] = useState([]);
  
  const wsRef = useRef(null);
  const conversationEndRef = useRef(null);

  // WebSocket bağlantısı kur
  const connectWebSocket = () => {
    const clientId = `client-${Date.now()}`;
    const socket = new WebSocket(`ws://localhost:8000/ws/${clientId}`);
    
    socket.onopen = () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
      addLog('Bağlantı kuruldu', 'success');
    };
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📩 Received:', data);
      
      handleWebSocketMessage(data);
    };
    
    socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      addLog('Bağlantı hatası', 'error');
    };
    
    socket.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setConnected(false);
      setWs(null);
      addLog('Bağlantı kesildi', 'warning');
    };
    
    wsRef.current = socket;
    setWs(socket);
  };

  // WebSocket mesajlarını işle
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'connected':
        addLog('WebSocket bağlantısı başarılı', 'success');
        break;
      
      case 'text_added':
        addLog('Metin eklendi', 'info');
        break;
      
      case 'analyzing':
        setAnalyzing(true);
        addLog('Analiz yapılıyor...', 'info');
        break;
      
      case 'analysis_result':
        setAnalyzing(false);
        setAnalysis(data.analysis);
        addLog('Analiz tamamlandı', 'success');
        break;
      
      case 'cleared':
        setConversation([]);
        setAnalysis(null);
        addLog('Konuşma temizlendi', 'info');
        break;
      
      case 'live_mode_changed':
        addLog(`Canlı mod ${data.enabled ? 'açıldı' : 'kapatıldı'}`, 'info');
        break;
      
      case 'error':
        setAnalyzing(false);
        addLog(`Hata: ${data.message}`, 'error');
        break;
      
      default:
        console.log('Unknown message type:', data.type);
    }
  };

  // Log ekle
  const addLog = (message, type = 'info') => {
    const newLog = {
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [...prev.slice(-9), newLog]);
  };

  // WebSocket'e mesaj gönder
  const sendWebSocketMessage = (data) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    } else {
      addLog('WebSocket bağlı değil', 'error');
    }
  };

  // Mesaj ekle
  const addMessage = (role, text) => {
    const newMessage = { role, text, timestamp: Date.now() };
    setConversation(prev => [...prev, newMessage]);
    
    // WebSocket'e gönder
    const fullText = `${role}: ${text}`;
    sendWebSocketMessage({
      type: 'add_text',
      text: fullText
    });
    
    setMessage('');
  };

  // Manuel analiz yap
  const requestAnalysis = () => {
    sendWebSocketMessage({ type: 'analyze' });
  };

  // Konuşmayı temizle
  const clearConversation = () => {
    sendWebSocketMessage({ type: 'clear' });
  };

  // Live mode toggle
  const toggleLiveMode = () => {
    const newLiveMode = !liveMode;
    setLiveMode(newLiveMode);
    sendWebSocketMessage({
      type: 'live_mode',
      enabled: newLiveMode
    });
  };

  // Bağlantıyı kes
  const disconnect = () => {
    if (ws) {
      ws.close();
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Auto scroll
  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  const getScoreColor = (score) => {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Phone className="w-10 h-10 text-indigo-600" />
            <h1 className="text-4xl font-bold text-gray-800">
              CallCenter Analizi
            </h1>
            <Activity className={`w-8 h-8 ${connected ? 'text-green-500 animate-pulse' : 'text-gray-400'}`} />
          </div>
          <p className="text-gray-600">Canlı Müşteri Memnuniyeti Analizi</p>
        </div>

        {/* Connection Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {connected ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <span className={`font-semibold ${connected ? 'text-green-600' : 'text-red-600'}`}>
                  {connected ? 'Bağlı' : 'Bağlı Değil'}
                </span>
              </div>
              
              {!connected ? (
                <button
                  onClick={connectWebSocket}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Bağlan
                </button>
              ) : (
                <button
                  onClick={disconnect}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Bağlantıyı Kes
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={toggleLiveMode}
                disabled={!connected}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  liveMode 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {liveMode ? <StopCircle className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                {liveMode ? 'Canlı Mod Açık' : 'Canlı Mod Kapalı'}
              </button>
              
              <button
                onClick={clearConversation}
                disabled={!connected || conversation.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-5 h-5" />
                Temizle
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sol Panel - Konuşma */}
          <div className="space-y-6">
            {/* Konuşma Alanı */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Konuşma</h2>
              
              <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
                {conversation.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    Henüz konuşma başlamadı...
                  </p>
                ) : (
                  conversation.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`mb-3 p-3 rounded-lg ${
                        msg.role === 'Müşteri' 
                          ? 'bg-blue-100 ml-4' 
                          : 'bg-green-100 mr-4'
                      }`}
                    >
                      <span className="font-semibold text-sm">{msg.role}:</span>
                      <p className="text-gray-800 mt-1">{msg.text}</p>
                    </div>
                  ))
                )}
                <div ref={conversationEndRef} />
              </div>

              {/* Mesaj Gönderme */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && message && addMessage('Müşteri', message)}
                    placeholder="Müşteri mesajı yazın..."
                    disabled={!connected}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => message && addMessage('Müşteri', message)}
                    disabled={!connected || !message}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && message && addMessage('Temsilci', message)}
                    placeholder="Temsilci yanıtı yazın..."
                    disabled={!connected}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                  <button
                    onClick={() => message && addMessage('Temsilci', message)}
                    disabled={!connected || !message}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>

                {!liveMode && (
                  <button
                    onClick={requestAnalysis}
                    disabled={!connected || conversation.length === 0 || analyzing}
                    className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {analyzing ? 'Analiz Yapılıyor...' : 'Analiz Et'}
                  </button>
                )}
              </div>
            </div>

            {/* Log Alanı */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Sistem Logları</h2>
              <div className="h-48 overflow-y-auto p-4 bg-gray-50 rounded-lg font-mono text-sm">
                {logs.map((log, idx) => (
                  <div key={idx} className="mb-2">
                    <span className="text-gray-500">[{log.timestamp}]</span>
                    <span className={`ml-2 ${
                      log.type === 'success' ? 'text-green-600' :
                      log.type === 'error' ? 'text-red-600' :
                      log.type === 'warning' ? 'text-orange-600' :
                      'text-blue-600'
                    }`}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sağ Panel - Analiz Sonuçları */}
          <div className="space-y-6">
            {analyzing ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Gerçek zamanlı analiz yapılıyor...</p>
              </div>
            ) : analysis ? (
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Analiz Sonuçları</h2>
                
                {/* Score Cards */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="text-center p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl">
                    <div 
                      className="text-5xl font-bold mb-2"
                      style={{ color: getScoreColor(analysis.overallScore) }}
                    >
                      {analysis.overallScore}/10
                    </div>
                    <p className="text-gray-600 font-semibold">Genel Skor</p>
                  </div>
                  
                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl">
                    <div className="text-4xl font-bold mb-2 text-green-600">
                      {analysis.sentiment}/10
                    </div>
                    <p className="text-gray-600 font-semibold">Duygu</p>
                  </div>
                  
                  <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
                    <div className="text-4xl font-bold mb-2 text-blue-600">
                      {analysis.resolution}/10
                    </div>
                    <p className="text-gray-600 font-semibold">Çözüm</p>
                  </div>
                  
                  <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
                    <div className="text-4xl font-bold mb-2 text-purple-600">
                      {analysis.agentPerformance}/10
                    </div>
                    <p className="text-gray-600 font-semibold">Temsilci</p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Metrikler</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Yanıt Süresi:</span>
                      <span className="ml-2 font-semibold">{analysis.metrics.responseTime}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Empati:</span>
                      <span className="ml-2 font-semibold">{analysis.metrics.empathyLevel}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Çözüldü:</span>
                      <span className="ml-2 font-semibold">
                        {analysis.metrics.problemResolved ? '✓ Evet' : '✗ Hayır'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Duygu:</span>
                      <span className="ml-2 font-semibold">{analysis.metrics.customerEmotion}</span>
                    </div>
                  </div>
                </div>

                {/* Insights */}
                {analysis.insights && analysis.insights.length > 0 && (
                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">AI Önerileri</h3>
                    <div className="space-y-2">
                      {analysis.insights.map((insight, idx) => (
                        <div key={idx} className={`p-3 rounded-lg ${
                          insight.type === 'success' ? 'bg-green-100' :
                          insight.type === 'warning' ? 'bg-orange-100' :
                          'bg-blue-100'
                        }`}>
                          <p className="text-sm text-gray-700">{insight.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chart */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-800">Skor Dağılımı</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={[
                      { name: 'Duygu', skor: analysis.sentiment },
                      { name: 'Çözüm', skor: analysis.resolution },
                      { name: 'Temsilci', skor: analysis.agentPerformance },
                      { name: 'Genel', skor: analysis.overallScore }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Bar dataKey="skor" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <Activity className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Henüz analiz yapılmadı</p>
                <p className="text-sm text-gray-400 mt-2">
                  {liveMode 
                    ? 'Canlı mod aktif - Her mesajda otomatik analiz yapılacak'
                    : 'Konuşma ekleyin ve "Analiz Et" butonuna basın'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;