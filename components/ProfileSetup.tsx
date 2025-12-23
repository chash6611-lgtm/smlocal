
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types.ts';
import { X, Calendar, User as UserIcon, Clock, Bell } from 'lucide-react';

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="relative p-8 max-h-[90vh] overflow-y-auto scrollbar-hide">
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
          >
            <X size={20} />
          </button>

          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <UserIcon size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">사용자 프로필 설정</h2>
            <p className="text-gray-500 text-sm mt-1">정확한 운세와 알림 서비스를 위해<br/>정보를 입력해주세요.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">이름</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl py-3 pl-11 text-gray-800 placeholder:text-gray-300 transition-all"
                    placeholder="본인의 이름을 입력하세요"
                    required
                  />
                  <UserIcon className="absolute left-4 top-3.5 text-gray-300" size={18} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">생년월일</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl py-3 pl-11 text-gray-800 text-sm transition-all"
                      required
                    />
                    <Calendar className="absolute left-4 top-3.5 text-gray-300" size={18} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1">태어난 시간</label>
                  <div className="relative">
                    <input 
                      type="time" 
                      value={birthTime}
                      onChange={(e) => setBirthTime(e.target.value)}
                      className="w-full bg-gray-50 border-none focus:ring-2 focus:ring-indigo-500 rounded-2xl py-3 pl-11 text-gray-800 text-sm transition-all"
                    />
                    <Clock className="absolute left-4 top-3.5 text-gray-300" size={18} />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Bell className={notifEnabled ? "text-indigo-600" : "text-gray-400"} size={20} />
                  <span className="text-sm font-bold text-gray-700">데일리 리마인더 알림</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotif}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${notifEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              
              {notifEnabled && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">알림 예약 시간</label>
                  <div className="relative">
                    <input 
                      type="time" 
                      value={notifTime}
                      onChange={(e) => setNotifTime(e.target.value)}
                      className="w-full bg-white border-none focus:ring-2 focus:ring-indigo-500 rounded-xl py-2 px-4 text-sm font-bold text-indigo-700 transition-all shadow-sm"
                    />
                  </div>
                  <p className="mt-3 text-[10px] text-indigo-400/80 leading-relaxed font-medium">
                    * 설정하신 시간에 오늘의 운세와 할 일을 브라우저 알림으로 요약하여 알려드립니다. 알림 수신을 위해 브라우저 창이 열려있어야 합니다.
                  </p>
                </div>
              )}
            </div>

            <button 
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98] mt-2"
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
