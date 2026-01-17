import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Phone, User, Headset, Shield, Database } from 'lucide-react';
import CustomerView from './CustomerView';
import AgentView from './AgentView';
import AdminView from './AdminView';
import DatabaseView from './DatabaseView';

function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-red-900 flex items-center justify-center p-8">
      <div className="max-w-5xl w-full">
        {/* Vodafone Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center">
              <Phone className="w-12 h-12 text-white" />
            </div>
            <div>
              <h1 className="text-6xl font-bold text-white">
                Vodafone
              </h1>
              <p className="text-red-500 text-lg font-semibold tracking-wide">AI CallCenter Analytics</p>
            </div>
          </div>
          <p className="text-xl text-gray-300">Yapay Zeka Destekli Müşteri Memnuniyeti & Performans Analizi</p>
          <p className="text-gray-400 mt-2">Lütfen devam etmek için rolünüzü seçin</p>
        </div>

        {/* Kullanıcı Seçim Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Müşteri Kartı */}
          <button
            onClick={() => navigate('/customer')}
            className="group bg-white rounded-3xl shadow-2xl p-10 hover:shadow-red-500/50 transition-all duration-300 hover:-translate-y-3 border-4 border-transparent hover:border-red-600"
          >
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-28 h-28 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <User className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900">Müşteri</h2>
              <p className="text-gray-700 text-lg">
                Vodafone müşteri hizmetlerine ulaşın ve sorunlarınıza çözüm bulun
              </p>
              <div className="pt-4 space-y-3 text-base text-gray-600">
                <p className="flex items-center justify-center gap-2"><span className="text-red-600">●</span> Anlık Mesajlaşma</p>
                <p className="flex items-center justify-center gap-2"><span className="text-red-600">●</span> 7/24 Canlı Destek</p>
                <p className="flex items-center justify-center gap-2"><span className="text-red-600">●</span> Hızlı Çözüm</p>
              </div>
              <div className="pt-6">
                <span className="px-8 py-4 bg-red-600 text-white rounded-full font-bold text-lg group-hover:bg-red-700 transition-colors inline-block shadow-lg">
                  Müşteri Olarak Devam Et
                </span>
              </div>
            </div>
          </button>

          {/* Temsilci Kartı */}
          <button
            onClick={() => navigate('/agent')}
            className="group bg-white rounded-3xl shadow-2xl p-10 hover:shadow-red-500/50 transition-all duration-300 hover:-translate-y-3 border-4 border-transparent hover:border-red-600"
          >
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-28 h-28 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Headset className="w-14 h-14 text-red-500" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900">Müşteri Temsilcisi</h2>
              <p className="text-gray-700 text-lg">
                AI destekli analiz ile müşteri memnuniyetini artırın
              </p>
              <div className="pt-4 space-y-3 text-base text-gray-600">
                <p className="flex items-center justify-center gap-2"><span className="text-red-600">●</span> Gerçek Zamanlı Görüşme</p>
                <p className="flex items-center justify-center gap-2"><span className="text-red-600">●</span> AI Performans Analizi</p>
                <p className="flex items-center justify-center gap-2"><span className="text-red-600">●</span> Akıllı Öneriler</p>
              </div>
              <div className="pt-6">
                <span className="px-8 py-4 bg-gray-900 text-white rounded-full font-bold text-lg group-hover:bg-gray-800 transition-colors inline-block shadow-lg">
                  Temsilci Olarak Devam Et
                </span>
              </div>
            </div>
          </button>

          {/* Yönetici Kartı */}
          <button
            onClick={() => navigate('/admin')}
            className="group bg-white rounded-3xl shadow-2xl p-10 hover:shadow-yellow-500/50 transition-all duration-300 hover:-translate-y-3 border-4 border-transparent hover:border-yellow-500"
          >
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-28 h-28 bg-gradient-to-br from-yellow-600 to-yellow-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Shield className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900">Yönetici</h2>
              <p className="text-gray-700 text-lg">
                Anlatık raporlar, trendler ve AI destekli analiz sonuçları
              </p>
              <div className="pt-4 space-y-3 text-base text-gray-600">
                <p className="flex items-center justify-center gap-2"><span className="text-yellow-600">●</span> Günlük Raporlar</p>
                <p className="flex items-center justify-center gap-2"><span className="text-yellow-600">●</span> Trend Analizi</p>
                <p className="flex items-center justify-center gap-2"><span className="text-yellow-600">●</span> Ortak Sorunlar</p>
              </div>
              <div className="pt-6">
                <span className="px-8 py-4 bg-yellow-600 text-white rounded-full font-bold text-lg group-hover:bg-yellow-700 transition-colors inline-block shadow-lg">
                  Yönetici Olarak Devam Et
                </span>
              </div>
            </div>
          </button>

          {/* Database Kartı */}
          <button
            onClick={() => navigate('/database')}
            className="group bg-white rounded-3xl shadow-2xl p-10 hover:shadow-blue-500/50 transition-all duration-300 hover:-translate-y-3 border-4 border-transparent hover:border-blue-500"
          >
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="w-28 h-28 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <Database className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-4xl font-bold text-gray-900">Veritabanı</h2>
              <p className="text-gray-700 text-lg">
                Tüm konuşmalar, raporlar ve detaylı istatistikler
              </p>
              <div className="pt-4 space-y-3 text-base text-gray-600">
                <p className="flex items-center justify-center gap-2"><span className="text-blue-600">●</span> Tüm Veriler</p>
                <p className="flex items-center justify-center gap-2"><span className="text-blue-600">●</span> Filtreleme</p>
                <p className="flex items-center justify-center gap-2"><span className="text-blue-600">●</span> İstatistikler</p>
              </div>
              <div className="pt-6">
                <span className="px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-lg group-hover:bg-blue-700 transition-colors inline-block shadow-lg">
                  Database'e Git
                </span>
              </div>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-16">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700">
            <p className="text-red-500 font-bold text-lg mb-2">
              🚀 Vodafone GenAI Hackathon 2026
            </p>
            <p className="text-gray-400 text-sm">
              GPT-OSS-20B ile desteklenen gerçek zamanlı AI analiz platformu
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/customer" element={<CustomerView />} />
        <Route path="/agent" element={<AgentView />} />
        <Route path="/admin" element={<AdminView />} />
        <Route path="/database" element={<DatabaseView />} />
      </Routes>
    </Router>
  );
}

export default App;