
import React, { useState } from 'react';
import { UserProfile } from '../types.ts';
import { X, Calendar, User as UserIcon, Clock, Bell, Sparkles } from 'lucide-react';

interface Props {
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
  currentProfile: UserProfile | null;
}

const ProfileSetup: React.FC<Props> = ({ onSave, onClose, currentProfile }) => {
  const [name, setName] = useState(currentProfile?.name || '');
  const [birthDate, setBirthDate] = useState(currentProfile?.birth_date || '');
  const [birthTime, setBirthTime] = useState(currentProfile?.birth_time || '');
  const [notifEnabled, setNotifEnabled] = useState(currentProfile?.notifications_enabled ?? false);
  const [notifTime, setNotifTime] = useState(currentProfile?.daily_reminder_time || '09:00');

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
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4 bg-gray-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[24px] md:rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
        <div className="relative p-6 md:p-10 max-h-[90vh] overflow-y-auto scrollbar-hide">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 md:top-8 md:right-8 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-100 text-indigo-600 rounded-[28px] flex items-center justify-center mb-4 shadow-inner">
              <UserIcon size={32} />
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">사용자 프로필</h2>
            <p className="text-gray-500 text-sm mt-2 px-4 leading-relaxed font-medium">나에게 딱 맞는 운세와 바이오리듬을 위해 정보를 입력해주세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 ml-1">이름</label>
                <div className="relative group">
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 rounded-2xl py-4 pl-12 text-gray-800 text-sm font-bold placeholder:text-gray-300 transition-all outline-none"
                    placeholder="이름 입력"
                    required
                  />
                  <UserIcon className="absolute left-4 top-4 text-gray-300 group-focus-within:text-indigo-400 transition-colors" size={20} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 ml-1">생년월일</label>
                  <div className="relative group">
                    <input 
                      type="date" 
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 rounded-2xl py-4 pl-12 text-gray-800 text-xs font-bold transition-all outline-none"
                      required
                    />
                    <Calendar className="absolute left-4 top-4 text-gray-300 group-focus-within:text-indigo-400 transition-colors" size={20} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 ml-1">태어난 시간</label>
                  <div className="relative group">
                    <input 
                      type="time" 
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 rounded-2xl py-4 pl-12 text-gray-800 text-xs font-bold transition-all outline-none"
                    />
                    <Clock className="absolute left-4 top-4 text-gray-300 group-focus-within:text-indigo-400 transition-colors" size={20} />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-xl ${notifEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-400'} transition-colors`}>
                      <Bell size={18} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">데일리 리마인더</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleNotif}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${notifEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${notifEnabled ? 'translate-x-6' : 'translate-x-1'} shadow-sm`} />
                  </button>
                </div>
              </div>

              {/* AI 서비스 상태 표시기 (보안 강화 및 자동화 안내) */}
              <div className="p-5 bg-indigo-600 rounded-3xl text-white shadow-xl shadow-indigo-100 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-black block">AI 운세 보안 연결됨</span>
                    <span className="text-[10px] text-indigo-100 opacity-80">시스템 자동 암호화 주입 방식</span>
                  </div>
                </div>
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-sm shadow-emerald-400/50" />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-gray-900 text-white font-black py-5 rounded-2xl hover:bg-black transition-all shadow-xl active:scale-[0.98] text-sm tracking-tight"
            >
              프로필 저장 및 완료
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
