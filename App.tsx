
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  parse,
  subMinutes
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Lightbulb, 
  CalendarCheck, 
  ListTodo, 
  User, 
  Activity,
  Sparkles,
  Moon,
  Leaf,
  Bell,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
  Download,
  Upload,
  Database,
  FileCode,
  ShieldCheck,
  AlertCircle,
  Link as LinkIcon,
  Settings
} from 'lucide-react';
import { Lunar } from 'lunar-javascript';
import { Memo, MemoType, UserProfile, RepeatType, ReminderOffset } from './types.ts';
import { SOLAR_HOLIDAYS } from './constants.tsx';
import { getMemosForDate, saveMemoLocal, deleteMemoLocal, toggleMemoLocal, getAllMemosLocal, updateMemoLocal } from './services/supabaseClient.ts';
import { calculateBiorhythm } from './services/biorhythmService.ts';
import { getDailyFortune } from './services/geminiService.ts';
import BiorhythmChart from './components/BiorhythmChart.tsx';
import ProfileSetup from './components/ProfileSetup.tsx';

const JIE_QI_MAP: Record<string, string> = {
  '立春': '입춘', '雨水': '우수', '驚蟄': '경칩', '春분': '춘분', '淸明': '청명', '穀雨': '곡우',
  '立夏': '입하', '小滿': '소만', '芒종': '망종', '夏至': '하지', '小暑': '소서', '大暑': '대서',
  '立秋': '입추', '處暑': '처서', '白露': '백로', '秋분': '취분', '寒露': '한로', '霜강': '상강',
  '立冬': '입동', '小雪': '소설', '大雪': '대설', '冬至': '동지', '小寒': '소한', '大寒': '대한'
};

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [memos, setMemos] = useState<Memo[]>([]);
  const [newMemo, setNewMemo] = useState('');
  const [selectedType, setSelectedType] = useState<MemoType>(MemoType.TODO);
  
  const [hasApiKey, setHasApiKey] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [selectedOffsets, setSelectedOffsets] = useState<ReminderOffset[]>([ReminderOffset.AT_TIME]);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showDataMenu, setShowDataMenu] = useState(false);
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [isFileSystemSupported, setIsFileSystemSupported] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [fortune, setFortune] = useState<string>('');
  const [loadingFortune, setLoadingFortune] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const checkApiKeyStatus = useCallback(async () => {
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
      return selected;
    }
    return false;
  }, []);

  const fetchFortune = useCallback(async () => {
    if (profile) {
      setLoadingFortune(true);
      try {
        const result = await getDailyFortune(
          profile.birth_date, 
          profile.birth_time, 
          format(selectedDate, 'yyyy-MM-dd')
        );
        setFortune(result);
      } catch (err: any) {
        if (err?.message?.includes('Requested entity was not found')) {
          setHasApiKey(false);
          setFortune("");
        } else {
          setFortune("운세를 불러오지 못했습니다. 키 연결 상태를 확인해주세요.");
        }
      } finally {
        setLoadingFortune(false);
      }
    }
  }, [selectedDate, profile]);

  const handleOpenKeySelection = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      if (profile) fetchFortune();
    }
  };

  useEffect(() => {
    setIsFileSystemSupported('showSaveFilePicker' in window);
    checkApiKeyStatus().then((selected) => {
      if (selected && profile) fetchFortune();
    });
  }, [profile, checkApiKeyStatus, fetchFortune]);

  const loadMemos = useCallback(() => {
    const data = getMemosForDate(selectedDate);
    setMemos(data);
  }, [selectedDate]);

  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  const triggerAutoBackup = async (handle: FileSystemFileHandle | null = fileHandle) => {
    if (!handle) return;
    try {
      const data = {
        memos: localStorage.getItem('daily_harmony_memos_v2'),
        profile: localStorage.getItem('user_profile'),
        version: '1.0',
        exportedAt: new Date().toISOString()
      };
      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
    } catch (err) {
      setFileHandle(null);
    }
  };

  const handleAddMemo = async () => {
    if (!newMemo.trim()) return;
    saveMemoLocal({
      date: format(selectedDate, 'yyyy-MM-dd'),
      type: selectedType,
      content: newMemo,
      repeat_type: RepeatType.NONE,
      reminder_time: reminderEnabled ? reminderTime : undefined,
      reminder_offsets: reminderEnabled ? selectedOffsets : undefined,
    });
    setNewMemo('');
    setReminderEnabled(false);
    setShowReminderOptions(false);
    loadMemos();
    await triggerAutoBackup();
  };

  const handleToggleMemo = async (id: string) => {
    toggleMemoLocal(id);
    loadMemos();
    await triggerAutoBackup();
  };

  const handleDeleteMemo = async (id: string) => {
    deleteMemoLocal(id);
    loadMemos();
    await triggerAutoBackup();
  };

  const getDayDetails = useCallback((date: Date) => {
    const lunar = Lunar.fromDate(date);
    const mmdd = format(date, 'MM-dd');
    const holiday = SOLAR_HOLIDAYS[mmdd] || null;
    const rawJieQi = lunar.getJieQi() || null;
    const jieQi = rawJieQi ? (JIE_QI_MAP[rawJieQi] || rawJieQi) : null;
    let dynamicHoliday = null;
    const lm = lunar.getMonth();
    const ld = lunar.getDay();
    if (lm === 1 && ld === 1) dynamicHoliday = '설날';
    else if (lm === 1 && (ld === 2 || ld === -1)) dynamicHoliday = '설날 연휴';
    else if (lm === 4 && ld === 8) dynamicHoliday = '부처님오신날';
    else if (lm === 8 && ld === 15) dynamicHoliday = '추석';
    return { holiday, dynamicHoliday, jieQi, lunar };
  }, []);

  const currentDayInfo = getDayDetails(selectedDate);

  const renderCells = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const { holiday, dynamicHoliday, jieQi, lunar } = getDayDetails(day);
        const isSunday = i === 0;
        const isSaturday = i === 6;
        const isHoliday = !!holiday || !!dynamicHoliday;
        const isSelected = isSameDay(day, selectedDate);
        const isToday = isSameDay(day, new Date());
        const dayMemos = getMemosForDate(day);
        
        days.push(
          <div
            key={day.toString()}
            className={`relative min-h-[85px] sm:min-h-[100px] md:min-h-[120px] p-1 md:p-2 border-r border-b cursor-pointer transition-all duration-200
              ${!isSameMonth(day, monthStart) ? "bg-gray-50/50 text-gray-300" : "text-gray-700 bg-white"}
              ${isSelected ? "bg-indigo-50/50 ring-2 ring-inset ring-indigo-500/20 z-10" : "hover:bg-gray-50"}
            `}
            onClick={() => setSelectedDate(cloneDay)}
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col items-center">
                <span className={`text-[10px] sm:text-xs md:text-sm font-bold w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full transition-colors
                  ${isSelected ? "bg-indigo-600 text-white shadow-sm" : ""}
                  ${isToday && !isSelected ? "bg-gray-200 text-gray-800" : ""}
                  ${(isSunday || isHoliday) && !isSelected ? "text-red-500" : ""}
                  ${isSaturday && !isHoliday && !isSelected ? "text-blue-600" : ""}
                `}>
                  {format(day, "d")}
                </span>
                <span className="text-[7px] md:text-[8px] text-gray-400 mt-0.5">{lunar.getMonth()}.{lunar.getDay()}</span>
              </div>
              <div className="flex flex-col items-end max-w-[50%]">
                {(holiday || dynamicHoliday) && (
                  <span className="text-[7px] md:text-[8px] text-red-500 font-black text-right break-keep">
                    {holiday || dynamicHoliday}
                  </span>
                )}
              </div>
            </div>
            <div className="mt-1 space-y-0.5 overflow-hidden">
               {dayMemos.slice(0, 2).map((m: Memo, idx: number) => (
                 <div key={idx} className="flex items-center space-x-1">
                   <div className={`shrink-0 w-1 h-1 rounded-full ${
                     m.type === MemoType.IDEA ? 'bg-amber-400' : 
                     m.type === MemoType.APPOINTMENT ? 'bg-rose-400' : 'bg-blue-400'
                   }`} />
                   <span className="text-[8px] md:text-[9px] text-gray-600 truncate">{m.content}</span>
                 </div>
               ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7" key={day.getTime()}>{days}</div>);
      days = [];
    }
    return <div className="border-t border-l rounded-2xl overflow-hidden bg-white shadow-sm">{rows}</div>;
  };

  return (
    <div className="max-w-7xl mx-auto px-3 py-4 md:py-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
        <div className="flex items-center justify-between w-full md:w-auto">
          <h2 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
            {format(currentDate, 'yyyy년 MM월')}
          </h2>
          <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 ml-4">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1.5 hover:bg-gray-50 rounded-lg"><ChevronLeft size={18} /></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 text-[10px] font-bold text-indigo-600">오늘</button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 hover:bg-gray-50 rounded-lg"><ChevronRight size={18} /></button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button onClick={() => setShowDataMenu(!showDataMenu)} className="p-2.5 bg-white border border-gray-100 rounded-2xl shadow-sm"><Database size={20} className="text-gray-400" /></button>
          <button onClick={() => setShowProfileModal(true)} className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-gray-100 px-4 py-2.5 rounded-2xl shadow-sm font-bold">
            <User size={18} className="text-indigo-500" />
            <span className="text-sm">{profile ? profile.name : '프로필 설정'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[32px] p-2 md:p-6 shadow-sm border border-gray-100 overflow-x-hidden">
             <div className="grid grid-cols-7 mb-2 border-b pb-2">
                {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                  <div key={day} className={`text-center font-bold text-[10px] md:text-xs ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'}`}>{day}</div>
                ))}
             </div>
             {renderCells()}
          </div>
          
          {profile && (
            <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
               <h3 className="text-lg font-black mb-4 flex items-center gap-2"><Activity size={20} className="text-indigo-500" /> 바이오리듬</h3>
               <BiorhythmChart birthDate={profile.birth_date} targetDate={selectedDate} />
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[32px] p-6 shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-indigo-200 text-[10px] font-bold tracking-widest mb-1">{format(selectedDate, 'yyyy')}</p>
              <h2 className="text-3xl font-black mb-2">{format(selectedDate, 'M월 d일')}</h2>
              <div className="flex items-center gap-2 mt-4">
                <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black">{format(selectedDate, 'EEEE', { locale: ko })}</span>
                <span className="text-[10px] font-bold">음력 {currentDayInfo.lunar.getMonth()}.{currentDayInfo.lunar.getDay()}</span>
              </div>
            </div>
            <Moon className="absolute -right-6 -bottom-6 text-white opacity-10 rotate-12" size={140} />
          </div>

          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black flex items-center gap-2"><Sparkles size={20} className="text-amber-400" /> 오늘의 AI 운세</h3>
            </div>

            {!profile ? (
              <p className="text-gray-400 text-sm text-center py-4 font-medium">프로필을 설정하면 운세를 볼 수 있어요.</p>
            ) : !hasApiKey ? (
              <div className="text-center py-4 space-y-4">
                 <p className="text-gray-400 text-xs leading-relaxed">AI 운세를 이용하려면 서비스 연결이 필요합니다.</p>
                 <button onClick={handleOpenKeySelection} className="w-full bg-indigo-600 text-white py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2">
                   <LinkIcon size={16} /> AI 서비스 연결하기
                 </button>
              </div>
            ) : loadingFortune ? (
              <div className="space-y-2 py-2 animate-pulse">
                <div className="h-3 bg-gray-100 rounded-full w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded-full w-full"></div>
                <div className="h-3 bg-gray-100 rounded-full w-1/2"></div>
              </div>
            ) : (
              <div className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">{fortune}</div>
            )}
          </div>

          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
            <h3 className="text-sm font-black mb-4 flex items-center gap-2"><Plus size={18} className="text-indigo-600" /> 기록 추가</h3>
            <div className="flex gap-2 mb-4">
              {([ [MemoType.TODO, ListTodo, '할일'], [MemoType.IDEA, Lightbulb, '아이디어'], [MemoType.APPOINTMENT, CalendarCheck, '약속'] ] as const).map(([type, Icon, label]) => (
                <button key={type} onClick={() => setSelectedType(type)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] font-bold transition-all ${selectedType === type ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}>
                  <Icon size={12} /> <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <input type="text" value={newMemo} onChange={(e) => setNewMemo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddMemo()} placeholder="무엇을 기록할까요?" className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-4 pr-12 text-sm font-medium focus:ring-2 focus:ring-indigo-500" />
              <button onClick={handleAddMemo} className="absolute right-2 top-2 p-2 bg-indigo-600 text-white rounded-xl shadow-lg"><Plus size={20} /></button>
            </div>
          </div>

          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-black mb-4">기록 목록</h3>
            <div className="space-y-3">
              {memos.length === 0 ? (
                <p className="text-center py-10 text-xs font-bold text-gray-300">오늘은 조용하네요.</p>
              ) : (
                memos.map((memo) => (
                  <div key={memo.id} className="group flex items-center justify-between bg-white border border-gray-50 p-3 rounded-2xl hover:border-indigo-100 transition-all">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button onClick={() => handleToggleMemo(memo.id)} className="shrink-0">
                        {memo.completed ? <CheckCircle2 className="text-emerald-500" size={20} /> : <Circle className="text-gray-200" size={20} />}
                      </button>
                      <span className={`text-sm font-bold truncate ${memo.completed ? 'text-gray-300 line-through' : 'text-gray-700'}`}>{memo.content}</span>
                    </div>
                    <button onClick={() => handleDeleteMemo(memo.id)} className="p-2 text-gray-300 hover:text-rose-500 md:opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showProfileModal && <ProfileSetup onSave={(newProfile) => { setProfile(newProfile); localStorage.setItem('user_profile', JSON.stringify(newProfile)); setShowProfileModal(false); if (hasApiKey) fetchFortune(); }} onClose={() => setShowProfileModal(false)} currentProfile={profile} />}
    </div>
  );
};

export default App;
