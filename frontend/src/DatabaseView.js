import React, { useState, useEffect } from 'react';
import { Database, Table, FileText, BarChart3, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, XCircle, Filter, X, User, Headset, MessageSquare } from 'lucide-react';

function DatabaseView() {
  const [conversations, setConversations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [resolvedFilter, setResolvedFilter] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const limit = 20;

  useEffect(() => {
    fetchStats();
    fetchConversations();
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [page, categoryFilter, resolvedFilter]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      let url = `http://localhost:8000/api/admin/conversations?limit=${limit}&skip=${page * limit}`;
      if (categoryFilter) url += `&category=${categoryFilter}`;
      if (resolvedFilter !== '') url += `&resolved=${resolvedFilter}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setConversations(data.conversations);
      setTotal(data.total);
    } catch (error) {
      console.error('Conversations fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/admin/database-stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Stats fetch error:', error);
    }
  };

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

  const translateEmpathy = (level) => {
    const levels = {
      'high': 'Yüksek',
      'medium': 'Orta',
      'low': 'Düşük'
    };
    return levels[level] || level;
  };

  const clearFilters = () => {
    setCategoryFilter('');
    setResolvedFilter('');
    setPage(0);
  };

  const totalPages = Math.ceil(total / limit);

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
                    {selectedConversation.overall_score ? (selectedConversation.overall_score * 10).toFixed(1) : 'N/A'}/10
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
                            <span className="text-green-400 font-bold text-xs">TEMSİLCİ</span>
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

      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <Database className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-5xl font-bold text-white">Veritabanı Yönetimi</h1>
              <p className="text-red-500 font-semibold text-lg">Tüm Veriler & İstatistikler</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-red-500" />
              <span className="text-white font-semibold">Filtreler:</span>
            </div>
            
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border-2 border-gray-600 focus:border-red-500"
            >
              <option value="">Tüm Kategoriler</option>
              {(stats?.categories || []).map(cat => (
                <option key={cat.name} value={cat.name}>
                  {translateCategory(cat.name)} ({cat.count})
                </option>
              ))}
            </select>

            <select
              value={resolvedFilter}
              onChange={(e) => { setResolvedFilter(e.target.value); setPage(0); }}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border-2 border-gray-600 focus:border-red-500"
            >
              <option value="">Tüm Durumlar</option>
              <option value="true">Çözülenler</option>
              <option value="false">Çözülmeyenler</option>
            </select>

              {(categoryFilter || resolvedFilter) && (
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  <X className="w-4 h-4" />
                  Filtreleri Temizle
                </button>
              )}

              <button
                onClick={fetchConversations}
                className="ml-auto flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Yenile
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl p-6 shadow-2xl">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto mb-4"></div>
              <p className="text-white text-lg">Yükleniyor...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-700">
                        <th className="text-left text-gray-400 font-semibold py-3 px-3">ID</th>
                        <th className="text-left text-gray-400 font-semibold py-3 px-3">Tarih/Saat</th>
                        <th className="text-left text-gray-400 font-semibold py-3 px-3">Kategori</th>
                        <th className="text-left text-gray-400 font-semibold py-3 px-3">Duygu</th>
                        <th className="text-left text-gray-400 font-semibold py-3 px-3">Durum</th>
                        <th className="text-left text-gray-400 font-semibold py-3 px-3">Skor</th>
                        <th className="text-left text-gray-400 font-semibold py-3 px-3">Empati</th>
                        <th className="text-left text-gray-400 font-semibold py-3 px-3">Müşteri Mesajı</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversations.map((conv) => (
                        <tr 
                          key={conv.id} 
                          onClick={() => {
                            setSelectedConversation(conv);
                            setShowModal(true);
                          }}
                          className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer"
                        >
                          <td className="py-3 px-3 text-gray-400">#{conv.id}</td>
                          <td className="py-3 px-3 text-gray-300">
                            {new Date(conv.timestamp).toLocaleString('tr-TR')}
                          </td>
                          <td className="py-3 px-3">
                            <span className="bg-blue-900/50 border border-blue-600 text-blue-300 px-2 py-1 rounded text-xs">
                              {translateCategory(conv.category)}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-white">{translateEmotion(conv.customer_emotion)}</td>
                          <td className="py-3 px-3">
                            {conv.is_resolved ? (
                              <span className="flex items-center gap-1 text-green-400">
                                <CheckCircle className="w-4 h-4" />
                                Çözüldü
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-red-400">
                                <XCircle className="w-4 h-4" />
                                Bekliyor
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-white font-bold">
                            {conv.overall_score ? (conv.overall_score * 10).toFixed(1) : 'N/A'}/10
                          </td>
                          <td className="py-3 px-3 text-gray-300">{conv.empathy_level || '-'}</td>
                          <td className="py-3 px-3 text-gray-300 max-w-md truncate">
                            {conv.customer_message?.substring(0, 100)}...
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {conversations.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                      Hiç konuşma kaydı bulunamadı
                    </div>
                  )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t-2 border-gray-700">
              <div className="text-gray-400">
                Toplam <span className="text-white font-bold">{total}</span> kayıt bulundu
                {` (Sayfa ${page + 1} / ${totalPages})`}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Önceki
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                >
                  Sonraki
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>  
  ); 
}

export default DatabaseView;
