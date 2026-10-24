import type { TimeSlot } from '../types';

/**
 * Adds given minutes to a "HH:MM" string and returns formatted "HH:MM".
 */
export function addMinutesToTime(time: string, minutes: number): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time;

  const totalMin = h * 60 + m + minutes;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;

  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

/**
 * Calculates minutes difference between time A and time B.
 */
export function getMinutesDifference(startTime: string, endTime: string): number {
  const [h1, m1] = startTime.split(':').map(Number);
  const [h2, m2] = endTime.split(':').map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

/**
 * Returns formatted student name according to GDPR / duplicate rule:
 * - If only one "Esko" in the class, returns "Esko".
 * - If multiple students share the first name, returns "Esko M." and "Esko K."
 */
export function getStudentDisplayName(
  submission: { firstName: string; lastNameInitial: string },
  allSubmissions: { firstName: string; lastNameInitial: string }[]
): string {
  const cleanFirst = submission.firstName.trim();
  const cleanInitial = submission.lastNameInitial ? submission.lastNameInitial.trim().toUpperCase() : '';

  const sameFirstNames = allSubmissions.filter(
    s => s.firstName.trim().toLowerCase() === cleanFirst.toLowerCase()
  );

  if (sameFirstNames.length > 1 && cleanInitial) {
    return `${cleanFirst} ${cleanInitial}.`;
  }
  return cleanFirst || (cleanInitial ? `${cleanInitial}.` : 'Nimetön');
}

export interface GroupedDateSlots {
  date: string;
  dateLabel: string;
  section?: string;
  slots: TimeSlot[];
}

/**
 * Groups slots by date and preserves order.
 */
export function groupSlotsByDate(slots: TimeSlot[]): GroupedDateSlots[] {
  const groups: Map<string, GroupedDateSlots> = new Map();

  slots.forEach(slot => {
    const key = `${slot.date}_${slot.section || ''}`;
    if (!groups.has(key)) {
      groups.set(key, {
        date: slot.date,
        dateLabel: slot.dateLabel || slot.date,
        section: slot.section,
        slots: [],
      });
    }
    groups.get(key)!.slots.push(slot);
  });

  return Array.from(groups.values());
}
