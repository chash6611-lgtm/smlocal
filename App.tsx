
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
 * 한국 표준 24절기 통합 매핑 테이블
 * 중복된 키를 제거하고 정확한 명칭으로 매핑합니다.
 */
const JIE_QI_MAP: Record<string, string> = {
  // 1. Traditional Chinese (Standard)
  '立春': '입춘', '雨水': '우수', '驚蟄': '경칩', '春分': '춘분', '淸明': '청명', '穀雨': '곡우',
  '立夏': '입하', '小滿': '소만', '芒種': '망종', '夏至': '하지', '小暑': '소서', '大暑': '대서',
  '立秋': '입추', '處暑': '처서', '白露': '백로', '秋分': '추분', '寒露': '한로', '霜降': '상강',
  '立冬': '입동', '小雪': '소설', '大雪': '대설', '冬至': '동지', '小寒': '소한', '大寒': '대한',

  // 2. Simplified Chinese (If different)
  '惊蛰': '경칩', '清明': '청명', '谷雨': '곡우', '小满': '소만', '芒种': '망종', '处暑': '처서',

  // 3. English (SNAKE_CASE)
  'LI_CHUN': '입춘', 'YU_SHUI': '우수', 'JING_ZHE': '경칩', 'CHUN_FEN': '춘분', 'QING_MING': '청명', 'GU_YU': '곡우',
  'LI_XIA': '입하', 'XIAO_MAN': '소만', 'MANG_ZHONG': '망종', 'XIA_ZHI': '하지', 'XIAO_SHU': '소서', 'DA_SHU': '대서',
  'LI_QIU': '입추', 'CHU_SHU': '처서', 'BAI_LU': '백로', 'QIU_FEN': '추분', 'HAN_LU': '한로', 'SHUANG_JIANG': '상강',
  'LI_DONG': '입동', 'XIAO_XUE': '소설', 'DA_XUE': '대설', 'DONG_ZHI': '동지', 'XIAO_HAN': '소한', 'DA_HAN': '대한',

  // 4. English (CamelCase)
  'Lichun': '입춘', 'Yushui': '우수', 'Jingzhe': '경칩', 'Chunfen': '춘분', 'Qingming': '청명', 'Guyu': '곡우',
  'Lixia': '입하', 'Xiaoman': '소만', 'Mangzhong': '망종', 'Xiazhi': '하지', 'Xiaoshu': '소서', 'Dashu': '대서',
  'Liqiu': '입추', 'Chushu': '처서', 'Bailu': '백로', 'Qiufen': '추분', 'Hanlu': '한로', 'Shuangjiang': '상강',
  'Lidong': '입동', 'Xiaoxue': '소설', 'Daxue': '대설', 'Dongzhi': '동지', 'Xiaohan': '소한', 'Dahan': '대한'
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

  useEffect(() => {
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
        terms[kstYmd] = JIE_QI_MAP[name] || JIE_QI_MAP[name.toUpperCase()] || name;
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
    if (profile) {
      setLoadingFortune(true);
      try {
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

  const handleSaveProfile = (newProfile: UserProfile) => {
    setProfile(newProfile);
    saveToStorage(allMemos, newProfile);
    setShowProfileModal(false);
  };

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
         <button onClick={() => setShowProfileModal(true)} className="flex items-center space-x-2 text-gray-700 font-bold text-xs">
            <User size={16} className="text-indigo-500" />
            <span>{profile ? profile.name : '프로필 설정'}</span>
         </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
        <div className="flex items-center space-x-6">
          <h2 className="text-3xl font-black text-gray-900">{format(currentDate, 'yyyy년 MM월')}</h2>
          <div className="flex items-center space-x-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-1">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-50 rounded-xl"><ChevronLeft size={20} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-black text-indigo-600">오늘</button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-50 rounded-xl"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white rounded-[40px] p-4 md:p-8 shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
            <div className="grid grid-cols-7 mb-4">
              {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                <div key={day} className={`text-center font-black text-xs ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'}`}>{day}</div>
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
                 
                 const dateColorClass = (dayOfWeek === 0 || holiday) ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-700';

                 return (
                    <div key={i} onClick={() => setSelectedDate(day)} className={`min-h-[110px] md:min-h-[150px] p-2 border-r border-b border-gray-50 cursor-pointer transition-all ${!isCurrentMonth ? 'opacity-20' : 'bg-white'} ${isSelected ? 'bg-indigo-50/50 ring-2 ring-inset ring-indigo-500/10' : 'hover:bg-slate-50'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-black ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : isToday ? 'bg-gray-100' : dateColorClass}`}>
                          {format(day, 'd')}
                        </span>
                        {holiday && <span className="text-[9px] text-red-500 font-black text-right leading-tight max-w-[60px]">{holiday}</span>}
                      </div>
                      <div className="flex flex-col space-y-1 mt-2">
                        <span className="text-[9px] text-gray-400 font-medium">음력 {lunar.getMonth()}.{lunar.getDay()}</span>
                        {jieQi && (
                          <span className="text-[9px] text-indigo-600 font-black bg-indigo-50 px-1.5 py-0.5 rounded-md inline-block w-fit">
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
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[40px] p-10 shadow-2xl">
            <h2 className="text-4xl font-black mb-2">{format(selectedDate, 'M월 d일')}</h2>
            <div className="flex items-center space-x-3 text-indigo-100 font-bold text-xs">
              <span className="bg-white/20 px-3 py-1 rounded-full">{format(selectedDate, 'EEEE', { locale: ko })}</span>
              <span className="flex items-center space-x-1"><Moon size={14} /><span>음력 {getDayDetails(selectedDate).lunar.getMonth()}.{getDayDetails(selectedDate).lunar.getDay()}</span></span>
            </div>
          </div>

          <div className="bg-white rounded-[40px] shadow-2xl p-8 border border-gray-50">
            <div className="flex items-center space-x-2 mb-6 text-indigo-600"><Sparkles size={20} /><h3 className="text-xl font-black">오늘의 운세</h3></div>
            {loadingFortune ? <div className="animate-pulse space-y-2"><div className="h-3 bg-gray-100 rounded w-3/4"></div><div className="h-3 bg-gray-100 rounded w-full"></div></div> : <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">{fortune || (profile ? '운세를 가져오는 중...' : '프로필을 설정해주세요.')}</p>}
          </div>

          <div className="bg-white rounded-[40px] shadow-2xl p-8 border border-gray-50">
            <h3 className="text-lg font-black mb-6 flex items-center space-x-2"><Plus size={18} className="text-indigo-600" /><span>새 기록</span></h3>
            <div className="space-y-4">
              <input type="text" value={newMemo} onChange={(e) => setNewMemo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddMemo()} placeholder="오늘의 아이디어..." className="w-full bg-gray-50 rounded-2xl py-4 px-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none" />
              <div className="flex gap-2">
                {[MemoType.TODO, MemoType.IDEA, MemoType.APPOINTMENT].map(type => (
                  <button key={type} onClick={() => setSelectedType(type)} className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${selectedType === type ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-50 text-gray-400'}`}>
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
                <div key={memo.id} className="group flex items-start justify-between bg-slate-50/50 p-4 rounded-2xl hover:bg-white transition-all border border-transparent hover:border-indigo-100">
                  <div className="flex items-start space-x-3">
                    <button onClick={() => handleToggleMemo(memo.id)} className="mt-1">{memo.completed ? <CheckCircle2 className="text-emerald-500" size={18} /> : <Circle className="text-gray-300" size={18} />}</button>
                    <div>
                      <p className={`text-sm font-bold ${memo.completed ? 'text-gray-300 line-through' : 'text-gray-700'}`}>{memo.content}</p>
                      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">{memo.type}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteMemo(memo.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-rose-500 transition-all"><Trash2 size={14} /></button>
                </div>
              )) : (
                <div className="text-center py-12">
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