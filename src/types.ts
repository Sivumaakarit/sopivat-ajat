export interface TimeSlot {
  id: string;
  date: string; // YYYY-MM-DD or formatted date string
  dateLabel?: string; // e.g. "Torstai 12.11."
  startTime: string; // "13:15"
  endTime: string; // "13:35"
  section?: string; // Optional group like "Ennen joulua" or "Joululoman jälkeen"
  assignedStudentId?: string | null;
}

export interface ScheduleEvent {
  id: string;
  adminToken: string;
  title: string;
  instructions: string;
  imageUrl?: string;
  slotDurationMinutes: number;
  minSelectionsRequired: number;
  deadlineDate: string;
  teacherName: string;
  slots: TimeSlot[];
  isLocked: boolean;
}

export interface StudentSubmission {
  id: string;
  eventId: string;
  firstName: string;
  lastNameInitial: string;
  selectedSlotIds: string[];
  submittedAt: string;
}

export type ViewMode = 'creator' | 'parent' | 'matching' | 'print' | 'public';
