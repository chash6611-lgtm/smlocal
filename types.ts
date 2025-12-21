
export enum MemoType {
  IDEA = 'IDEA',
  APPOINTMENT = 'APPOINTMENT',
  TODO = 'TODO'
}

export enum RepeatType {
  NONE = 'NONE',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY_SOLAR = 'YEARLY_SOLAR',
  YEARLY_LUNAR = 'YEARLY_LUNAR'
}

export enum ReminderOffset {
  AT_TIME = '0',
  MIN_10 = '10',
  MIN_30 = '30',
  HOUR_1 = '60',
  HOUR_2 = '120',
  HOUR_3 = '180',
  HOUR_6 = '360',
  DAY_1 = '1440',
  DAY_2 = '2880',
  DAY_3 = '4320',
  WEEK_1 = '10080',
  MONTH_1 = '43200'
}

export interface Memo {
  id: string;
  user_id: string;
  date: string; // Anchor date (YYYY-MM-DD)
  type: MemoType;
  content: string;
  completed: boolean;
  created_at: string;
  repeat_type: RepeatType;
  reminder_time?: string; // HH:mm
  reminder_offsets?: ReminderOffset[]; // 다중 선택 가능하도록 변경
}

export interface UserProfile {
  id: string;
  birth_date: string; // YYYY-MM-DD
  birth_time: string; // HH:mm
  name: string;
  notifications_enabled: boolean;
  daily_reminder_time: string; // HH:mm
}

export interface BiorhythmData {
  physical: number;
  emotional: number;
  intellectual: number;
  average: number;
}

export interface Holiday {
  date: string;
  name: string;
  isPublic: boolean;
}
