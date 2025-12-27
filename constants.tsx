
import { Lunar, Solar } from 'lunar-javascript';
import { format, addDays, getDay, parseISO } from 'date-fns';

export const COLORS = {
  primary: '#4f46e5',
  secondary: '#10b981',
  idea: '#f59e0b',
  appointment: '#ef4444',
  todo: '#3b82f6',
  holiday: '#ef4444',
  saturday: '#2563eb',
};

// 고정 공휴일 (양력)
const FIXED_HOLIDAYS: Record<string, string> = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절',
};

export const getHolidays = (year: number) => {
  const holidays: Record<string, string> = {};

  // 1. 고정 양력 공휴일 등록 및 대체공휴일 계산
  Object.entries(FIXED_HOLIDAYS).forEach(([mmdd, name]) => {
    const dateStr = `${year}-${mmdd}`;
    const date = parseISO(dateStr);
    holidays[dateStr] = name;

    // 대체 공휴일 적용 대상: 삼일절, 어린이날, 광복절, 개천절, 한글날, 성탄절 (현충일, 신정 제외)
    const isSubstituteTarget = ['삼일절', '어린이날', '광복절', '개천절', '한글날', '성탄절'].includes(name);
    if (isSubstituteTarget) {
      const dayOfWeek = getDay(date);
      if (dayOfWeek === 0 || dayOfWeek === 6) { // 일요일(0) 또는 토요일(6)
        // 토/일요일인 경우 다음 첫 번째 비공휴일로 지정
        let subDate = addDays(date, dayOfWeek === 0 ? 1 : 2);
        // 만약 어린이날이 토요일이면 월요일이 대체공휴일, 일요일이면 월요일이 대체공휴일
        // 일반적인 규칙에 따라 월요일을 우선으로 함
        if (name === '어린이날' && dayOfWeek === 6) subDate = addDays(date, 2); 
        
        const subDateStr = format(subDate, 'yyyy-MM-dd');
        holidays[subDateStr] = `대체공휴일(${name})`;
      }
    }
  });

  // 2. 음력 공휴일 (설날, 추석, 부처님오신날)
  // 설날 (음력 1월 1일 + 전후일)
  const lNewYear = Lunar.fromYmd(year, 1, 1).getSolar();
  const newYearDates = [
    addDays(new Date(lNewYear.toYmdHms()), -1),
    new Date(lNewYear.toYmdHms()),
    addDays(new Date(lNewYear.toYmdHms()), 1)
  ];
  
  let hasNewYearSunday = false;
  newYearDates.forEach((d) => {
    const dStr = format(d, 'yyyy-MM-dd');
    holidays[dStr] = '설날 연휴';
    if (getDay(d) === 0) hasNewYearSunday = true;
  });
  if (hasNewYearSunday) {
    const sub = format(addDays(newYearDates[2], 1), 'yyyy-MM-dd');
    holidays[sub] = '대체공휴일(설날)';
  }

  // 추석 (음력 8월 15일 + 전후일)
  const lChuseok = Lunar.fromYmd(year, 8, 15).getSolar();
  const chuseokDates = [
    addDays(new Date(lChuseok.toYmdHms()), -1),
    new Date(lChuseok.toYmdHms()),
    addDays(new Date(lChuseok.toYmdHms()), 1)
  ];
  
  let hasChuseokSunday = false;
  chuseokDates.forEach((d) => {
    const dStr = format(d, 'yyyy-MM-dd');
    holidays[dStr] = '추석 연휴';
    if (getDay(d) === 0) hasChuseokSunday = true;
  });
  if (hasChuseokSunday) {
    const sub = format(addDays(chuseokDates[2], 1), 'yyyy-MM-dd');
    holidays[sub] = '대체공휴일(추석)';
  }

  // 부처님 오신 날 (음력 4월 8일) - 대체공휴일 적용 대상
  const lBuddha = Lunar.fromYmd(year, 4, 8).getSolar();
  const buddhaDate = new Date(lBuddha.toYmdHms());
  const buddhaStr = format(buddhaDate, 'yyyy-MM-dd');
  holidays[buddhaStr] = '부처님오신날';
  
  const buddhaDayOfWeek = getDay(buddhaDate);
  if (buddhaDayOfWeek === 0 || buddhaDayOfWeek === 6) {
    const sub = format(addDays(buddhaDate, buddhaDayOfWeek === 0 ? 1 : 2), 'yyyy-MM-dd');
    holidays[sub] = '대체공휴일(부처님오신날)';
  }

  return holidays;
};
