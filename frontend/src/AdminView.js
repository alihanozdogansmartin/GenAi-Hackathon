import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Shield, TrendingUp, MessageSquare, CheckCircle, XCircle, Clock, Users, AlertTriangle, Calendar, X, User, Headset } from 'lucide-react';

function AdminView() {
  const [dashboardData, setDashboardData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchTrendsData();
  }, [selectedDate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/admin/dashboard?date=${selectedDate}T00:00:00`);
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendsData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/trends?days=7');
      const data = await response.json();
      // Memnuniyet skorlarını 10 ile çarp
      if (data.trends) {
        data.trends = data.trends.map(day => ({
          ...day,
          avg_satisfaction: day.avg_satisfaction * 10
        }));
      }
      setTrendsData(data);
    } catch (error) {
      console.error('Trends fetch error:', error);
    }
  };

  const COLORS = ['#E60000', '#FF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'];

  if (loading || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-red-600 mx-auto mb-6"></div>
          <p className="text-white text-xl font-bold">📊 Dashboard Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const { summary, emotion_distribution, hourly_distribution, common_issues, recent_conversations } = dashboardData;

  // Çeviri fonksiyonları
  const translateEmotion = (emotion) => {
    const emotions = {
      'frustrated': 'Sinirli',
      'angry': 'Kızgın',
      'neutral': 'Nötr',
      'satisfied': 'Memnun',
      'happy': 'Mutlu',
      'disappointed': 'Hayal Kırıklığı',
      'anxious': 'Endişeli',
      'confused': 'Şaşkın',
      'interested': 'İlgili',
      'professional': 'Profesyonel',
      'relieved': 'Rahatlamış'
    };
    return emotions[emotion] || emotion;
  };

  const translateEmpathy = (level) => {
    const levels = {
      'high': 'Yüksek',
      'medium': 'Orta',
      'low': 'Düşük'
    };
    return levels[level] || level;
  };

  const translateCategory = (category) => {
    const categories = {
      'internet_speed': 'İnternet Hızı',
      'billing_error': 'Fatura Hatası',
      'number_portability': 'Numara Taşıma',
      'signal_coverage': 'Sinyal Kapsama',
      'data_package': 'İnternet Paketi',
      'tariff_change': 'Tarife Değişikliği',
      'roaming': 'Yurtdışı Dolaşım',
      'corporate_sales': 'Kurumsal Satış',
      'device_problem': 'Cihaz Sorunu',
      'sms_issue': 'SMS Sorunu',
      'fiber_installation': 'Fiber Kurulum',
      'billing_setup': 'Fatura Ayarları',
      'app_connectivity': 'Uygulama Bağlantısı',
      'sim_card': 'SIM Kart',
      'campaign': 'Kampanya',
      '5g_upgrade': '5G Yükseltme',
      'line_suspension': 'Hat Kapatılması',
      'call_dropping': 'Arama Düşmesi',
      'voicemail': 'Sesli Mesaj',
      'billing_installment': 'Fatura Taksitlendirme',
      'live_support': 'Canlı Destek'
    };
    return categories[category] || category;
  };

  // Saatlik dağılım için chart data
  const hourlyData = Object.entries(hourly_distribution || {}).map(([hour, data]) => ({
    hour: `${hour}:00`,
    toplam: data.count,
    çözülen: data.resolved
  }));

  // Duygu dağılımı için chart data
  const emotionData = Object.entries(emotion_distribution || {}).map(([emotion, count]) => ({
    name: translateEmotion(emotion),
    value: count
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      {/* Modal */}
      {showModal && selectedConversation && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border-2 border-red-600 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-900 to-red-800 p-6 rounded-t-3xl border-b-2 border-red-600 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">Görüşme Detayları</h2>
                <p className="text-red-200 text-sm">
                  {new Date(selectedConversation.timestamp).toLocaleString('tr-TR')}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Durum ve Skorlar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700 rounded-xl p-4 border-2 border-gray-600">
                  <div className="text-gray-400 text-sm mb-1">Durum</div>
                  <div className="flex items-center gap-2">
                    {selectedConversation.is_resolved ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-bold">Çözüldü</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-400 font-bold">Beklemede</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-gray-700 rounded-xl p-4 border-2 border-gray-600">
                  <div className="text-gray-400 text-sm mb-1">Genel Skor</div>
                  <div className="text-white font-bold text-2xl">
                    {selectedConversation.overall_score ? (selectedConversation.overall_score * 10).toFixed(1) : 'Belirtilmemiş'}/10
                  </div>
                </div>

                <div className="bg-gray-700 rounded-xl p-4 border-2 border-gray-600">
                  <div className="text-gray-400 text-sm mb-1">Duygu</div>
                  <div className="text-white font-bold text-lg">
                    {selectedConversation.customer_emotion ? translateEmotion(selectedConversation.customer_emotion) : 'Belirtilmemiş'}
                  </div>
                </div>
              </div>

              {/* Konuşma İçeriği */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                  <MessageSquare className="w-5 h-5 text-red-500" />
                  Konuşma İçeriği
                </h3>

                <div className="space-y-3">
                  {(() => {
                    // Mesajları parse et
                    const customerMessages = selectedConversation.customer_message ? selectedConversation.customer_message.split(' | ') : [];
                    const agentMessages = selectedConversation.agent_message ? selectedConversation.agent_message.split(' | ') : [];
                    const maxLength = Math.max(customerMessages.length, agentMessages.length);
                    
                    const messages = [];
                    for (let i = 0; i < maxLength; i++) {
                      if (customerMessages[i]) {
                        messages.push({
                          type: 'customer',
                          content: customerMessages[i]
                        });
                      }
                      if (agentMessages[i]) {
                        messages.push({
                          type: 'agent',
                          content: agentMessages[i]
                        });
                      }
                    }
                    
                    return messages.map((msg, idx) => (
                      msg.type === 'customer' ? (
                        <div key={`msg-${idx}`} className="bg-blue-900/30 border-2 border-blue-600 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-400 font-bold text-xs">MÜŞTERİ</span>
                          </div>
                          <div className="text-white text-sm">
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        <div key={`msg-${idx}`} className="bg-green-900/30 border-2 border-green-600 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Headset className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 font-bold text-xs">TEMSILCİ</span>
                          </div>
                          <div className="text-white text-sm">
                            {msg.content}
                          </div>
                        </div>
                      )
                    ));
                  })()}
                </div>
              </div>

              {/* Ek Bilgiler */}
              {(selectedConversation.response_time || selectedConversation.empathy_level || selectedConversation.category) && (
                <div className="bg-gray-700 rounded-xl p-5 border-2 border-gray-600">
                  <h4 className="text-white font-bold mb-3">Ek Bilgiler</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    {selectedConversation.response_time && (
                      <div>
                        <span className="text-gray-400">Yanıt Süresi:</span>
                        <span className="text-white ml-2 font-semibold">{selectedConversation.response_time}</span>
                      </div>
                    )}
                    {selectedConversation.empathy_level && (
                      <div>
                        <span className="text-gray-400">Empati Seviyesi:</span>
                        <span className="text-white ml-2 font-semibold">{translateEmpathy(selectedConversation.empathy_level)}</span>
                      </div>
                    )}
                    {selectedConversation.category && (
                      <div>
                        <span className="text-gray-400">Kategori:</span>
                        <span className="text-white ml-2 font-semibold">{translateCategory(selectedConversation.category)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-700/50 p-4 rounded-b-3xl border-t-2 border-gray-600">
              <button
                onClick={() => setShowModal(false)}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold transition-colors w-full md:w-auto"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Vodafone Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <div>
                  <h1 className="text-5xl font-bold text-white">Vodafone</h1>
                  <p className="text-red-500 font-semibold text-lg">Yönetici Dashboard</p>
                </div>
              </div>
              <p className="text-gray-300 text-lg ml-20">AI Destekli CallCenter Analytics & Raporlama</p>
            </div>
            
            {/* Tarih Seçici */}
            <div className="bg-gray-800 border-2 border-red-600 rounded-2xl p-4">
              <label className="text-white font-semibold block mb-2 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-red-500" />
                Rapor Tarihi
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg border-2 border-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>
        </div>

        {/* Ana Metrikler */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-red-900 to-red-800 border-2 border-red-600 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <MessageSquare className="w-10 h-10 text-red-200" />
              <span className="text-red-200 text-sm font-semibold">TOPLAM</span>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{summary.total_conversations}</div>
            <div className="text-red-200 text-sm">Günlük Görüşme</div>
          </div>

          <div className="bg-gradient-to-br from-green-900 to-green-800 border-2 border-green-600 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle className="w-10 h-10 text-green-200" />
              <span className="text-green-200 text-sm font-semibold">ÇÖZÜLEN</span>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{summary.resolved_conversations}</div>
            <div className="text-green-200 text-sm">{summary.resolution_rate.toFixed(1)}% Başarı Oranı</div>
          </div>

          <div className="bg-gradient-to-br from-blue-900 to-blue-800 border-2 border-blue-600 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <TrendingUp className="w-10 h-10 text-blue-200" />
              <span className="text-blue-200 text-sm font-semibold">MEMNUNİYET</span>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{(summary.avg_satisfaction * 10).toFixed(1)}/10</div>
            <div className="text-blue-200 text-sm">Ortalama Skor</div>
          </div>

          <div className="bg-gradient-to-br from-purple-900 to-purple-800 border-2 border-purple-600 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-10 h-10 text-purple-200" />
              <span className="text-purple-200 text-sm font-semibold">PERFORMANS</span>
            </div>
            <div className="text-4xl font-bold text-white mb-2">{(summary.avg_performance * 10).toFixed(1)}/10</div>
            <div className="text-purple-200 text-sm">Temsilci Başarısı</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Saatlik Dağılım */}
          <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-red-500" />
              Saatlik Görüşme Dağılımı
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="hour" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '2px solid #E60000', 
                    borderRadius: '12px',
                    color: '#FFF'
                  }} 
                />
                <Legend />
                <Bar dataKey="toplam" fill="#E60000" name="Toplam" radius={[8, 8, 0, 0]} />
                <Bar dataKey="çözülen" fill="#10B981" name="Çözülen" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Duygu Dağılımı */}
          <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-red-500" />
              Müşteri Duygu Analizi
            </h3>
            {emotionData.length > 0 ? (
              <div className="flex flex-col items-center">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={emotionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={110}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {emotionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '2px solid #E60000', 
                        borderRadius: '12px',
                        color: '#FFF'
                      }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-3 mt-4 w-full">
                  {emotionData.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-gray-300 text-sm">
                        {entry.name} <span className="text-white font-bold">({entry.value})</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                Henüz veri yok
              </div>
            )}
          </div>
        </div>

        {/* Haftalık Trend */}
        {trendsData && (
          <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl p-6 shadow-2xl mb-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-red-500" />
              7 Günlük Trend Analizi
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsData.trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '2px solid #E60000', 
                    borderRadius: '12px'
                  }} 
                />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#E60000" strokeWidth={2} name="Toplam Görüşme" />
                <Line type="monotone" dataKey="resolved" stroke="#10B981" strokeWidth={2} name="Çözülen" />
                <Line type="monotone" dataKey="avg_satisfaction" stroke="#3B82F6" strokeWidth={2} name="Memnuniyet" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Ortak Sorunlar */}
        <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl p-6 shadow-2xl mb-8">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            En Sık Karşılaşılan Sorunlar
          </h3>
          <div className="space-y-4">
            {common_issues && common_issues.length > 0 ? (
              common_issues.map((issue, idx) => (
                <div key={idx} className="bg-gray-900 border-2 border-gray-700 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-red-500 font-bold text-xl flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      {translateCategory(issue.category)}
                    </h4>
                    <span className="bg-red-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                      {issue.count} görüşme
                    </span>
                  </div>
                  {issue.examples && issue.examples.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <span className="text-gray-400 text-sm font-semibold">Örnek Konuşmalar:</span>
                      <div className="space-y-2">
                        {issue.examples.map((example, i) => (
                          <div key={i} className="bg-gray-800 border border-gray-600 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-blue-400 mt-1 flex-shrink-0" />
                              <p className="text-gray-300 text-sm">{example.length > 150 ? example.substring(0, 150) + '...' : example}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-400">
                Henüz ortak sorun tespit edilmedi
              </div>
            )}
          </div>
        </div>

        {/* Son Görüşmeler */}
        <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-red-500" />
            Son Görüşmeler
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-700">
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">Zaman</th>
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">Müşteri Mesajı</th>
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">Durum</th>
                  <th className="text-left text-gray-400 font-semibold py-3 px-4">Skor</th>
                </tr>
              </thead>
              <tbody>
                {recent_conversations && recent_conversations.length > 0 ? (
                  recent_conversations.map((conv) => (
                    <tr 
                      key={conv.id} 
                      onClick={() => {
                        setSelectedConversation(conv);
                        setShowModal(true);
                      }}
                      className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-4 text-gray-300 text-sm">
                        {new Date(conv.timestamp).toLocaleTimeString('tr-TR')}
                      </td>
                      <td className="py-4 px-4 text-white">
                        {conv.customer_message || 'Mesaj yok'}
                      </td>
                      <td className="py-4 px-4">
                        {conv.is_resolved ? (
                          <span className="flex items-center gap-2 text-green-400">
                            <CheckCircle className="w-5 h-5" />
                            Çözüldü
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-red-400">
                            <XCircle className="w-5 h-5" />
                            Beklemede
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold">
                            {conv.overall_score ? (conv.overall_score * 10).toFixed(1) : 'Yok'}/10
                          </span>
                          <div className={`w-2 h-2 rounded-full ${
                            (conv.overall_score * 10) >= 8 ? 'bg-green-500' :
                            (conv.overall_score * 10) >= 6 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="py-10 text-center text-gray-400">
                      Henüz görüşme kaydı yok
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminView;
