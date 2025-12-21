
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

// Removed redundant window.aistudio declaration because it is already pre-configured in the global context and conflicts with the existing AIStudio type definition.

const JIE_QI_MAP: Record<string, string> = {
  '立春': '입춘', '雨水': '우수', '驚蟄': '경칩', '春분': '춘분', '淸明': '청명', '穀雨': '곡우',
  '立夏': '입하', '小滿': '소만', '芒종': '망종', '夏至': '하지', '小暑': '소서', '大暑': '대서',
  '立秋': '입추', '處暑': '처서', '白露': '백로', '秋分': '취분', '寒露': '한로', '霜강': '상강',
  '立冬': '입동', '小雪': '소설', '大雪': '대설', '冬至': '동지', '小寒': '소한', '大寒': '대한'
};

const OFFSET_LABELS: Record<ReminderOffset, string> = {
  [ReminderOffset.AT_TIME]: '정시',
  [ReminderOffset.MIN_10]: '10분 전',
  [ReminderOffset.MIN_30]: '30분 전',
  [ReminderOffset.HOUR_1]: '1시간 전',
  [ReminderOffset.HOUR_2]: '2시간 전',
  [ReminderOffset.HOUR_3]: '3시간 전',
  [ReminderOffset.HOUR_6]: '6시간 전',
  [ReminderOffset.DAY_1]: '1일 전',
  [ReminderOffset.DAY_2]: '2일 전',
  [ReminderOffset.DAY_3]: '3일 전',
  [ReminderOffset.WEEK_1]: '1주일 전',
  [ReminderOffset.MONTH_1]: '1달 전',
};

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [memos, setMemos] = useState<Memo[]>([]);
  const [newMemo, setNewMemo] = useState('');
  const [selectedType, setSelectedType] = useState<MemoType>(MemoType.TODO);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // 알림 관련 상태
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [selectedOffsets, setSelectedOffsets] = useState<ReminderOffset[]>([ReminderOffset.AT_TIME]);
  const [showReminderOptions, setShowReminderOptions] = useState(false);
  
  // 수정 관련 상태
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  // 데이터 관리 및 자동 백업 상태
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

  const lastNotificationDate = useRef<string | null>(localStorage.getItem('last_notif_date'));
  const notifiedMemos = useRef<Set<string>>(new Set(JSON.parse(localStorage.getItem('notified_memos') || '[]')));

  // 초기 로드 및 API 키 상태 확인
  useEffect(() => {
    setIsFileSystemSupported('showSaveFilePicker' in window);
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    // Correctly accessing global aistudio which is pre-configured
    if (window.aistudio) {
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    }
  };

  const handleOpenKeySelection = async () => {
    // Correctly accessing global aistudio which is pre-configured
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasApiKey(true);
      // 키 선택 후 운세 다시 불러오기
      fetchFortune();
    }
  };

  const loadMemos = useCallback(() => {
    const data = getMemosForDate(selectedDate);
    setMemos(data);
  }, [selectedDate]);

  useEffect(() => {
    loadMemos();
  }, [loadMemos]);

  // 파일 시스템에 데이터 쓰기 (자동 백업 핵심 로직)
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
      console.log('실시간 자동 백업 완료');
    } catch (err) {
      console.error('자동 백업 실패:', err);
      setFileHandle(null);
    }
  };

  const handleConnectBackupFile = async () => {
    if (!isFileSystemSupported) {
      alert('현재 브라우저에서는 실시간 파일 저장 기능을 지원하지 않습니다. (주로 모바일 환경)');
      return;
    }

    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `daily-harmony-autobackup.json`,
        types: [{
          description: 'JSON 파일',
          accept: { 'application/json': ['.json'] },
        }],
      });
      setFileHandle(handle);
      await triggerAutoBackup(handle);
      alert('실시간 파일 백업이 연결되었습니다. 기록할 때마다 이 파일에 자동 저장됩니다.');
      setShowDataMenu(false);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        alert('파일 연결에 실패했습니다.');
      }
    }
  };

  const handleExportData = () => {
    const data = {
      memos: localStorage.getItem('daily_harmony_memos_v2'),
      profile: localStorage.getItem('user_profile'),
      version: '1.0',
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily-harmony-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowDataMenu(false);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('현재 저장된 데이터가 백업 파일의 내용으로 대체됩니다. 계속하시겠습니까?')) {
          if (data.memos) localStorage.setItem('daily_harmony_memos_v2', data.memos);
          if (data.profile) localStorage.setItem('user_profile', data.profile);
          alert('데이터 복구가 완료되었습니다. 페이지를 새로고침합니다.');
          window.location.reload();
        }
      } catch (err) {
        alert('유효하지 않은 백업 파일입니다.');
      }
    };
    reader.readAsText(file);
    setShowDataMenu(false);
  };

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
        }
        setFortune("운세를 불러오지 못했습니다. API 키 연결을 확인해주세요.");
      } finally {
        setLoadingFortune(false);
      }
    }
  }, [selectedDate, profile]);

  useEffect(() => {
    if (hasApiKey) fetchFortune();
  }, [hasApiKey, fetchFortune]);

  const toggleOffset = (offset: ReminderOffset) => {
    setSelectedOffsets(prev => 
      prev.includes(offset) 
        ? prev.filter(o => o !== offset) 
        : [...prev, offset]
    );
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

  const handleSaveEdit = async () => {
    if (!editingMemoId) return;
    updateMemoLocal(editingMemoId, {
      content: editContent,
    });
    setEditingMemoId(null);
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
            className={`relative min-h-[100px] md:min-h-[125px] p-2 border-r border-b cursor-pointer transition-all duration-200
              ${!isSameMonth(day, monthStart) ? "bg-gray-50/50 text-gray-300" : "text-gray-700 bg-white"}
              ${isSelected ? "bg-indigo-50/50 ring-2 ring-inset ring-indigo-500/20 z-10" : "hover:bg-gray-50"}
            `}
            onClick={() => setSelectedDate(cloneDay)}
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col items-center">
                <span className={`text-xs md:text-sm font-bold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full transition-colors
                  ${isSelected ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : ""}
                  ${isToday && !isSelected ? "bg-gray-200 text-gray-800" : ""}
                  ${(isSunday || isHoliday) && !isSelected ? "text-red-500" : ""}
                  ${isSaturday && !isHoliday && !isSelected ? "text-blue-600" : ""}
                `}>
                  {format(day, "d")}
                </span>
                <span className="text-[8px] md:text-[9px] text-gray-400 mt-0.5">{lunar.getMonth()}.{lunar.getDay()}</span>
              </div>
              <div className="flex flex-col items-end space-y-0.5 max-w-[50%]">
                {(holiday || dynamicHoliday) && (
                  <span className="text-[8px] md:text-[9px] text-red-500 font-black leading-tight text-right break-keep">
                    {holiday || dynamicHoliday}
                  </span>
                )}
                {jieQi && (
                  <span className="flex items-center space-x-0.5 text-[8px] md:text-[9px] text-emerald-600 font-black">
                    <Leaf size={8} />
                    <span className="hidden sm:inline">{jieQi}</span>
                  </span>
                )}
              </div>
            </div>
            <div className="mt-1 md:mt-2 space-y-1 overflow-hidden">
               {dayMemos.slice(0, 2).map((m: Memo, idx: number) => (
                 <div key={idx} className="flex items-center space-x-1">
                   <div className={`shrink-0 w-1 md:w-1.5 h-1 md:h-1.5 rounded-full ${
                     m.type === MemoType.IDEA ? 'bg-amber-400' : 
                     m.type === MemoType.APPOINTMENT ? 'bg-rose-400' : 'bg-blue-400'
                   }`} />
                   <span className="text-[9px] md:text-[10px] text-gray-600 truncate font-medium">{m.content}</span>
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
    return <div className="border-t border-l rounded-2xl overflow-hidden bg-white shadow-xl shadow-gray-200/50">{rows}</div>;
  };

  const biorhythm = profile ? calculateBiorhythm(profile.birth_date, selectedDate) : null;
  const currentDayInfo = getDayDetails(selectedDate);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 space-y-4 md:space-y-0">
        <div className="flex items-center justify-between md:justify-start md:space-x-4">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tighter">
            {format(currentDate, 'yyyy년 MM월')}
          </h2>
          <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 p-1 ml-2">
            <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-1.5 md:p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <ChevronLeft size={18} className="text-gray-600" />
            </button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 md:px-4 text-[10px] md:text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">오늘</button>
            <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-1.5 md:p-2 hover:bg-gray-50 rounded-lg transition-colors">
              <ChevronRight size={18} className="text-gray-600" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-3">
          <div className="relative">
            <button 
              onClick={() => setShowDataMenu(!showDataMenu)}
              className={`p-2.5 bg-white border border-gray-100 rounded-2xl transition-all shadow-sm active:scale-95 flex items-center space-x-1 ${fileHandle ? 'text-emerald-500 border-emerald-100' : 'text-gray-400 hover:text-indigo-600'}`}
              title="데이터 관리"
            >
              <Database size={20} />
              {fileHandle && <ShieldCheck size={12} className="animate-pulse" />}
            </button>
            {showDataMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-50 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">자동 백업 (PC 전용)</span>
                </div>
                <button 
                  onClick={handleConnectBackupFile}
                  disabled={!isFileSystemSupported}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-bold transition-colors ${!isFileSystemSupported ? 'text-gray-300 cursor-not-allowed opacity-50' : 'text-gray-600 hover:bg-gray-50 hover:text-indigo-600'}`}
                >
                  <FileCode size={16} />
                  <span className="text-left leading-tight">실시간 파일 백업 연결<br/>
                    <span className="text-[10px] font-medium text-gray-400">
                      {isFileSystemSupported ? '폴더 지정 후 자동 저장' : '모바일 미지원'}
                    </span>
                  </span>
                </button>
                <div className="px-4 py-2 border-b border-gray-50 mt-1 mb-1">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">수동 백업/복구 (공용)</span>
                </div>
                <button 
                  onClick={handleExportData}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  <Download size={16} />
                  <span>데이터 직접 내보내기</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center space-x-3 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                >
                  <Upload size={16} />
                  <span>데이터 불러오기</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleImportData} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>
            )}
          </div>
          <button 
            onClick={() => setShowProfileModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center space-x-2 bg-white border border-gray-100 text-gray-700 px-4 md:px-5 py-2.5 rounded-2xl hover:bg-gray-50 transition-all shadow-sm font-bold"
          >
            <User size={18} className="text-indigo-500" />
            <span className="text-sm md:text-base">{profile ? profile.name : '프로필 설정'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          <div className="bg-white rounded-3xl p-3 md:p-6 shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-x-auto">
            <div className="min-w-[320px] md:min-w-full">
              <div className="grid grid-cols-7 mb-2 border-b pb-2">
                {["일", "월", "화", "수", "목", "금", "토"].map((day, i) => (
                  <div key={day} className={`text-center font-bold text-[10px] md:text-xs uppercase tracking-wider
                    ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-400'}`}>
                    {day}
                  </div>
                ))}
              </div>
              {renderCells()}
            </div>
          </div>

          {profile && (
            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 md:p-8 border border-gray-50">
              <div className="flex items-center space-x-2 mb-6">
                <Activity className="text-indigo-600" size={24} />
                <h3 className="text-lg md:text-xl font-black text-gray-900">바이오리듬</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-center">
                <BiorhythmChart birthDate={profile.birth_date} targetDate={selectedDate} />
                <div className="space-y-3">
                  {[
                    { label: '신체 지수', val: biorhythm?.physical, color: 'blue' },
                    { label: '감성 지수', val: biorhythm?.emotional, color: 'rose' },
                    { label: '지성 지수', val: biorhythm?.intellectual, color: 'emerald' }
                  ].map((item) => (
                    <div key={item.label} className={`p-4 bg-${item.color}-50/50 rounded-2xl border border-${item.color}-100`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-${item.color}-700 font-bold text-sm`}>{item.label}</span>
                        <span className={`text-${item.color}-800 font-black text-lg`}>{Math.round(item.val || 0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-[32px] p-6 md:p-8 shadow-2xl shadow-indigo-200 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-indigo-200 text-[10px] md:text-xs font-bold tracking-widest mb-1">{format(selectedDate, 'yyyy')}</p>
              <h2 className="text-3xl md:text-4xl font-black mb-2">{format(selectedDate, 'M월 d일')}</h2>
              <div className="flex items-center flex-wrap gap-2 mt-4">
                <div className="bg-white/20 backdrop-blur-md px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black">
                  {format(selectedDate, 'EEEE', { locale: ko })}
                </div>
                <div className="flex items-center space-x-1.5 text-indigo-100">
                  <Moon size={14} />
                  <span className="text-[10px] md:text-xs font-bold">음력 {currentDayInfo.lunar.getMonth()}.{currentDayInfo.lunar.getDay()}</span>
                </div>
              </div>
            </div>
            <Moon className="absolute -right-8 -bottom-8 text-white opacity-10 rotate-12" size={150} />
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 md:p-7 border border-gray-50 overflow-hidden relative">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center space-x-2">
                <Sparkles className="text-indigo-500" size={18} />
                <h3 className="text-lg font-black text-gray-900">오늘의 AI 운세</h3>
              </div>
              {hasApiKey && (
                <button 
                  onClick={handleOpenKeySelection}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg"
                  title="키 설정 변경"
                >
                  <Settings size={14} />
                </button>
              )}
            </div>

            {!profile ? (
              <div className="py-4 text-center">
                 <p className="text-gray-400 text-sm font-medium">프로필을 먼저 설정해주세요.</p>
                 <button 
                  onClick={() => setShowProfileModal(true)}
                  className="mt-3 text-indigo-600 text-xs font-bold hover:underline"
                 >
                   프로필 설정하러 가기
                 </button>
              </div>
            ) : !hasApiKey ? (
              <div className="py-4 space-y-4 text-center animate-in fade-in">
                <p className="text-gray-500 text-sm font-medium leading-relaxed">
                  AI 운세 서비스를 이용하시려면 Gemini API 키를 먼저 연결해 주세요.
                </p>
                <button 
                  onClick={handleOpenKeySelection}
                  className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 text-sm"
                >
                  <LinkIcon size={16} />
                  <span>AI 서비스 안전하게 연결하기</span>
                </button>
              </div>
            ) : loadingFortune ? (
              <div className="space-y-3 animate-pulse py-2">
                <div className="h-4 bg-gray-100 rounded-full w-3/4"></div>
                <div className="h-4 bg-gray-100 rounded-full w-full"></div>
                <div className="h-4 bg-gray-100 rounded-full w-2/3"></div>
              </div>
            ) : (
              <div className="text-gray-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap font-medium">
                {fortune}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 md:p-7 border border-gray-50">
            <div className="flex items-center space-x-2 mb-4">
               <CalendarIcon className="text-indigo-600" size={18} />
               <h3 className="text-sm font-black text-gray-900">기록 추가</h3>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-5">
              {([ [MemoType.TODO, ListTodo, '할일'], [MemoType.IDEA, Lightbulb, '아이디어'], [MemoType.APPOINTMENT, CalendarCheck, '약속'] ] as const).map(([type, Icon, label]) => (
                <button 
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-[10px] md:text-xs font-black transition-all
                    ${selectedType === type 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                      : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                >
                  <Icon size={12} /> <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <input 
                  type="text" 
                  value={newMemo}
                  onChange={(e) => setNewMemo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddMemo()}
                  placeholder="어떤 일을 기록할까요?"
                  className="w-full bg-gray-50 border-transparent focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 rounded-2xl py-4 pl-5 pr-14 text-sm font-medium transition-all shadow-inner"
                />
                <button 
                  onClick={handleAddMemo}
                  className="absolute right-2.5 top-2.5 p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg"
                >
                  <Plus size={20} />
                </button>
              </div>

              <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <button 
                    onClick={() => setShowReminderOptions(!showReminderOptions)}
                    className="flex items-center space-x-2 text-xs font-bold text-gray-600 hover:text-indigo-600 transition-colors"
                  >
                    <Bell size={14} className={reminderEnabled ? "text-indigo-500" : "text-gray-400"} />
                    <span>알림 설정</span>
                    {showReminderOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button 
                    onClick={() => setReminderEnabled(!reminderEnabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${reminderEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${reminderEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </button>
                </div>

                {reminderEnabled && showReminderOptions && (
                  <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center space-x-3">
                      <Clock size={14} className="text-gray-400" />
                      <input 
                        type="time" 
                        value={reminderTime}
                        onChange={(e) => setReminderTime(e.target.value)}
                        className="bg-white border-none focus:ring-2 focus:ring-indigo-500 rounded-lg py-1.5 px-3 text-xs font-bold text-gray-700"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(OFFSET_LABELS) as ReminderOffset[]).map((offset) => (
                        <button
                          key={offset}
                          onClick={() => toggleOffset(offset)}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border
                            ${selectedOffsets.includes(offset)
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-white text-gray-500 border-gray-100 hover:bg-gray-50'}`}
                        >
                          {OFFSET_LABELS[offset]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 md:p-7 border border-gray-50">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black text-gray-900">기록 목록</h3>
            </div>
            <div className="space-y-3">
              {memos.length === 0 ? (
                <p className="text-center py-10 text-sm font-bold text-gray-300">기록이 없습니다.</p>
              ) : (
                memos.map((memo) => (
                  <div key={memo.id} className="group flex flex-col bg-white border border-gray-50 p-4 rounded-2xl hover:border-indigo-100 transition-all">
                    {editingMemoId === memo.id ? (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <input 
                          type="text" 
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="w-full bg-gray-50 border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 rounded-xl py-3 px-4 text-sm font-medium"
                        />
                        <div className="flex space-x-2">
                          <button 
                            onClick={handleSaveEdit}
                            className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1"
                          >
                            <Check size={14} /> <span>저장</span>
                          </button>
                          <button 
                            onClick={() => setEditingMemoId(null)}
                            className="flex-1 bg-gray-100 text-gray-500 font-bold py-2 rounded-xl text-xs flex items-center justify-center space-x-1"
                          >
                            <X size={14} /> <span>취소</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 flex-1 min-w-0">
                          <button onClick={() => handleToggleMemo(memo.id)} className="shrink-0 transition-transform active:scale-90">
                            {memo.completed ? <CheckCircle2 className="text-emerald-500" size={22} /> : <Circle className="text-gray-200" size={22} />}
                          </button>
                          <span className={`text-sm font-bold truncate ${memo.completed ? 'text-gray-300 line-through' : 'text-gray-700'}`}>{memo.content}</span>
                        </div>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 md:group-hover:opacity-100 transition-all">
                          <button onClick={() => {
                            setEditingMemoId(memo.id);
                            setEditContent(memo.content);
                          }} className="text-gray-300 hover:text-indigo-500 p-2">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleDeleteMemo(memo.id)} className="text-gray-300 hover:text-rose-500 p-2">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showProfileModal && (
        <ProfileSetup 
          onSave={async (newProfile) => {
            setProfile(newProfile);
            localStorage.setItem('user_profile', JSON.stringify(newProfile));
            setShowProfileModal(false);
            await triggerAutoBackup();
          }} 
          onClose={() => setShowProfileModal(false)}
          currentProfile={profile}
        />
      )}
    </div>
  );
};

export default App;
