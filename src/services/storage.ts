import type { ScheduleEvent, StudentSubmission } from '../types';
import { supabase } from './supabaseClient';
import { sortSlotsChronologically } from '../utils/timeUtils';

// Official 'Sopivat ajat' Calendar Logo (SVG in public/logo.svg)
export const SOPIVAT_AJAT_LOGO = '/logo.svg';
// Alias for backwards compatibility
export const SNOOPY_ILLUSTRATION = SOPIVAT_AJAT_LOGO;

export function normalizeImageUrl(imageUrl?: string): string {
  // If missing, or if it points to the deprecated Snoopy drawing, migrate to the official Sopivat ajat logo
  if (!imageUrl || imageUrl.includes('snoopy') || imageUrl.includes('L40 160') || imageUrl.includes('data:image/svg+xml')) {
    return SOPIVAT_AJAT_LOGO;
  }
  return imageUrl;
}

// Clean initial state with ZERO days and ZERO submissions
export const INITIAL_EVENT: ScheduleEvent = {
  id: 'arviointi-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
  adminToken: 'opettaja-sala-avain',
  title: 'Arviointikeskustelujen varaukset',
  instructions:
    'Heippa!\n\nOn aika aloittaa lukuvuoden arviointikeskustelut. Yhteiseen keskusteluun osallistuvat oppilas, opettaja ja kodin edustaja(t). Tapaamiset järjestetään luokassamme.\n\nAlla on listattuna mahdollisia aikoja. Rastittakaa KAIKKI ne vaihtoehdot, jotka ovat teille sopivia. Vähintään kuitenkin 3 aikaa.\n\nVahvistan teille varatun ajan Wilma-viestillä.\n\nYstävällisin terveisin Esko',
  imageUrl: SOPIVAT_AJAT_LOGO,
  slotDurationMinutes: 20,
  minSelectionsRequired: 3,
  deadlineDate: '',
  teacherName: 'Esko',
  isLocked: false,
  isPublished: false,
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
    parsed.imageUrl = normalizeImageUrl(parsed.imageUrl);
    parsed.isPublished = Boolean(parsed.isPublished);
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
  event.imageUrl = normalizeImageUrl(event.imageUrl);
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
  const normalizedImg = normalizeImageUrl(event.imageUrl);
  const deadlineValue = (event.isPublished ? 'PUBLISHED::' : '') + (event.deadlineDate || '');

  try {
    const { error } = await supabase.from('events').upsert({
      id: event.id,
      admin_token: event.adminToken,
      title: event.title,
      instructions: normalizedInstructions,
      image_url: normalizedImg,
      slot_duration_minutes: event.slotDurationMinutes,
      min_selections_required: event.minSelectionsRequired,
      deadline_date: deadlineValue,
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

    const rawDeadline = data.deadline_date || '';
    const isPublished = rawDeadline.startsWith('PUBLISHED::');
    const deadlineDate = rawDeadline.replace('PUBLISHED::', '');

    return {
      id: data.id,
      adminToken: data.admin_token || '',
      title: data.title,
      instructions: normalizeInstructions(data.instructions || ''),
      imageUrl: normalizeImageUrl(data.image_url),
      slotDurationMinutes: data.slot_duration_minutes || 20,
      minSelectionsRequired: data.min_selections_required || 3,
      deadlineDate: deadlineDate,
      teacherName: data.teacher_name || '',
      slots: sortSlotsChronologically(data.slots || []),
      isLocked: data.is_locked || false,
      isPublished: isPublished,
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

export function createNewOfficialEvent(keepSlots: boolean = true): ScheduleEvent {
  const current = getEvent();
  const cleanSlots = keepSlots
    ? current.slots.map(s => ({ ...s, assignedStudentId: null }))
    : [];
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const newId = 'kysely-' + Date.now().toString(36) + '-' + randomSuffix;
  const newAdminToken = 'ope-' + Math.random().toString(36).substring(2, 8) + '-' + Math.random().toString(36).substring(2, 8);

  const newEvent: ScheduleEvent = {
    ...current,
    id: newId,
    adminToken: newAdminToken,
    isLocked: false,
    isPublished: false,
    slots: cleanSlots,
  };

  saveEvent(newEvent);
  saveSubmissions([]);
  return newEvent;
}

