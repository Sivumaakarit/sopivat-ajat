import type { ScheduleEvent, StudentSubmission } from '../types';
import { supabase } from './supabaseClient';
import { sortSlotsChronologically } from '../utils/timeUtils';

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
  id: 'arviointi-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
  adminToken: 'opettaja-sala-avain',
  title: 'Arviointikeskustelujen varaukset',
  instructions:
    'Heippa!\n\nOn aika aloittaa lukuvuoden arviointikeskustelut. Yhteiseen keskusteluun osallistuvat oppilas, opettaja ja kodin edustaja(t). Tapaamiset järjestetään luokassamme.\n\nAlla on listattuna mahdollisia aikoja. Rastittakaa KAIKKI ne vaihtoehdot, jotka ovat teille sopivia. Vähintään kuitenkin 3 aikaa.\n\nVahvistan teille varatun ajan Wilma-viestillä.\n\nYstävällisin terveisin Esko',
  imageUrl: SNOOPY_ILLUSTRATION,
  slotDurationMinutes: 20,
  minSelectionsRequired: 3,
  deadlineDate: '',
  teacherName: 'Esko',
  isLocked: false,
  slots: [],
};

export const INITIAL_SUBMISSIONS: StudentSubmission[] = [];

const STORAGE_KEY_EVENT = 'sopivat_ajat_clean_event_v3';
const STORAGE_KEY_SUBMISSIONS = 'sopivat_ajat_clean_submissions_v3';

export function normalizeInstructions(instructions: string): string {
  if (!instructions) return instructions;
  let text = instructions;
  // Ensure the participants sentence follows exact format:
  // "Yhteiseen keskusteluun osallistuvat oppilas, opettaja ja kodin edustaja(t)."
  text = text.replace(
    /Yhteiseen keskusteluun osallistuvat[^\n.]+([.]?)/g,
    'Yhteiseen keskusteluun osallistuvat oppilas, opettaja ja kodin edustaja(t).'
  );
  text = text.replace('kodin edustaja.', 'kodin edustaja(t).');
  return text;
}

export function getEvent(): ScheduleEvent {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVENT);
    if (!raw) {
      saveEvent(INITIAL_EVENT);
      return INITIAL_EVENT;
    }
    const parsed: ScheduleEvent = JSON.parse(raw);
    parsed.slots = sortSlotsChronologically(parsed.slots || []);
    if (parsed.instructions) {
      parsed.instructions = normalizeInstructions(parsed.instructions);
    }
    return parsed;
  } catch {
    return INITIAL_EVENT;
  }
}

export function saveEvent(event: ScheduleEvent): void {
  // Always guarantee slots are chronologically sorted across the entire app
  event.slots = sortSlotsChronologically(event.slots || []);
  if (event.instructions) {
    event.instructions = normalizeInstructions(event.instructions);
  }

  try {
    localStorage.setItem(STORAGE_KEY_EVENT, JSON.stringify(event));
  } catch (err) {
    console.error('Virhe tallentaessa tapahtumaa paikallisesti:', err);
  }

  // Asynchronous cloud sync to Supabase (silent & non-blocking)
  saveEventToCloud(event).catch(err => {
    console.warn('Supabase taustasynkronointi:', err);
  });
}

export async function saveEventToCloud(event: ScheduleEvent): Promise<boolean> {
  const sortedSlots = sortSlotsChronologically(event.slots || []);
  const normalizedInstructions = normalizeInstructions(event.instructions || '');
  try {
    const { error } = await supabase.from('events').upsert({
      id: event.id,
      admin_token: event.adminToken,
      title: event.title,
      instructions: normalizedInstructions,
      image_url: event.imageUrl,
      slot_duration_minutes: event.slotDurationMinutes,
      min_selections_required: event.minSelectionsRequired,
      deadline_date: event.deadlineDate,
      teacher_name: event.teacherName,
      slots: sortedSlots,
      is_locked: event.isLocked,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.warn('Pilvitallennus epäonnistui:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Verkkovirhe pilvitallennuksessa:', e);
    return false;
  }
}

export async function fetchEventFromCloud(id: string): Promise<ScheduleEvent | null> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      adminToken: data.admin_token || '',
      title: data.title,
      instructions: normalizeInstructions(data.instructions || ''),
      imageUrl: data.image_url || '',
      slotDurationMinutes: data.slot_duration_minutes || 20,
      minSelectionsRequired: data.min_selections_required || 3,
      deadlineDate: data.deadline_date || '',
      teacherName: data.teacher_name || '',
      slots: sortSlotsChronologically(data.slots || []),
      isLocked: data.is_locked || false,
    };
  } catch {
    return null;
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
    console.error('Virhe tallentaessa vastauksia paikallisesti:', err);
  }
}

export async function fetchSubmissionsFromCloud(eventId: string): Promise<StudentSubmission[]> {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('event_id', eventId);

    if (error || !data) return [];

    return data.map(d => ({
      id: d.id,
      eventId: d.event_id,
      firstName: d.first_name,
      lastNameInitial: d.last_name_initial,
      selectedSlotIds: d.selected_slot_ids || [],
      submittedAt: d.submitted_at,
    }));
  } catch {
    return [];
  }
}

export function addSubmission(sub: Omit<StudentSubmission, 'id' | 'submittedAt'>): StudentSubmission {
  const res = upsertSubmission(sub);
  return res.submission;
}

export function upsertSubmission(sub: Omit<StudentSubmission, 'id' | 'submittedAt'>): {
  submission: StudentSubmission;
  isUpdate: boolean;
  allSubmissions: StudentSubmission[];
} {
  const all = getSubmissions();
  const cleanFirst = sub.firstName.trim().toLowerCase();
  const cleanInitial = sub.lastNameInitial.trim().toUpperCase().replace('.', '');

  const existingIndex = all.findIndex(
    s =>
      s.firstName.trim().toLowerCase() === cleanFirst &&
      s.lastNameInitial.trim().toUpperCase().replace('.', '') === cleanInitial
  );

  let resultSubmission: StudentSubmission;
  let isUpdate = false;

  if (existingIndex >= 0) {
    const updated: StudentSubmission = {
      ...all[existingIndex],
      selectedSlotIds: sub.selectedSlotIds,
      submittedAt: new Date().toISOString(),
    };
    all[existingIndex] = updated;
    resultSubmission = updated;
    isUpdate = true;
  } else {
    const newSub: StudentSubmission = {
      ...sub,
      id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      submittedAt: new Date().toISOString(),
    };
    all.push(newSub);
    resultSubmission = newSub;
  }

  saveSubmissions(all);

  // Sync to Supabase cloud in background
  supabase
    .from('submissions')
    .upsert({
      id: resultSubmission.id,
      event_id: resultSubmission.eventId,
      first_name: resultSubmission.firstName,
      last_name_initial: resultSubmission.lastNameInitial,
      selected_slot_ids: resultSubmission.selectedSlotIds,
      submitted_at: resultSubmission.submittedAt,
    })
    .then(({ error }) => {
      if (error) console.warn('Supabase vastaustallennus epäonnistui:', error.message);
    });

  return { submission: resultSubmission, isUpdate, allSubmissions: all };
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
