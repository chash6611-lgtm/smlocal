
import { differenceInDays, parseISO } from 'date-fns';
import { BiorhythmData } from '../types';

export function calculateBiorhythm(birthDate: string, targetDate: Date): BiorhythmData {
  const birth = parseISO(birthDate);
  const diff = differenceInDays(targetDate, birth);

  const calc = (cycle: number) => Math.sin((2 * Math.PI * diff) / cycle) * 100;

  const physical = calc(23);
  const emotional = calc(28);
  const intellectual = calc(33);

  return {
    physical,
    emotional,
    intellectual,
    average: (physical + emotional + intellectual) / 3
  };
}
