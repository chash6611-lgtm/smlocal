
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types.ts';
import { X, Calendar, User as UserIcon, Clock, Bell, Send, Key, ExternalLink } from 'lucide-react';

interface Props {
  onSave: (profile: UserProfile, apiKey?: string) => void;
  onClose: () => void;
  currentProfile: UserProfile | null;
}

const ProfileSetup: React.FC<Props> = ({ onSave, onClose, currentProfile }) => {
  const [name, setName] = useState(currentProfile?.name || '');
  const [birthDate, setBirthDate] = useState(currentProfile?.birth_date || '');
  const [birthTime, setBirthTime] = useState(currentProfile?.birth_time || '');
  const [notifEnabled, setNotifEnabled] = useState(currentProfile?.notifications_enabled ?? false);
  const [notifTime, setNotifTime] = useState(currentProfile?.daily_reminder_time || '09:00');
  const [apiKey, setApiKey] = useState(localStorage.getItem('user_gemini_api_key') || '');

  const handleToggleNotif = async () => {
    if (!notifEnabled) {
      if (!("Notification" in window)) {
        alert("이 브라우저는 알림 기능을 지원하지 않습니다.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotifEnabled(true);
      } else {
        alert('알림 권한이 거부되었습니다. 브라우저 설정에서 이 사이트의 알림 권한을 허용해주세요.');
      }
    } else {
      setNotifEnabled(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !birthDate) return;
    onSave({
      id: currentProfile?.id || Math.random().toString(36).substr(2, 9),
      name,
      birth_date: birthDate,
      birth_time: birthTime,
      notifications_enabled: notifEnabled,
      daily_reminder_time: notifTime
    }, apiKey);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4 bg-gray-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="relative p-6 md:p-8 max-h-[90vh] overflow-y-auto scrollbar-hide">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center mb-6 md:mb-8">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <UserIcon size={28} />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">사용자 프로필 설정</h2>
            <p className="text-gray-500 text-xs md:text-sm mt-1 px-4">정확한 운세와 알림 서비스를 위해 정보를 입력해주세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">이름</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl py-3 pl-11 text-gray-800 text-sm placeholder:text-gray-300 transition-all outline-none"
                    placeholder="이름 입력"
                    required
                  />
                  <UserIcon className="absolute left-4 top-3.5 text-gray-300" size={18} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">생년월일</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl py-3 pl-11 text-gray-800 text-xs transition-all outline-none"
                      required
                    />
                    <Calendar className="absolute left-4 top-3.5 text-gray-300" size={18} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">태어난 시간</label>
                  <div className="relative">
                    <input 
                      type="time" 
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className="w-full bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl py-3 pl-11 text-gray-800 text-xs transition-all outline-none"
                    />
                    <Clock className="absolute left-4 top-3.5 text-gray-300" size={18} />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-50">
                <div className="flex items-center justify-between mb-2 px-1">
                  <label className="block text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Gemini API Key</label>
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" className="flex items-center space-x-1 text-[9px] text-gray-400 hover:text-indigo-600 transition-colors">
                    <span>키 발급하기</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
                <div className="relative">
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-indigo-50/30 border border-indigo-100 focus:ring-2 focus:ring-indigo-500 rounded-2xl py-3 pl-11 text-indigo-700 text-xs placeholder:text-indigo-200 transition-all outline-none"
                    placeholder="Google AI Studio API 키를 붙여넣으세요"
                  />
                  <Key className="absolute left-4 top-3.5 text-indigo-300" size={18} />
                </div>
                <p className="text-[9px] text-gray-400 mt-2 px-1 leading-relaxed">입력하신 키는 사용자의 브라우저에만 암호화 저장되어 본인만 사용하게 됩니다.</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50/50 rounded-3xl border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Bell className={notifEnabled ? "text-indigo-600" : "text-gray-400"} size={18} />
                  <span className="text-sm font-bold text-gray-700">데일리 리마인더</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotif}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${notifEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg active:scale-[0.98] text-sm"
            >
              설정 완료
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
