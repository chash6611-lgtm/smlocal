
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
  HardDrive
} from 'lucide-react';
import { Lunar, Solar } from 'lunar-javascript';
import { Memo, MemoType, UserProfile, RepeatType } from './types.ts';
import { getHolidays } from './constants.tsx';
import { getFilteredMemos } from './services/supabaseClient.ts';
import { getDailyFortune } from './services/geminiService.ts';
import { fileStorage, getDirectoryHandle } from './services/fileSystemService.ts';
import BiorhythmChart from './components/BiorhythmChart.tsx';
import ProfileSetup from './components/ProfileSetup.tsx';

/**
 * 한국 표준 24절기 통합 매핑 테이블 (Normalization 적용 버전)
 * 모든 형태의 입력(한자, 영문 대소문자, 언더바 포함/미포함)을 한글로 변환합니다.
 */
const JIE_QI_MAP: Record<string, string> = {
  '立春': '입춘', '雨水': '우수', '驚蟄': '경칩', '惊蛰': '경칩', '春分': '춘분', '淸明': '청명', '清明': '청명', '穀雨': '곡우', '谷雨': '곡우',
  '立夏': '입하', '小滿': '소만', '小满': '소만', '芒種': '망종', '芒종': '망종', '夏至': '하지', '小暑': '소서', '大暑': '대서',
  '立秋': '입추', '處暑': '처서', '处暑': '처서', '白露': '백로', '秋분': '추분', '秋分': '추분', '寒露': '한로', '霜降': '상강',
  '立冬': '입동', '小雪': '소설', '大雪': '대설', '冬至': '동지', '小寒': '소한', '大寒': '대한',
  
  // 영문 정규화 대응 (JINGZHE, JING_ZHE 등)
  'LICHUN': '입춘', 'YUSHUI': '우수', 'JINGZHE': '경칩', 'CHUNFEN': '춘분', 'QINGMING': '청명', 'GUYU': '곡우',
  'LIXIA': '입하', 'XIAOMAN': '소만', 'MANGZHONG': '망종', 'XIAZHI': '하지', 'XIAOSHU': '소서', 'DASHU': '대서',
  'LIQIU': '입추', 'CHUSHU': '처서', 'BAILU': '백로', 'QIUFEN': '추분', 'HANLU': '한로', 'SHUANGJIANG': '상강',
  'LIDONG': '입동', 'XIAOXUE': '소설', 'DAXUE': '대설', 'DONGZHI': '동지', 'XIAOHAN': '소한', 'DAHAN': '대한'
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
  
  // API 키가 업데이트될 때마다 수동 주입 (geminiService 호환용)
  const updateApiKey = (key: string) => {
    if (key) {
      (window as any).process = (window as any).process || { env: {} };
      (window as any).process.env.API_KEY = key;
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) updateApiKey(savedKey);
    
    if (isFallbackMode) {
      const savedMemos = localStorage.getItem('fallback_memos');
      const savedProfile = localStorage.getItem('user_profile');
      if (savedMemos) setAllMemos(JSON.parse(savedMemos));
      if (savedProfile) setProfile(JSON.parse(savedProfile));
    }
  }, [isFallbackMode]);

  const holidayMap = useMemo(() => getHolidays(currentDate.getFullYear()), [currentDate.getFullYear()]);

  const kstJieQiMap = useMemo(() => {
    const year = currentDate.getFullYear();
    const terms: Record<string, string> = {};
    const l = Lunar.fromYmd(year, 1, 1);
    const jieQiTable = l.getJieQiTable();
    
    Object.keys(jieQiTable).forEach((name: string) => {
      const solar = (jieQiTable as any)[name] as Solar;
      if (solar) {
        const dateObj = new Date(solar.getYear(), solar.getMonth() - 1, solar.getDay());
        const kstYmd = format(dateObj, 'yyyy-MM-dd');
        
        // 정규화: 모든 비교 대상을 대문자, 언더바 제거 상태로 통일
        const cleanName = name.trim();
        const upperName = cleanName.toUpperCase().replace(/_/g, '');
        
        terms[kstYmd] = JIE_QI_MAP[cleanName] || JIE_QI_MAP[upperName] || cleanName;
      }
    });
    return terms;
  }, [currentDate.getFullYear()]);

  const getDayDetails = useCallback((date: Date) => {
    const lunar = Lunar.fromDate(date);
    const dateKey = format(date, 'yyyy-MM-dd');
    const holiday = holidayMap[dateKey] || null;
    const jieQi = kstJieQiMap[dateKey] || null;
    return { holiday, jieQi, lunar };
  }, [holidayMap, kstJieQiMap]);

  const handleConnectFolder = async () => {
    const { handle, error } = await getDirectoryHandle();
    if (error) {
      alert(error);
      return;
    }
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
    if (profile) {
      setLoadingFortune(true);
      try {
        // 호출 시점에 최신 API 키 확인
        const result = await getDailyFortune(profile.birth_date, profile.birth_time, format(selectedDate, 'yyyy-MM-dd'));
        setFortune(result);
      } catch (err) { 
        setFortune("운세를 불러오지 못했습니다."); 
      } finally { 
        setLoadingFortune(false); 
      }
    }
  }, [selectedDate, profile]);

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

  const handleToggleMemo = (id: string) => {
    const updated = allMemos.map(m => m.id === id ? { ...m, completed: !m.completed } : m);
    setAllMemos(updated);
    saveToStorage(updated);
  };

  const handleDeleteMemo = (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    const updated = allMemos.filter(m => m.id !== id);
    setAllMemos(updated);
    saveToStorage(updated);
  };

  const handleSaveProfile = (newProfile: UserProfile, newApiKey?: string) => {
    if (newApiKey) updateApiKey(newApiKey);
    setProfile(newProfile);
    saveToStorage(allMemos, newProfile);
    setShowProfileModal(false);
    fetchFortune(); // 프로필 저장 후 운세 즉시 갱신
  };

  const currentDayMemos = useMemo(() => getFilteredMemos(allMemos, selectedDate), [allMemos, selectedDate]);

  if (!dirHandle && !isFallbackMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-[48px] shadow-2xl p-12 text-center space-y-10 border border-white animate-in fade-in zoom-in duration-500">
          <div className="w-28 h-28 bg-indigo-600 rounded-[36px] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-200">
            <HardDrive size={52} className="text-white" />
          </div>
          <div className="space-y-4">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Smart Memo</h1>
            <p className="text-gray-500 font-medium leading-relaxed">
              데이터 보관을 위한 로컬 폴더를 연결해주세요.
            </p>
          </div>
          <button onClick={handleConnectFolder} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[24px] shadow-xl hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3">
            <FolderOpen size={20} />
            <span>로컬 저장소 연결하기</span>
          </button>
          <button onClick={() => setIsFallbackMode(true)} className="text-sm text-gray-400 font-bold hover:underline">브라우저 임시 저장소 사용하기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-12">
      <div className="flex items-center justify-between mb-8 bg-white/80 backdrop-blur-md px-6 py-3 rounded-3xl border border-gray-100 shadow-sm">
         <div className="flex items-center space-x-2 font-black text-xs text-indigo-600">
           <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
           <span>{dirHandle ? '로컬 모드' : '브라우저 모드'}</span>
         </div>
         <button onClick={() => setShowProfileModal(true)} className="flex items-center space-x-2 text-gray-700 font-bold text-xs hover:text-indigo-600 transition-colors">
            <User size={16} className="text-indigo-500" />
            <span>{profile ? profile.name : '프로필 설정'}</span>
         </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div className="flex items-center space-x-6">
          <h2 className="text-3xl font-black text-gray-900">{format(currentDate, 'yyyy년 MM월')}</h2>
          <div className="flex items-center space-x-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-1">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-black text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors">오늘</button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-50 rounded-xl transition-colors"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[40px] p-4 md:p-8 shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
            <div className="grid grid-cols-7 mb-4">
              {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                <div key={day} className={`text-center font-black text-xs uppercase tracking-widest ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'}`}>{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 border-t border-l border-gray-50 rounded-3xl overflow-hidden">
               {Array.from({ length: 42 }).map((_, i) => {
                 const day = addDays(startOfWeek(startOfMonth(currentDate)), i);
                 const { holiday, jieQi, lunar } = getDayDetails(day);
                 const isSelected = isSameDay(day, selectedDate);
                 const isToday = isSameDay(day, new Date());
                 const isCurrentMonth = isSameMonth(day, currentDate);
                 const dayOfWeek = getDay(day);
                 
                 const dateColorClass = (dayOfWeek === 0 || holiday !== null) ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700';

                 return (
                    <div key={i} onClick={() => setSelectedDate(day)} className={`min-h-[110px] md:min-h-[150px] p-2 border-r border-b border-gray-50 cursor-pointer transition-all ${!isCurrentMonth ? 'opacity-20' : 'bg-white'} ${isSelected ? 'bg-indigo-50/50 ring-2 ring-inset ring-indigo-500/10' : 'hover:bg-slate-50'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-black transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : isToday ? 'bg-gray-100' : dateColorClass}`}>
                          {format(day, 'd')}
                        </span>
                        {holiday && (
                          <span className="text-[9px] text-red-500 font-black text-right leading-tight max-w-[60px]">
                            {holiday}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col space-y-1 mt-2">
                        <span className="text-[9px] text-gray-400 font-medium">음력 {lunar.getMonth()}.{lunar.getDay()}</span>
                        {jieQi && (
                          <span className="text-[9px] text-indigo-600 font-black bg-indigo-50 px-2 py-1 rounded-md inline-block w-fit shadow-sm border border-indigo-100/50">
                            {jieQi}
                          </span>
                        )}
                      </div>
                    </div>
                 );
               })}
            </div>
          </div>
          {profile && (
            <div className="bg-white rounded-[40px] shadow-2xl p-8 border border-gray-50">
              <div className="flex items-center space-x-2 mb-8"><Activity className="text-indigo-600" size={24} /><h3 className="text-2xl font-black">바이오리듬</h3></div>
              <BiorhythmChart birthDate={profile.birth_date} targetDate={selectedDate} />
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
            <h2 className="text-4xl font-black mb-2 relative z-10">{format(selectedDate, 'M월 d일')}</h2>
            <div className="flex items-center space-x-3 text-indigo-100 font-bold text-xs relative z-10">
              <span className="bg-white/20 px-3 py-1 rounded-full">{format(selectedDate, 'EEEE', { locale: ko })}</span>
              <span className="flex items-center space-x-1"><Moon size={14} /><span>음력 {getDayDetails(selectedDate).lunar.getMonth()}.{getDayDetails(selectedDate).lunar.getDay()}</span></span>
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-2xl p-8 border border-gray-50 min-h-[160px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2 text-indigo-600"><Sparkles size={20} /><h3 className="text-xl font-black">오늘의 운세</h3></div>
            </div>
            {loadingFortune ? (
              <div className="animate-pulse space-y-3">
                <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded w-full"></div>
              </div>
            ) : (
              <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap font-medium animate-in fade-in duration-500">
                {fortune || (profile ? '오늘의 운세를 분석하는 중입니다...' : '프로필에서 API 키를 설정해주세요.')}
              </p>
            )}
          </div>

          <div className="bg-white rounded-[40px] shadow-2xl p-8 border border-gray-50">
            <h3 className="text-lg font-black mb-6 flex items-center space-x-2"><Plus size={18} className="text-indigo-600" /><span>새 기록</span></h3>
            <div className="space-y-4">
              <input 
                type="text" 
                value={newMemo} 
                onChange={(e) => setNewMemo(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddMemo()} 
                placeholder="기록하고 싶은 내용을 입력하세요..." 
                className="w-full bg-gray-50 rounded-2xl py-4 px-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none border border-transparent focus:border-indigo-100" 
              />
              <div className="flex gap-2">
                {[MemoType.TODO, MemoType.IDEA, MemoType.APPOINTMENT].map(type => (
                  <button 
                    key={type} 
                    onClick={() => setSelectedType(type)} 
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all transform active:scale-95 ${selectedType === type ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-2xl p-8 border border-gray-50 min-h-[300px]">
            <h3 className="text-lg font-black mb-6">기록 목록</h3>
            <div className="space-y-3">
              {currentDayMemos.length > 0 ? currentDayMemos.map(memo => (
                <div key={memo.id} className="group flex items-start justify-between bg-slate-50/50 p-4 rounded-2xl hover:bg-white transition-all border border-transparent hover:border-indigo-100 shadow-sm hover:shadow-md">
                  <div className="flex items-start space-x-3">
                    <button onClick={() => handleToggleMemo(memo.id)} className="mt-1 transform hover:scale-110 transition-transform">
                      {memo.completed ? <CheckCircle2 className="text-emerald-500" size={18} /> : <Circle className="text-gray-300" size={18} />}
                    </button>
                    <div>
                      <p className={`text-sm font-bold ${memo.completed ? 'text-gray-300 line-through' : 'text-gray-700'}`}>{memo.content}</p>
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1 block">{memo.type}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteMemo(memo.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-rose-500 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              )) : (
                <div className="text-center py-16">
                  <p className="text-xs text-gray-400 font-bold tracking-tight">기록된 메모가 없습니다.</p>
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
