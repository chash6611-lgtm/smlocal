
import React, { useState } from 'react';
import { UserProfile } from '../types.ts';
import { X, Calendar, User as UserIcon, Clock, Bell, Send } from 'lucide-react';

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

  const handleTestNotification = () => {
    if (!("Notification" in window)) {
      alert("이 브라우저는 알림을 지원하지 않습니다.");
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification('알림 테스트 성공! 🎉', {
        body: '데일리 하모니 알림이 정상적으로 작동하고 있습니다.',
        icon: './icon.svg'
      });
    } else {
      handleToggleNotif();
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
              <UserIcon size={28} md:size={32} />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">사용자 프로필 설정</h2>
            <p className="text-gray-500 text-xs md:text-sm mt-1 px-4">정확한 운세와 알림 서비스를 위해<br className="hidden sm:block"/>정보를 입력해주세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
            <div className="space-y-4 md:space-y-5">
              <div>
                <label className="block text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 ml-1">이름</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl py-2.5 md:py-3 pl-10 md:pl-11 text-gray-800 text-sm placeholder:text-gray-300 transition-all outline-none"
                    placeholder="본인의 이름을 입력하세요"
                    required
                  />
                  <UserIcon className="absolute left-3.5 top-3 md:left-4 md:top-3.5 text-gray-300" size={16} md:size={18} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 ml-1">생년월일</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl py-2.5 md:py-3 pl-10 md:pl-11 text-gray-800 text-xs md:text-sm transition-all outline-none"
                      required
                    />
                    <Calendar className="absolute left-3.5 top-3 md:left-4 md:top-3.5 text-gray-300" size={16} md:size={18} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 ml-1">태어난 시간</label>
                  <div className="relative">
                    <input 
                      type="time" 
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className="w-full bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl py-2.5 md:py-3 pl-10 md:pl-11 text-gray-800 text-xs md:text-sm transition-all outline-none"
                    />
                    <Clock className="absolute left-3.5 top-3 md:left-4 md:top-3.5 text-gray-300" size={16} md:size={18} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 md:p-5 bg-indigo-50/50 rounded-[20px] md:rounded-3xl border border-indigo-100">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="flex items-center space-x-2">
                  <Bell className={notifEnabled ? "text-indigo-600" : "text-gray-400"} size={18} md:size={20} />
                  <span className="text-[13px] md:text-sm font-bold text-gray-700">데일리 리마인더</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotif}
                  className={`relative inline-flex h-5 md:h-6 w-10 md:w-11 items-center rounded-full transition-colors focus:outline-none ${notifEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-3.5 md:h-4 w-3.5 md:w-4 transform rounded-full bg-white transition-transform ${notifEnabled ? 'translate-x-5 md:translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              
              {notifEnabled && (
                <div className="animate-in slide-in-from-top-2 duration-300 space-y-3">
                  <div>
                    <label className="block text-[9px] md:text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 md:mb-2">알림 예약 시간</label>
                    <div className="relative">
                      <input 
                        type="time" 
                        value={notifTime}
                        onChange={(e) => setNotifTime(e.target.value)}
                        className="w-full bg-white border-none focus:ring-2 focus:ring-indigo-500 rounded-xl py-2 px-3 md:px-4 text-xs md:text-sm font-bold text-indigo-700 transition-all shadow-sm outline-none"
                      />
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleTestNotification}
                    className="w-full flex items-center justify-center space-x-2 py-2 bg-white text-indigo-600 text-[11px] font-bold rounded-xl border border-indigo-100 hover:bg-indigo-50 transition-colors"
                  >
                    <Send size={12} />
                    <span>알림 테스트 전송</span>
                  </button>
                </div>
              )}
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-3.5 md:py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98] mt-2 text-sm md:text-base"
            >
              설정 저장하기
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
