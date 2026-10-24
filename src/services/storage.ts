import type { ScheduleEvent, StudentSubmission } from '../types';

export const SNOOPY_ILLUSTRATION = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 200" fill="none" stroke="%231e293b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
  <!-- Cute Snoopy-style puppy reading on roof -->
  <path d="M40 160 L80 120 L120 160 Z" fill="%23ef4444" stroke="%23b91c1c"/>
  <rect x="50" y="160" width="60" height="35" fill="%23dc2626" stroke="%23b91c1c"/>
  <!-- Dog body lying on roof -->
  <ellipse cx="80" cy="115" rx="30" ry="14" fill="white"/>
  <!-- Dog head -->
  <ellipse cx="65" cy="100" rx="16" ry="12" fill="white"/>
  <circle cx="53" cy="98" r="4" fill="%231e293b"/>
  <!-- Ear -->
  <path d="M72 95 C78 90 85 105 76 112 Z" fill="%231e293b"/>
  <!-- Nose -->
  <ellipse cx="50" cy="99" rx="3" ry="2.5" fill="%231e293b"/>
  <!-- Feet -->
  <ellipse cx="98" cy="115" rx="8" ry="6" fill="white"/>
  <path d="M96 118 L104 118"/>
  <path d="M96 114 L104 114"/>
  <!-- Book -->
  <path d="M52 118 L62 124 L72 118" stroke="%233b82f6" stroke-width="2.5" fill="none"/>
</svg>`;

// Clean initial state with ZERO days and ZERO submissions
export const INITIAL_EVENT: ScheduleEvent = {
  id: 'arviointi-' + Date.now(),
  adminToken: 'opettaja-sala-avain',
  title: 'Arviointikeskustelujen varaukset',
  instructions:
    'Heippa!\n\nOn aika aloittaa lukuvuoden arviointikeskustelut. Yhteiseen keskusteluun osallistuvat oppilas, opettaja ja kodin edustaja. Tapaamiset järjestetään luokassamme.\n\nAlla on listattuna mahdollisia aikoja. Rastittakaa KAIKKI ne vaihtoehdot, jotka ovat teille sopivia. Vähintään kuitenkin 3 aikaa.\n\nVahvistan teille varatun ajan Wilma-viestillä.\n\nYstävällisin terveisin Esko',
  imageUrl: SNOOPY_ILLUSTRATION,
  slotDurationMinutes: 20,
  minSelectionsRequired: 3,
  deadlineDate: '',
  teacherName: 'Esko',
  isLocked: false,
  slots: [], // Täysin tyhjä: ei mitään valmiita päiviä tai aikoja
};

export const INITIAL_SUBMISSIONS: StudentSubmission[] = []; // Täysin tyhjä: ei yhtään valmista vastausta

const STORAGE_KEY_EVENT = 'sopivat_ajat_clean_event_v3';
const STORAGE_KEY_SUBMISSIONS = 'sopivat_ajat_clean_submissions_v3';

export function getEvent(): ScheduleEvent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVENT);
    if (!raw) {
      saveEvent(INITIAL_EVENT);
      return INITIAL_EVENT;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_EVENT;
  }
}

export function saveEvent(event: ScheduleEvent): void {
  try {
    localStorage.setItem(STORAGE_KEY_EVENT, JSON.stringify(event));
  } catch (err) {
    console.error('Virhe tallentaessa tapahtumaa:', err);
  }
}

export function getSubmissions(): StudentSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
    if (!raw) {
      saveSubmissions(INITIAL_SUBMISSIONS);
      return INITIAL_SUBMISSIONS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_SUBMISSIONS;
  }
}

export function saveSubmissions(subs: StudentSubmission[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(subs));
  } catch (err) {
    console.error('Virhe tallentaessa vastauksia:', err);
  }
}

export function addSubmission(sub: Omit<StudentSubmission, 'id' | 'submittedAt'>): StudentSubmission {
  const all = getSubmissions();
  const newSub: StudentSubmission = {
    ...sub,
    id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    submittedAt: new Date().toISOString(),
  };
  all.push(newSub);
  saveSubmissions(all);
  return newSub;
}

export function assignStudentToSlot(slotId: string, studentId: string | null): ScheduleEvent {
  const event = getEvent();
  event.slots = event.slots.map(s => {
    // If student was already assigned elsewhere, unassign them first (conflict prevention)
    if (studentId && s.assignedStudentId === studentId && s.id !== slotId) {
      return { ...s, assignedStudentId: null };
    }
    if (s.id === slotId) {
      return { ...s, assignedStudentId: studentId };
    }
    return s;
  });
  saveEvent(event);
  return event;
}

export function resetAllData(): void {
  localStorage.removeItem(STORAGE_KEY_EVENT);
  localStorage.removeItem(STORAGE_KEY_SUBMISSIONS);
  localStorage.removeItem('sopivat_ajat_clean_event_v2');
  localStorage.removeItem('sopivat_ajat_clean_submissions_v2');
  localStorage.removeItem('sopivat_ajat_event');
  localStorage.removeItem('sopivat_ajat_submissions');
}
