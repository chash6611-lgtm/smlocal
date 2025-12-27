
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  startOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  getDay
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  User, 
  Activity,
  Sparkles,
  Moon,
  FolderOpen,
  HardDrive,
  Key,
  AlertCircle
} from 'lucide-react';
import { Lunar, Solar } from 'lunar-javascript';
import { Memo, MemoType, UserProfile, RepeatType } from './types.ts';
import { SOLAR_HOLIDAYS } from './constants.tsx';
import { getFilteredMemos } from './services/supabaseClient.ts';
import { getDailyFortune } from './services/geminiService.ts';
import { fileStorage, getDirectoryHandle } from './services/fileSystemService.ts';
import BiorhythmChart from './components/BiorhythmChart.tsx';
import ProfileSetup from './components/ProfileSetup.tsx';

// 사용자가 입력한 API 키를 시스템 변수에 주입하는 유틸리티
const injectApiKey = (key: string) => {
  if (key) {
    (window as any).process = (window as any).process || { env: {} };
    (window as any).process.env.API_KEY = key;
  }
};

const JIE_QI_MAP: Record<string, string> = {
  '立春': '입춘', '雨水': '우수', '驚蟄': '경칩', '春분': '춘분', '淸明': '청명', '穀雨': '곡우',
  '立夏': '입하', '小滿': '소만', '芒종': '망종', '夏至': '하지', '小暑': '소서', '大暑': '대서',
  '立秋': '입추', '處暑': '처서', '白露': '백로', '秋分': '추분', '寒露': '한로', '霜강': '상강',
  '立冬': '입동', '小雪': '소설', '大雪': '대설', '冬至': '동지', '小寒': '소한', '大寒': '대한'
};

const App: React.FC = () => {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [allMemos, setAllMemos] = useState<Memo[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [newMemo, setNewMemo] = useState('');
  const [selectedType, setSelectedType] = useState<MemoType>(MemoType.TODO);
  const [fortune, setFortune] = useState<string>('');
  const [loadingFortune, setLoadingFortune] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [userApiKey, setUserApiKey] = useState<string>(localStorage.getItem('user_gemini_api_key') || '');

  // 앱 시작 시 저장된 키가 있다면 주입
  useEffect(() => {
    if (userApiKey) injectApiKey(userApiKey);
  }, [userApiKey]);

  useEffect(() => {
    if (isFallbackMode) {
      const savedMemos = localStorage.getItem('fallback_memos');
      const savedProfile = localStorage.getItem('user_profile');
      if (savedMemos) setAllMemos(JSON.parse(savedMemos));
      if (savedProfile) setProfile(JSON.parse(savedProfile));
    }
  }, [isFallbackMode]);

  const handleConnectFolder = async () => {
    const { handle } = await getDirectoryHandle();
    if (handle) {
      setDirHandle(handle);
      setIsFallbackMode(false);
      setLoading(true);
      try {
        const loadedMemos = await fileStorage.loadMemos(handle);
        const loadedProfile = await fileStorage.loadProfile(handle);
        setAllMemos(loadedMemos);
        if (loadedProfile) setProfile(loadedProfile);
      } catch (err) {
        console.error("데이터 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const saveToStorage = async (memos: Memo[], updatedProfile?: UserProfile) => {
    if (dirHandle) {
      await fileStorage.saveMemos(dirHandle, memos);
      if (updatedProfile) await fileStorage.saveProfile(dirHandle, updatedProfile);
    } else {
      localStorage.setItem('fallback_memos', JSON.stringify(memos));
      if (updatedProfile) localStorage.setItem('user_profile', JSON.stringify(updatedProfile));
    }
  };

  const fetchFortune = useCallback(async () => {
    if (profile && (userApiKey || process.env.API_KEY)) {
      setLoadingFortune(true);
      try {
        const result = await getDailyFortune(profile.birth_date, profile.birth_time, format(selectedDate, 'yyyy-MM-dd'));
        setFortune(result);
      } catch (err: any) { 
        setFortune("운세를 불러오지 못했습니다. 프로필의 API 키를 다시 확인해주세요."); 
      } finally { 
        setLoadingFortune(false); 
      }
    } else {
      setFortune("");
    }
  }, [selectedDate, profile, userApiKey]);

  useEffect(() => { fetchFortune(); }, [fetchFortune]);

  const handleAddMemo = async () => {
    if (!newMemo.trim()) return;
    const memo: Memo = {
      id: crypto.randomUUID(),
      user_id: 'local_user',
      date: format(selectedDate, 'yyyy-MM-dd'),
      type: selectedType,
      content: newMemo,
      completed: false,
      created_at: new Date().toISOString(),
      repeat_type: RepeatType.NONE,
    };
    const updatedMemos = [memo, ...allMemos];
    setAllMemos(updatedMemos);
    await saveToStorage(updatedMemos);
    setNewMemo('');
  };

  const handleToggleMemo = async (id: string) => {
    const updated = allMemos.map(m => m.id === id ? { ...m, completed: !m.completed } : m);
    setAllMemos(updated);
    await saveToStorage(updated);
  };

  const handleDeleteMemo = async (id: string) => {
    if (!confirm('기록을 삭제하시겠습니까?')) return;
    const updated = allMemos.filter(m => m.id !== id);
    setAllMemos(updated);
    await saveToStorage(updated);
  };

  const handleSaveProfile = async (newProfile: UserProfile, apiKey?: string) => {
    setProfile(newProfile);
    if (apiKey !== undefined) {
      localStorage.setItem('user_gemini_api_key', apiKey);
      setUserApiKey(apiKey);
      injectApiKey(apiKey);
    }
    await saveToStorage(allMemos, newProfile);
    setShowProfileModal(false);
    fetchFortune();
  };

  const kstJieQiMap = useMemo(() => {
    const year = currentDate.getFullYear();
    const terms: Record<string, string> = {};
    const l = Lunar.fromYmd(year, 1, 1);
    const jieQiTable = l.getJieQiTable();
    Object.keys(jieQiTable).forEach((name: string) => {
      const solar = (jieQiTable as any)[name] as Solar;
      if (solar) {
        const kstYmd = format(new Date(solar.toYmdHms().replace(' ', 'T') + '+08:00'), 'yyyy-MM-dd');
        terms[kstYmd] = JIE_QI_MAP[name] || name;
      }
    });
    return terms;
  }, [currentDate.getFullYear()]);

  const getDayDetails = useCallback((date: Date) => {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    const lunar = Lunar.fromDate(d);
    const dateKey = format(date, 'yyyy-MM-dd');
    const mmdd = format(date, 'MM-dd');
    const holiday = SOLAR_HOLIDAYS[mmdd] || null;
    const jieQi = kstJieQiMap[dateKey] || null;
    let dynamicHoliday = null;
    if (lunar.getMonth() === 1 && lunar.getDay() === 1) dynamicHoliday = '설날';
    else if (lunar.getMonth() === 8 && lunar.getDay() === 15) dynamicHoliday = '추석';
    return { holiday, dynamicHoliday, jieQi, lunar };
  }, [kstJieQiMap]);

  const currentDayMemos = useMemo(() => getFilteredMemos(allMemos, selectedDate), [allMemos, selectedDate]);

  if (!dirHandle && !isFallbackMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-[48px] shadow-2xl p-12 text-center space-y-10 border border-white">
          <div className="w-28 h-28 bg-indigo-600 rounded-[36px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200">
            <HardDrive size={52} className="text-white" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Smart Memo</h1>
            <p className="text-gray-500 font-medium leading-relaxed">
              데이터 유실 방지를 위해 로컬 폴더(<span className="text-indigo-600 font-bold">smartmemo</span>)를 연결해주세요.
            </p>
          </div>
          <div className="space-y-3">
            <button onClick={handleConnectFolder} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[24px] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3 active:scale-[0.98]">
              <FolderOpen size={20} />
              <span>로컬 저장소 연결하기</span>
            </button>
            <button onClick={() => setIsFallbackMode(true)} className="w-full bg-white text-gray-500 font-bold py-4 rounded-[24px] border border-gray-100 hover:bg-gray-50 transition-all text-sm">
              임시 브라우저 저장소 사용
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-12 animate-in fade-in duration-700">
      <div className="flex items-center justify-between mb-6 bg-white/80 backdrop-blur-md px-6 py-3 rounded-3xl border border-gray-100 shadow-sm">
         <div className="flex items-center space-x-4">
           <div className={`flex items-center space-x-2 font-black text-xs ${dirHandle ? 'text-emerald-600' : 'text-amber-500'}`}>
             <div className={`w-2.5 h-2.5 rounded-full ${dirHandle ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
             <span>{dirHandle ? '로컬 폴더 연동 중' : '브라우저 모드'}</span>
           </div>
         </div>
         <button onClick={() => setShowProfileModal(true)} className="flex items-center space-x-2 text-gray-700 font-bold text-xs hover:text-indigo-600 transition-colors">
            <User size={16} className="text-indigo-500" />
            <span>{profile ? profile.name : '프로필 설정'}</span>
         </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 space-y-4 md:space-y-0">
        <div className="flex items-center space-x-6">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter">{format(currentDate, 'yyyy년 MM월')}</h2>
          <div className="flex items-center space-x-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-1.5">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-50 rounded-xl transition-all"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-lg">오늘</button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-50 rounded-xl transition-all"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[40px] p-4 md:p-8 shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
            <div className="grid grid-cols-7 mb-4 border-b border-gray-50 pb-4">
              {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                <div key={day} className={`text-center font-black text-xs ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'}`}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-t border-l border-gray-50 rounded-3xl overflow-hidden">
               {Array.from({ length: 42 }).map((_, i) => {
                 const day = addDays(startOfWeek(startOfMonth(currentDate)), i);
                 const { holiday, dynamicHoliday } = getDayDetails(day);
                 const isSelected = isSameDay(day, selectedDate);
                 const isToday = isSameDay(day, new Date());
                 const isCurrentMonth = isSameMonth(day, currentDate);
                 return (
                    <div key={i} onClick={() => setSelectedDate(day)} className={`min-h-[100px] md:min-h-[140px] p-3 border-r border-b border-gray-50 cursor-pointer transition-all ${!isCurrentMonth ? 'opacity-20 bg-gray-50' : 'bg-white'} ${isSelected ? 'bg-indigo-50/50 ring-2 ring-inset ring-indigo-500/10' : 'hover:bg-slate-50'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-black ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : isToday ? 'bg-gray-100 text-gray-900' : (getDay(day) === 0 || holiday || dynamicHoliday) ? 'text-red-500' : 'text-gray-700'}`}>
                          {format(day, 'd')}
                        </span>
                        {(holiday || dynamicHoliday) && <span className="text-[9px] text-red-500 font-black text-right leading-tight max-w-[50px]">{holiday || dynamicHoliday}</span>}
                      </div>
                    </div>
                 );
               })}
            </div>
          </div>
          {profile && (
            <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/40 p-8 border border-gray-50">
              <div className="flex items-center space-x-2 mb-8"><Activity className="text-indigo-600" size={24} /><h3 className="text-2xl font-black">바이오리듬</h3></div>
              <BiorhythmChart birthDate={profile.birth_date} targetDate={selectedDate} />
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden">
            <h2 className="text-4xl font-black mb-2">{format(selectedDate, 'M월 d일')}</h2>
            <div className="flex items-center space-x-3 text-indigo-100 font-bold">
              <span className="bg-white/20 px-4 py-1.5 rounded-full text-xs">{format(selectedDate, 'EEEE', { locale: ko })}</span>
              <span className="flex items-center space-x-1 text-xs"><Moon size={14} /><span>음력 {getDayDetails(selectedDate).lunar.getMonth()}.{getDayDetails(selectedDate).lunar.getDay()}</span></span>
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/40 p-8 border border-gray-50">
            <div className="flex items-center space-x-2 mb-6 text-[#6366f1]"><Sparkles size={20} /><h3 className="text-xl font-black">오늘의 운세</h3></div>
            {loadingFortune ? (
              <div className="animate-pulse space-y-3"><div className="h-4 bg-gray-50 rounded w-3/4"></div><div className="h-4 bg-gray-50 rounded w-full"></div></div>
            ) : (
              <div className="space-y-4">
                {fortune ? (
                  <p className="text-gray-600 text-xs md:text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {fortune}
                  </p>
                ) : (
                  <div className="flex flex-col items-center text-center py-6 space-y-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                      <Key size={24} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-900">API 키가 필요합니다</p>
                      <p className="text-xs text-slate-500 leading-relaxed">프로필 설정에서 고유 API 키를 입력하면<br/>맞춤형 AI 운세를 확인하실 수 있습니다.</p>
                    </div>
                    <button 
                      onClick={() => setShowProfileModal(true)}
                      className="text-xs font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-full hover:bg-indigo-100 transition-colors"
                    >
                      API 키 설정하러 가기
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/40 p-8 border border-gray-50">
            <h3 className="text-lg font-black mb-6 flex items-center space-x-2"><Plus size={18} className="text-indigo-600" /><span>새 기록</span></h3>
            <div className="space-y-4">
              <input type="text" value={newMemo} onChange={(e) => setNewMemo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddMemo()} placeholder="오늘의 생각은?" className="w-full bg-gray-50 rounded-2xl py-4 px-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none" />
              <div className="flex gap-2">
                {[MemoType.TODO, MemoType.IDEA, MemoType.APPOINTMENT].map(type => (
                  <button key={type} onClick={() => setSelectedType(type)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${selectedType === type ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-2xl shadow-gray-200/40 p-8 border border-gray-50 min-h-[400px]">
            <h3 className="text-lg font-black mb-8">오늘의 기록</h3>
            <div className="space-y-4">
              {currentDayMemos.length > 0 ? currentDayMemos.map(memo => (
                <div key={memo.id} className="group flex items-start justify-between bg-slate-50/50 p-5 rounded-3xl border border-transparent hover:border-indigo-100 hover:bg-white transition-all shadow-sm">
                  <div className="flex items-start space-x-4 flex-1">
                    <button onClick={() => handleToggleMemo(memo.id)} className="mt-1">{memo.completed ? <CheckCircle2 className="text-emerald-500" size={20} /> : <Circle className="text-gray-300" size={20} />}</button>
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${memo.completed ? 'text-gray-300 line-through' : 'text-gray-700'}`}>{memo.content}</p>
                      <span className={`text-[8px] font-black uppercase tracking-widest mt-2 inline-block px-2 py-0.5 rounded ${memo.type === MemoType.IDEA ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>{memo.type}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteMemo(memo.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                </div>
              )) : (
                <div className="text-center py-20">
                   <p className="text-xs text-gray-400 font-bold">기록이 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showProfileModal && <ProfileSetup onSave={handleSaveProfile} onClose={() => setShowProfileModal(false)} currentProfile={profile} />}
    </div>
  );
};

export default App;
