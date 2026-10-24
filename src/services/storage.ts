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

export const INITIAL_EVENT: ScheduleEvent = {
  id: 'arviointi-syksy-2026',
  adminToken: 'opettaja-sala-avain',
  title: 'Arviointikeskustelujen varaukset syksy 2026',
  instructions:
    'Heippa!\n\nOn aika aloittaa lukuvuoden arviointikeskustelut. Yhteiseen keskusteluun osallistuvat oppilas, opettaja ja kodin edustaja. Tapaamiset järjestetään luokassamme.\n\nAlla on listattuna mahdollisia aikoja. Rastittakaa KAIKKI ne vaihtoehdot, jotka ovat teille sopivia. Vähintään kuitenkin 3 aikaa.\n\nPalautathan toiveesi viimeistään keskiviikkona 28.10.\nVahvistan teille varatun ajan Wilma-viestillä.\n\nYstävällisin terveisin Esko',
  imageUrl: SNOOPY_ILLUSTRATION,
  slotDurationMinutes: 20,
  minSelectionsRequired: 3,
  deadlineDate: 'Keskiviikko 28.10.',
  teacherName: 'Esko',
  isLocked: false,
  slots: [
    // Syksy
    { id: 's1', date: '2026-11-12', dateLabel: 'Torstai 12.11.', startTime: '13:15', endTime: '13:35', section: 'Marraskuu' },
    { id: 's2', date: '2026-11-12', dateLabel: 'Torstai 12.11.', startTime: '13:35', endTime: '13:50', section: 'Marraskuu' },
    { id: 's3', date: '2026-11-12', dateLabel: 'Torstai 12.11.', startTime: '13:50', endTime: '14:10', section: 'Marraskuu' },

    { id: 's4', date: '2026-11-16', dateLabel: 'Maanantai 16.11.', startTime: '14:00', endTime: '14:20', section: 'Marraskuu' },
    { id: 's5', date: '2026-11-16', dateLabel: 'Maanantai 16.11.', startTime: '14:20', endTime: '14:40', section: 'Marraskuu' },
    { id: 's6', date: '2026-11-16', dateLabel: 'Maanantai 16.11.', startTime: '14:40', endTime: '15:00', section: 'Marraskuu' },

    { id: 's7', date: '2026-11-17', dateLabel: 'Tiistai 17.11.', startTime: '13:15', endTime: '13:35', section: 'Marraskuu' },
    { id: 's8', date: '2026-11-17', dateLabel: 'Tiistai 17.11.', startTime: '13:35', endTime: '13:50', section: 'Marraskuu' },
    { id: 's9', date: '2026-11-17', dateLabel: 'Tiistai 17.11.', startTime: '13:50', endTime: '14:10', section: 'Marraskuu' },

    { id: 's10', date: '2026-11-19', dateLabel: 'Torstai 19.11.', startTime: '13:15', endTime: '13:35', section: 'Marraskuu' },
    { id: 's11', date: '2026-11-19', dateLabel: 'Torstai 19.11.', startTime: '13:35', endTime: '13:50', section: 'Marraskuu' },
    { id: 's12', date: '2026-11-19', dateLabel: 'Torstai 19.11.', startTime: '13:50', endTime: '14:10', section: 'Marraskuu' },

    // Joululoman jälkeen
    { id: 's13', date: '2027-01-07', dateLabel: 'Torstai 7.1.', startTime: '13:15', endTime: '13:35', section: 'Joululoman jälkeen' },
    { id: 's14', date: '2027-01-07', dateLabel: 'Torstai 7.1.', startTime: '13:35', endTime: '13:50', section: 'Joululoman jälkeen' },
    { id: 's15', date: '2027-01-07', dateLabel: 'Torstai 7.1.', startTime: '13:50', endTime: '14:10', section: 'Joululoman jälkeen' },

    { id: 's16', date: '2027-01-11', dateLabel: 'Maanantai 11.1.', startTime: '14:00', endTime: '14:20', section: 'Joululoman jälkeen' },
    { id: 's17', date: '2027-01-11', dateLabel: 'Maanantai 11.1.', startTime: '14:20', endTime: '14:40', section: 'Joululoman jälkeen' },
    { id: 's18', date: '2027-01-11', dateLabel: 'Maanantai 11.1.', startTime: '14:40', endTime: '15:00', section: 'Joululoman jälkeen' },

    { id: 's19', date: '2027-01-12', dateLabel: 'Tiistai 12.1.', startTime: '13:15', endTime: '13:35', section: 'Joululoman jälkeen' },
    { id: 's20', date: '2027-01-12', dateLabel: 'Tiistai 12.1.', startTime: '13:35', endTime: '13:50', section: 'Joululoman jälkeen' },
    { id: 's21', date: '2027-01-12', dateLabel: 'Tiistai 12.1.', startTime: '13:50', endTime: '14:10', section: 'Joululoman jälkeen' },

    { id: 's22', date: '2027-01-14', dateLabel: 'Torstai 14.1.', startTime: '13:15', endTime: '13:35', section: 'Joululoman jälkeen' },
    { id: 's23', date: '2027-01-14', dateLabel: 'Torstai 14.1.', startTime: '13:35', endTime: '13:50', section: 'Joululoman jälkeen' },
    { id: 's24', date: '2027-01-14', dateLabel: 'Torstai 14.1.', startTime: '13:50', endTime: '14:10', section: 'Joululoman jälkeen' },
  ],
};

export const INITIAL_SUBMISSIONS: StudentSubmission[] = [
  {
    id: 'sub-1',
    eventId: 'arviointi-syksy-2026',
    firstName: 'Matti',
    lastNameInitial: 'M',
    selectedSlotIds: ['s1', 's2', 's3', 's7', 's8'],
    submittedAt: '2026-10-24T09:12:00Z',
  },
  {
    id: 'sub-2',
    eventId: 'arviointi-syksy-2026',
    firstName: 'Emma',
    lastNameInitial: 'K',
    selectedSlotIds: ['s1', 's4', 's5', 's10'],
    submittedAt: '2026-10-24T10:04:00Z',
  },
  {
    id: 'sub-3',
    eventId: 'arviointi-syksy-2026',
    firstName: 'Veeti',
    lastNameInitial: 'L',
    selectedSlotIds: ['s2', 's3', 's6', 's11', 's12'],
    submittedAt: '2026-10-24T11:30:00Z',
  },
  {
    id: 'sub-4',
    eventId: 'arviointi-syksy-2026',
    firstName: 'Aada',
    lastNameInitial: 'R',
    selectedSlotIds: ['s13', 's14', 's15', 's16'],
    submittedAt: '2026-10-24T12:15:00Z',
  },
  {
    id: 'sub-5',
    eventId: 'arviointi-syksy-2026',
    firstName: 'Esko',
    lastNameInitial: 'K',
    selectedSlotIds: ['s1', 's7', 's10', 's13'],
    submittedAt: '2026-10-24T14:40:00Z',
  },
  {
    id: 'sub-6',
    eventId: 'arviointi-syksy-2026',
    firstName: 'Sofia',
    lastNameInitial: 'H',
    selectedSlotIds: ['s4', 's5', 's6', 's16', 's17', 's18'],
    submittedAt: '2026-10-24T15:20:00Z',
  },
  {
    id: 'sub-7',
    eventId: 'arviointi-syksy-2026',
    firstName: 'Oliver',
    lastNameInitial: 'T',
    selectedSlotIds: ['s7', 's8', 's9', 's19', 's20'],
    submittedAt: '2026-10-24T16:05:00Z',
  },
];

const STORAGE_KEY_EVENT = 'sopivat_ajat_event';
const STORAGE_KEY_SUBMISSIONS = 'sopivat_ajat_submissions';

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
}
