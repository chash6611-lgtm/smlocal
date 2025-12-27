
import { createClient } from '@supabase/supabase-js';
import { Memo, RepeatType, UserProfile } from '../types.ts';
import { parseISO, isSameDay, getDay, getDate, getMonth } from 'date-fns';
import { Lunar } from 'lunar-javascript';

/** 
 * [안내] 서버 저장(Supabase) 설정
 */
const supabaseUrl = 'https://klarhvoglyapszhdwabp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsYXJodm9nbHlhcHN6aGR3YWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NjE4NTcsImV4cCI6MjA4MjAzNzg1N30.3V2bkP4Xg9kazzlkgdSm_fTGVPCBt4tgqjhfchac7UI';

export const isSupabaseConfigured = 
  supabaseUrl.includes('supabase.co') && 
  supabaseAnonKey.length > 20;

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const LOCAL_STORAGE_KEY = 'daily_harmony_memos_v2';
const PROFILE_STORAGE_KEY = 'user_profile';

const getErrorMessage = (err: any): string => {
  if (typeof err === 'string') return err;
  if (err && err.message) return err.message;
  return "알 수 없는 오류가 발생했습니다.";
};

// --- 프로필 관련 기능 ---

export const fetchProfileFromCloud = async (userId: string = 'local_user'): Promise<UserProfile | null> => {
  if (!supabase) {
    const local = localStorage.getItem(PROFILE_STORAGE_KEY);
    return local ? JSON.parse(local) : null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    
    if (data) {
      // DB의 user_id를 앱의 id로 변환하여 저장
      const formattedProfile: UserProfile = {
        ...data,
        id: data.user_id
      };
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(formattedProfile));
      return formattedProfile;
    }
    
    const local = localStorage.getItem(PROFILE_STORAGE_KEY);
    return local ? JSON.parse(local) : null;
  } catch (err) {
    console.warn("프로필 로드 실패:", getErrorMessage(err));
    const local = localStorage.getItem(PROFILE_STORAGE_KEY);
    return local ? JSON.parse(local) : null;
  }
};

export const saveProfileCloud = async (profile: UserProfile): Promise<UserProfile | null> => {
  // DB에 없는 'id' 필드를 제거하고 'user_id'로 매핑
  const { id, ...rest } = profile;
  const profileData = {
    ...rest,
    user_id: 'local_user', 
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData, { onConflict: 'user_id' })
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const saved: UserProfile = { ...data[0], id: data[0].user_id };
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(saved));
        return saved;
      }
    } catch (err) {
      console.error("클라우드 프로필 저장 실패:", getErrorMessage(err));
      alert("클라우드 저장에 실패했습니다: " + getErrorMessage(err));
    }
  }

  // 실패하거나 설정이 없는 경우 로컬에만 저장
  const localData = { ...profile, updated_at: new Date().toISOString() };
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(localData));
  return localData as UserProfile;
};

// --- 메모 관련 기능 ---

export const fetchMemosFromCloud = async (userId: string = 'local_user'): Promise<Memo[]> => {
  if (!supabase) {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  }

  try {
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
    return data || [];
  } catch (err) {
    console.warn("메모 로드 실패:", getErrorMessage(err));
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  }
};

export const getFilteredMemos = (allMemos: Memo[], targetDate: Date): Memo[] => {
  const targetDay = getDay(targetDate);
  const targetDateNum = getDate(targetDate);
  const targetMonth = getMonth(targetDate);
  const targetLunar = Lunar.fromDate(targetDate);

  return allMemos.filter(memo => {
    const memoDate = parseISO(memo.date);
    if (memo.repeat_type === RepeatType.NONE || !memo.repeat_type) {
      return isSameDay(memoDate, targetDate);
    }
    if (targetDate < memoDate && !isSameDay(memoDate, targetDate)) return false;

    switch (memo.repeat_type) {
      case RepeatType.WEEKLY: return getDay(memoDate) === targetDay;
      case RepeatType.MONTHLY: return getDate(memoDate) === targetDateNum;
      case RepeatType.YEARLY_SOLAR: return getMonth(memoDate) === targetMonth && getDate(memoDate) === targetDateNum;
      case RepeatType.YEARLY_LUNAR:
        const memoLunar = Lunar.fromDate(memoDate);
        return memoLunar.getMonth() === targetLunar.getMonth() && memoLunar.getDay() === targetLunar.getDay();
      default: return false;
    }
  });
};

export const saveMemoCloud = async (memo: Partial<Memo>): Promise<Memo | null> => {
  const newMemo = {
    user_id: 'local_user',
    date: memo.date!,
    type: memo.type!,
    content: memo.content!,
    completed: false,
    created_at: new Date().toISOString(),
    repeat_type: memo.repeat_type || RepeatType.NONE,
    reminder_time: memo.reminder_time || null,
    reminder_offsets: memo.reminder_offsets || null,
  };

  if (supabase) {
    try {
      const { data, error } = await supabase.from('memos').insert([newMemo]).select();
      if (error) throw error;
      if (data) return data[0];
    } catch (err) { 
      console.error("클라우드 메모 저장 실패:", getErrorMessage(err)); 
    }
  }

  const localMemos = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  const localNewMemo = { ...newMemo, id: 'local_' + Math.random().toString(36).substr(2, 9) } as Memo;
  localMemos.push(localNewMemo);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localMemos));
  return localNewMemo;
};

export const deleteMemoCloud = async (id: string): Promise<boolean> => {
  if (supabase && !id.startsWith('local_')) {
    try {
      const { error } = await supabase.from('memos').delete().eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("클라우드 삭제 실패:", getErrorMessage(err));
    }
  }
  const localMemos = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localMemos.filter((m: any) => m.id !== id)));
  return true;
};

export const updateMemoCloud = async (id: string, updates: Partial<Memo>): Promise<boolean> => {
  const processedUpdates = { ...updates };
  if (updates.reminder_time === undefined) (processedUpdates as any).reminder_time = null;
  if (updates.reminder_offsets === undefined) (processedUpdates as any).reminder_offsets = null;

  if (supabase && !id.startsWith('local_')) {
    try {
      const { error } = await supabase.from('memos').update(processedUpdates).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error("클라우드 업데이트 실패:", getErrorMessage(err));
    }
  }
  const localMemos = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
  const updated = localMemos.map((m: any) => m.id === id ? { ...m, ...processedUpdates } : m);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  return true;
};
