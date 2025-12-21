
import { createClient } from '@supabase/supabase-js';
import { Memo, RepeatType } from '../types';
import { parseISO, format, getDay, getDate, getMonth, isSameDay } from 'date-fns';
import { Lunar } from 'lunar-javascript';

const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'your-anon-key';

export const isSupabaseConfigured = supabaseUrl !== 'https://your-project.supabase.co';

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const LOCAL_STORAGE_KEY = 'daily_harmony_memos_v2';

export const getAllMemosLocal = (): Memo[] => {
  return JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
};

export const getMemosForDate = (targetDate: Date): Memo[] => {
  const memos = getAllMemosLocal();
  const targetDay = getDay(targetDate);
  const targetDateNum = getDate(targetDate);
  const targetMonth = getMonth(targetDate);
  const targetLunar = Lunar.fromDate(targetDate);

  return memos.filter(memo => {
    const memoDate = parseISO(memo.date);
    
    if (memo.repeat_type === RepeatType.NONE || !memo.repeat_type) {
      return isSameDay(memoDate, targetDate);
    }

    if (targetDate < memoDate && !isSameDay(memoDate, targetDate)) return false;

    switch (memo.repeat_type) {
      case RepeatType.WEEKLY:
        return getDay(memoDate) === targetDay;
      case RepeatType.MONTHLY:
        return getDate(memoDate) === targetDateNum;
      case RepeatType.YEARLY_SOLAR:
        return getMonth(memoDate) === targetMonth && getDate(memoDate) === targetDateNum;
      case RepeatType.YEARLY_LUNAR:
        const memoLunar = Lunar.fromDate(memoDate);
        return memoLunar.getMonth() === targetLunar.getMonth() && memoLunar.getDay() === targetLunar.getDay();
      default:
        return false;
    }
  });
};

export const saveMemoLocal = (memo: Partial<Memo>) => {
  const memos = getAllMemosLocal();
  const newMemo: Memo = {
    id: Math.random().toString(36).substr(2, 9),
    user_id: 'local_user',
    date: memo.date!,
    type: memo.type!,
    content: memo.content!,
    completed: false,
    created_at: new Date().toISOString(),
    repeat_type: memo.repeat_type || RepeatType.NONE,
    reminder_time: memo.reminder_time,
    reminder_offset: memo.reminder_offset,
  };
  memos.push(newMemo);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(memos));
};

export const deleteMemoLocal = (id: string) => {
  const memos = getAllMemosLocal();
  const filtered = memos.filter(m => m.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
};

export const toggleMemoLocal = (id: string) => {
  const memos = getAllMemosLocal();
  const updated = memos.map(m => m.id === id ? { ...m, completed: !m.completed } : m);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
};
