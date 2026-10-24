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
 * Converts a date or dateLabel to a sortable ISO string (e.g. "2026-11-19").
 * Handles standard ISO dates ("2026-11-19") as well as Finnish date strings ("Torstai 19.11.", "19.11.").
 */
export function parseDateSortKey(slot: { date?: string; dateLabel?: string }): string {
  if (slot.date && /^\d{4}-\d{2}-\d{2}$/.test(slot.date.trim())) {
    return slot.date.trim();
  }
  const text = `${slot.date || ''} ${slot.dateLabel || ''}`;
  const match = text.match(/(\d{1,2})\.(\d{1,2})\.?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const yearMatch = text.match(/20\d{2}/);
    const year = yearMatch ? yearMatch[0] : '2026';
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return slot.date || slot.dateLabel || '';
}

/**
 * Parses "HH:MM" into total minutes from midnight for accurate chronological comparison.
 */
export function parseTimeInMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

/**
 * Chronologically sorts TimeSlots:
 * 1. By calendar date (earliest date first)
 * 2. By start time (earliest time first, e.g. 13:20 before 14:20)
 * 3. By end time
 */
export function sortSlotsChronologically(slots: TimeSlot[]): TimeSlot[] {
  return [...slots].sort((a, b) => {
    // 1. Date comparison
    const dateA = parseDateSortKey(a);
    const dateB = parseDateSortKey(b);
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }

    // 2. Start time comparison
    const timeA = parseTimeInMinutes(a.startTime);
    const timeB = parseTimeInMinutes(b.startTime);
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    // 3. End time comparison
    const endA = parseTimeInMinutes(a.endTime);
    const endB = parseTimeInMinutes(b.endTime);
    return endA - endB;
  });
}

/**
 * Groups slots by date in chronological order, with all slots sorted chronologically.
 */
export function groupSlotsByDate(slots: TimeSlot[]): GroupedDateSlots[] {
  const sorted = sortSlotsChronologically(slots);
  const groups: Map<string, GroupedDateSlots> = new Map();

  sorted.forEach(slot => {
    const sortKey = parseDateSortKey(slot);
    const key = `${sortKey}_${slot.section || ''}_${slot.dateLabel || slot.date}`;
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

export const FINNISH_WEEKDAYS = [
  'Sunnuntai',
  'Maanantai',
  'Tiistai',
  'Keskiviikko',
  'Torstai',
  'Perjantai',
  'Lauantai',
];

export const FINNISH_MONTHS = [
  'Tammikuu',
  'Helmikuu',
  'Maaliskuu',
  'Huhtikuu',
  'Toukokuu',
  'Kesäkuu',
  'Heinäkuu',
  'Elokuu',
  'Syyskuu',
  'Lokakuu',
  'Marraskuu',
  'Joulukuu',
];

export function formatFinnishDateLabel(isoDateStr: string): string {
  const d = new Date(isoDateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return isoDateStr;
  const weekday = FINNISH_WEEKDAYS[d.getDay()];
  const dayNum = d.getDate();
  const monthNum = d.getMonth() + 1;
  return `${weekday} ${dayNum}.${monthNum}.`;
}

/**
 * Calculates the next business day (arkipäivä):
 * - If Thursday -> Friday
 * - If Friday -> Monday (skips weekend)
 * - If Saturday -> Monday
 * - If Sunday -> Monday
 */
export function getNextBusinessDay(isoDateStr: string): {
  isoDate: string;
  dateLabel: string;
  section: string;
} {
  const d = new Date(isoDateStr + 'T12:00:00');
  if (isNaN(d.getTime())) {
    const today = new Date();
    return {
      isoDate: today.toISOString().split('T')[0],
      dateLabel: formatFinnishDateLabel(today.toISOString().split('T')[0]),
      section: FINNISH_MONTHS[today.getMonth()],
    };
  }

  // Advance by 1 day
  d.setDate(d.getDate() + 1);

  // If Saturday (6) -> skip to Monday
  if (d.getDay() === 6) {
    d.setDate(d.getDate() + 2);
  } else if (d.getDay() === 0) {
    // If Sunday (0) -> skip to Monday
    d.setDate(d.getDate() + 1);
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const nextIso = `${yyyy}-${mm}-${dd}`;
  const label = `${FINNISH_WEEKDAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
  const monthName = FINNISH_MONTHS[d.getMonth()];

  return {
    isoDate: nextIso,
    dateLabel: label,
    section: monthName,
  };
}

