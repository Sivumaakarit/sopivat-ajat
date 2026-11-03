import React, { useState } from 'react';
import type { ScheduleEvent, StudentSubmission, ViewMode, TimeSlot } from '../types';
import { getStudentDisplayName, sortSlotsChronologically } from '../utils/timeUtils';
import { assignStudentToSlot, saveEvent, addSubmission, createNewOfficialEvent } from '../services/storage';
import confetti from 'canvas-confetti';
import {
  CheckCircle,
  Clock,
  Copy,
  Check,
  Users,
  AlertCircle,
  Sparkles,
  Wand2,
  RotateCcw,
  PlusCircle,
  X,
  ArrowLeftRight,
  ArrowRight,
  Lock,
  Unlock,
  Send,
  Key,
  Share2,
  Globe,
} from 'lucide-react';

interface MatchingViewProps {
  event: ScheduleEvent;
  submissions: StudentSubmission[];
  onEventUpdated: (updated: ScheduleEvent) => void;
  onNavigate?: (view: ViewMode) => void;
}

export const MatchingView: React.FC<MatchingViewProps> = ({
  event,
  submissions,
  onEventUpdated,
  onNavigate,
}) => {
  const [copiedWilma, setCopiedWilma] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [filterDay, setFilterDay] = useState<string>('ALL');

  // Hovered / selected student for live slot highlighting
  const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null);

  // Manual student entry modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualFirst, setManualFirst] = useState('');
  const [manualInitial, setManualInitial] = useState('');
  const [manualSlots, setManualSlots] = useState<string[]>([]);

  // New official survey modal
  const [showNewSurveyModal, setShowNewSurveyModal] = useState(false);
  const [newSurveyKeepSlots, setNewSurveyKeepSlots] = useState(true);
  const [createdSurveyLinks, setCreatedSurveyLinks] = useState<{ adminUrl: string; parentUrl: string } | null>(null);
  const [copiedAdminLink, setCopiedAdminLink] = useState(false);
  const [copiedParentLink, setCopiedParentLink] = useState(false);

  // Auto-solve settings modal
  const [showAutoSolveModal, setShowAutoSolveModal] = useState(false);
  const [autoSolveMode, setAutoSolveMode] = useState<'balanced' | 'packed'>('balanced');
  const [autoSolveAllowGaps, setAutoSolveAllowGaps] = useState(false);
  const [autoSolveFallbackToFill, setAutoSolveFallbackToFill] = useState(true);
  const [autoSolveResetAll, setAutoSolveResetAll] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Set of valid student IDs currently present in submissions
  const validSubmissionIds = new Set(submissions.map(s => s.id));

  // Map of student IDs that have been assigned somewhere (studentId -> slotId)
  const assignedStudentMap = new Map<string, string>();
  event.slots.forEach(slot => {
    if (slot.assignedStudentId && validSubmissionIds.has(slot.assignedStudentId)) {
      assignedStudentMap.set(slot.assignedStudentId, slot.id);
    }
  });

  const assignedCount = submissions.filter(sub => assignedStudentMap.has(sub.id)).length;
  const unassignedSubmissions = submissions.filter(sub => !assignedStudentMap.has(sub.id));
  const progressPercent = submissions.length > 0 ? Math.min(100, Math.round((assignedCount / submissions.length) * 100)) : 0;

  // Selected or hovered student details
  const activeStudent = submissions.find(s => s.id === hoveredStudentId);
  const activeStudentWishedSlots = activeStudent ? activeStudent.selectedSlotIds : [];
  const activeStudentAssignedSlotId = hoveredStudentId ? assignedStudentMap.get(hoveredStudentId) : null;

  // Smart suggestions for unassigned students (direct free slot or 1-step swap)
  interface SmartSuggestion {
    type: 'free_slot' | 'relocation' | 'no_direct';
    student: StudentSubmission;
    freeSlot?: TimeSlot;
    displacedStudent?: StudentSubmission;
    occupiedSlot?: TimeSlot;
    altSlot?: TimeSlot;
  }

  const smartSuggestions: SmartSuggestion[] = React.useMemo(() => {
    const result: SmartSuggestion[] = [];
    if (unassignedSubmissions.length === 0) return result;

    for (const student of unassignedSubmissions) {
      // 1. Check if student has a direct free slot among their desires
      const directFreeSlots = event.slots.filter(
        s => student.selectedSlotIds.includes(s.id) && !s.assignedStudentId
      );

      if (directFreeSlots.length > 0) {
        result.push({
          type: 'free_slot',
          student,
          freeSlot: directFreeSlots[0],
        });
        continue;
      }

      // 2. 1-step relocation: can someone on a desired slot move to another free slot they wished for?
      let foundRelocation = false;
      for (const slotId of student.selectedSlotIds) {
        const occupiedSlot = event.slots.find(s => s.id === slotId);
        if (!occupiedSlot || !occupiedSlot.assignedStudentId) continue;

        const occupant = submissions.find(s => s.id === occupiedSlot.assignedStudentId);
        if (!occupant) continue;

        const altFreeSlot = event.slots.find(
          s => s.id !== occupiedSlot.id && !s.assignedStudentId && occupant.selectedSlotIds.includes(s.id)
        );

        if (altFreeSlot) {
          result.push({
            type: 'relocation',
            student,
            displacedStudent: occupant,
            occupiedSlot,
            altSlot: altFreeSlot,
          });
          foundRelocation = true;
          break;
        }
      }

      if (!foundRelocation) {
        result.push({
          type: 'no_direct',
          student,
        });
      }
    }

    return result;
  }, [unassignedSubmissions, event.slots, submissions]);

  const handleSelectStudent = (slotId: string, studentId: string | null) => {
    const targetSlot = event.slots.find(s => s.id === slotId);
    const existingStudentId = targetSlot?.assignedStudentId;

    if (studentId && existingStudentId && existingStudentId !== studentId) {
      // Slot already had a student! Check if existing student has remaining options
      const displaced = submissions.find(s => s.id === existingStudentId);
      const newStudent = submissions.find(s => s.id === studentId);

      if (displaced) {
        const remainingFreeWishes = displaced.selectedSlotIds.filter(sid => {
          const s = event.slots.find(slot => slot.id === sid);
          return s && (!s.assignedStudentId || s.id === slotId);
        });

        if (remainingFreeWishes.length <= 1) {
          const confirmed = window.confirm(
            `⚠️ VAROITUS: Jos siirrät oppilaan "${newStudent?.firstName}" tähän aikaan, "${displaced.firstName}" jää kokonaan ilman aikaa eikä hänellä ole enää yhtään muuta vapaata toivetta kalenterissa!\n\nHaluatko silti jyrätä tämän ajan ${newStudent?.firstName}lle?`
          );
          if (!confirmed) return;
        }
      }
    }

    const updated = assignStudentToSlot(slotId, studentId || null);
    onEventUpdated(updated);
  };

  // Swap two students' slots
  const handleSwapStudents = (studentAId: string, slotAId: string, studentBId: string, slotBId: string) => {
    const newSlots = event.slots.map(s => {
      if (s.id === slotAId) {
        return { ...s, assignedStudentId: studentBId };
      }
      if (s.id === slotBId) {
        return { ...s, assignedStudentId: studentAId };
      }
      return s;
    });

    const updated = { ...event, slots: newSlots };
    saveEvent(updated);
    onEventUpdated(updated);

    const studentA = submissions.find(s => s.id === studentAId);
    const studentB = submissions.find(s => s.id === studentBId);
    showToast(`Vaihdettiin päittäin: ${studentA?.firstName} ⇄ ${studentB?.firstName}`);
  };

  // Handle direct assignment of unassigned student to a free wished slot
  const handleAssignFreeSlot = (studentId: string, slotId: string) => {
    const updated = assignStudentToSlot(slotId, studentId);
    onEventUpdated(updated);
    const student = submissions.find(s => s.id === studentId);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    showToast(`✨ ${student?.firstName || 'Oppilas'} sijoitettu vapaaseen aikaan!`);
  };

  // Handle smart relocation: move occupant to an alternative free slot, and assign target slot to new student
  const handleApplyRelocation = (
    newStudentId: string,
    targetSlotId: string,
    occupantId: string,
    altSlotId: string
  ) => {
    const newSlots = event.slots.map(s => {
      if (s.id === targetSlotId) {
        return { ...s, assignedStudentId: newStudentId };
      }
      if (s.id === altSlotId) {
        return { ...s, assignedStudentId: occupantId };
      }
      return s;
    });

    const updated = { ...event, slots: newSlots };
    saveEvent(updated);
    onEventUpdated(updated);

    const newStudent = submissions.find(s => s.id === newStudentId);
    const occupant = submissions.find(s => s.id === occupantId);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    showToast(`✨ Siirto tehty! ${occupant?.firstName} siirrettiin toiseen toiveeseensa ja ${newStudent?.firstName} sai ajan!`);
  };

  // Re-run solver for all students from clean slate
  const handleReSolveAll = () => {
    if (
      window.confirm(
        'Haluatko suorittaa automaattisovituksen uudelleen kaikille oppilaille? Järjestelmä jakaa kaikki toiveet (myös uudet vastaukset) parhaisiin aikoihin puhtaalta pöydältä.'
      )
    ) {
      executeAutoSolve('balanced', false, true, true);
    }
  };

  // Magic Auto-Solver with balanced distribution support
  const handleAutoSolve = () => {
    if (unassignedSubmissions.length > 0 && assignedCount > 0) {
      setAutoSolveResetAll(true);
    }
    setShowAutoSolveModal(true);
  };

  const executeAutoSolve = (
    mode: 'balanced' | 'packed',
    allowGaps: boolean,
    _fallbackToFill: boolean,
    resetAllFirst: boolean = false
  ) => {
    const newSlots = event.slots.map(s => ({
      ...s,
      assignedStudentId: resetAllFirst ? null : s.assignedStudentId,
    }));
    const currentlyAssigned = new Set<string>();

    newSlots.forEach(s => {
      if (s.assignedStudentId) currentlyAssigned.add(s.assignedStudentId);
    });

    const unassignedStudents = submissions.filter(s => !currentlyAssigned.has(s.id));
    if (unassignedStudents.length === 0) {
      setShowAutoSolveModal(false);
      showToast('Kaikki oppilaat on jo sijoitettu.');
      return;
    }

    const availableSlots = newSlots.filter(s => !s.assignedStudentId);

    // Group and sort slots chronologically per day
    const daySlotsMap = new Map<string, TimeSlot[]>();
    newSlots.forEach(slot => {
      const dayKey = slot.dateLabel || slot.date;
      if (!daySlotsMap.has(dayKey)) {
        daySlotsMap.set(dayKey, []);
      }
      daySlotsMap.get(dayKey)!.push(slot);
    });

    daySlotsMap.forEach(daySlots => {
      daySlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });

    // Map each slot ID to its day and index within that day
    const slotMetaMap = new Map<string, { dayKey: string; index: number; totalInDay: number }>();
    daySlotsMap.forEach((daySlots, dayKey) => {
      daySlots.forEach((slot, index) => {
        slotMetaMap.set(slot.id, { dayKey, index, totalInDay: daySlots.length });
      });
    });

    // Target caps per day (in balanced mode: leave the last slot free!)
    const dayCapMap = new Map<string, number>();
    daySlotsMap.forEach((daySlots, dayKey) => {
      const total = daySlots.length;
      if (mode === 'balanced') {
        if (total === 1) dayCapMap.set(dayKey, 1);
        else if (total === 2) dayCapMap.set(dayKey, 2);
        else if (total === 3) dayCapMap.set(dayKey, 2); // 2 first, 3rd free!
        else if (total === 4) dayCapMap.set(dayKey, 3); // 3 first, 4th free!
        else dayCapMap.set(dayKey, total - 1); // always leaves last slot free!
      } else {
        dayCapMap.set(dayKey, total);
      }
    });

    // Heuristic preference score for a slot given current assignments
    const getSlotPreference = (slot: TimeSlot, currentMatches: Map<string, string>): number => {
      const meta = slotMetaMap.get(slot.id);
      if (!meta) return 0;
      let score = 0;

      const currentDayAssignedIndices: number[] = [];
      const daySlots = daySlotsMap.get(meta.dayKey) || [];
      daySlots.forEach((s, idx) => {
        if (s.assignedStudentId || currentMatches.has(s.id)) {
          currentDayAssignedIndices.push(idx);
        }
      });

      const cap = dayCapMap.get(meta.dayKey) || meta.totalInDay;

      // 1. Mandatory requirement: ALWAYS start at day's first slot (index 0) without gaps
      if (meta.index === 0) {
        // Enormous priority for the very first slot of the day (e.g. 14:00)
        score += 10000;
      } else {
        // If this is a later slot (index > 0):
        const hasSlotZero = currentDayAssignedIndices.includes(0);
        if (!hasSlotZero) {
          // Severely penalize picking later slots when slot 0 is not yet filled!
          score -= allowGaps ? 1000 : 8000;
        } else {
          // Slot 0 is filled. Reward continuous consecutive block from index 0 onwards!
          const isImmediateNext = currentDayAssignedIndices.includes(meta.index - 1);
          if (isImmediateNext) {
            score += 5000; // Continuous block (0, 1, 2...)
          } else if (!allowGaps) {
            score -= 6000; // Penalize gaps between meetings
          }
        }
      }

      // 2. Daily cap adherence in balanced mode
      if (currentDayAssignedIndices.length < cap) {
        score += 3000; // Strongly prefer days that haven't reached their cap yet
      } else {
        score -= 4000; // Penalize exceeding cap, reserve for overflow
      }

      // 3. Balance load evenly across days
      score -= currentDayAssignedIndices.length * 300;

      // 4. Earlier times in the day preferred
      score -= meta.index * 30;

      return score;
    };

    // =========================================================================
    // KUHN'S MAXIMUM BIPARTITE MATCHING WITH PREFERENCE ORDERING
    // Ensures PRIORITY 1: KUKAAN EI JÄÄ ILMAN AIKAA (0 oppilasta ilman aikaa)
    // =========================================================================
    const studentMatch = new Map<string, string>(); // studentId -> slotId
    const slotMatch = new Map<string, string>();    // slotId -> studentId

    const tryAugment = (studentId: string, visitedStudents: Set<string>): boolean => {
      if (visitedStudents.has(studentId)) return false;
      visitedStudents.add(studentId);

      const student = unassignedStudents.find(s => s.id === studentId);
      if (!student) return false;

      // Candidate slots sorted by highest preference score first
      const candidateSlots = availableSlots
        .filter(slot => student.selectedSlotIds.includes(slot.id))
        .sort((a, b) => getSlotPreference(b, slotMatch) - getSlotPreference(a, slotMatch));

      // Step A: Try immediately available free slots in order of preference
      for (const slot of candidateSlots) {
        if (!slotMatch.has(slot.id)) {
          slotMatch.set(slot.id, studentId);
          studentMatch.set(studentId, slot.id);
          return true;
        }
      }

      // Step B: Augment through occupied slots (can a student currently in a slot move elsewhere?)
      for (const slot of candidateSlots) {
        const occupantId = slotMatch.get(slot.id)!;
        if (tryAugment(occupantId, visitedStudents)) {
          slotMatch.set(slot.id, studentId);
          studentMatch.set(studentId, slot.id);
          return true;
        }
      }

      return false;
    };

    // Sort students by MRV (fewest choices first)
    const sortedStudents = [...unassignedStudents].sort(
      (a, b) => a.selectedSlotIds.length - b.selectedSlotIds.length
    );

    for (const student of sortedStudents) {
      tryAugment(student.id, new Set<string>());
    }

    // Local Hill-Climbing Optimization: improve schedule aesthetics (contiguity, start at 0)
    // without ever reducing the number of assigned students
    let improved = true;
    let iterations = 0;
    while (improved && iterations < 40) {
      improved = false;
      iterations++;

      for (const [studentId, currentSlotId] of Array.from(studentMatch.entries())) {
        const student = unassignedStudents.find(s => s.id === studentId);
        if (!student) continue;

        const currentSlot = newSlots.find(s => s.id === currentSlotId);
        if (!currentSlot) continue;

        const currentScore = getSlotPreference(currentSlot, slotMatch);

        // Find available alternative slots for this student
        const altSlots = availableSlots.filter(
          s => s.id !== currentSlotId && student.selectedSlotIds.includes(s.id) && !slotMatch.has(s.id)
        );

        for (const alt of altSlots) {
          const altScore = getSlotPreference(alt, slotMatch);
          if (altScore > currentScore + 100) {
            slotMatch.delete(currentSlotId);
            slotMatch.set(alt.id, studentId);
            studentMatch.set(studentId, alt.id);
            improved = true;
            break;
          }
        }
      }
    }

    // =========================================================================
    // POST-PROCESSING COMPACTION: GUARANTEE PREFIX FILL FROM 14:00 (INDEX 0)
    // Shifts any appointment forward to earlier free slots on the same day if the student wished for it!
    // =========================================================================
    daySlotsMap.forEach(daySlots => {
      for (let i = 0; i < daySlots.length; i++) {
        const targetSlot = daySlots[i];
        if (slotMatch.has(targetSlot.id)) continue; // Slot i is already filled

        // targetSlot (index i) is FREE! Can any later slot j > i on the same day shift forward?
        for (let j = i + 1; j < daySlots.length; j++) {
          const laterSlot = daySlots[j];
          if (!slotMatch.has(laterSlot.id)) continue;

          const occupantId = slotMatch.get(laterSlot.id)!;
          const occupantStudent = submissions.find(s => s.id === occupantId);

          if (occupantStudent && occupantStudent.selectedSlotIds.includes(targetSlot.id)) {
            // Occupant also wished for the earlier slot! Shift them forward into targetSlot!
            slotMatch.delete(laterSlot.id);
            slotMatch.set(targetSlot.id, occupantId);
            studentMatch.set(occupantId, targetSlot.id);
            break; // targetSlot is now filled, move to next i
          }
        }
      }
    });

    // Apply the matched assignments
    let assignedNow = 0;
    studentMatch.forEach((slotId, studentId) => {
      const slot = newSlots.find(s => s.id === slotId);
      if (slot) {
        slot.assignedStudentId = studentId;
        assignedNow++;
      }
    });

    const updatedEvent = { ...event, slots: newSlots };
    saveEvent(updatedEvent);
    onEventUpdated(updatedEvent);
    setShowAutoSolveModal(false);

    const totalUnassignedNow = submissions.filter(
      s => !newSlots.some(slot => slot.assignedStudentId === s.id)
    ).length;

    if (totalUnassignedNow === 0) {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      showToast(`Täydellinen sovitus! Kaikki ${submissions.length} oppilasta saivat ajan (0 ilman aikaa)! 🪄`);
    } else {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
      showToast(
        `Taikasauva sijoitti ${assignedNow} oppilasta. (${totalUnassignedNow} oppilasta jäi ilman aikaa toiveiden rajallisuuden vuoksi).`
      );
    }
  };

  // Clear all assignments
  const handleClearAll = () => {
    if (window.confirm('Haluatko varmasti tyhjentää kaikki aikojen valinnat?')) {
      const clearedSlots = event.slots.map(s => ({ ...s, assignedStudentId: null }));
      const updated = { ...event, slots: clearedSlots };
      saveEvent(updated);
      onEventUpdated(updated);
      showToast('Kaikki aikavalinnat tyhjennetty.');
    }
  };

  const handleToggleLock = () => {
    const updated = { ...event, isLocked: !event.isLocked };
    saveEvent(updated);
    onEventUpdated(updated);
    showToast(updated.isLocked ? 'Vastausaika suljettu. Vanhemmat näkevät odotusilmoituksen.' : 'Vastausaika avattu uudelleen vanhemmille.');
  };

  const handleTogglePublish = () => {
    if (!event.isPublished) {
      if (unassignedSubmissions.length > 0) {
        const confirmed = window.confirm(
          `Huomio: Luokassa on vielä ${unassignedSubmissions.length} oppilasta ilman vahvistettua aikaa.\n\nHaluatko silti julkaista aikataulun vanhemmille nyt?`
        );
        if (!confirmed) return;
      }
      const updated = { ...event, isPublished: true, isLocked: true };
      saveEvent(updated);
      onEventUpdated(updated);
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      showToast('🚀 Aikataulu julkaistu! Vanhemmat näkevät vahvistetut ajat samasta linkistä.');
    } else {
      const confirmed = window.confirm(
        'Haluatko palauttaa aikataulun luonnokseksi? Vanhemmat näkevät tällöin taas odotusilmoituksen (palapeli käynnissä).'
      );
      if (!confirmed) return;
      const updated = { ...event, isPublished: false };
      saveEvent(updated);
      onEventUpdated(updated);
      showToast('Aikataulu palautettu luonnokseksi.');
    }
  };

  const handleStartNewSurvey = () => {
    const newEvt = createNewOfficialEvent(newSurveyKeepSlots);
    onEventUpdated(newEvt);
    const base = `${window.location.origin}${window.location.pathname}`;
    setCreatedSurveyLinks({
      adminUrl: `${base}?e=${encodeURIComponent(newEvt.id)}&admin=${encodeURIComponent(newEvt.adminToken)}`,
      parentUrl: `${base}?e=${encodeURIComponent(newEvt.id)}`,
    });
    showToast('Uusi virallinen kysely luotu!');
  };

  // Copy Wilma template
  const copyWilmaMessage = () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?e=${encodeURIComponent(event.id)}`;
    const teacherTarget = event.teacherName
      ? (event.teacherName.toLowerCase().endsWith('lle') ? event.teacherName : `${event.teacherName}lle`)
      : 'Eskolle';

    let text = '';
    if (event.isPublished) {
      text = `Hei huoltajat!\n\nLuokan arviointikeskustelujen aikataulu on nyt valmis ja vahvistettu!\n\nNäette oman perheenne vahvistetun ajan alla olevasta linkistä:\n${shareUrl}\n\nAikatauluja saa tarpeen tullen vielä vaihtaa keskenään, eli voitte vapaasti sopia toisen perheen kanssa aikojen vaihtamisesta päittäin. Jos olette sopineet vaihdosta, tai tulee muita muutostarpeita laittakaa siitä lyhyt viesti ${teacherTarget} Wilmassa 😊.\n\nTervetuloa tapaamiseen omassa luokassamme sovittuna aikana!\n\nYstävällisin terveisin,\n${event.teacherName || 'Esko'}`;
    } else {
      const deadlineNote = event.deadlineDate ? `\n\nVastausaika päättyy: ${event.deadlineDate}.` : '';
      text = `Hei huoltajat!\n\nOn aika valita sopivat ajat lukuvuoden arviointikeskusteluille. Yhteiseen keskusteluun osallistuvat oppilas, opettaja ja kodin edustaja(t).\n\nKäykää valitsemassa teille sopivat ajat alla olevasta linkistä:\n${shareUrl}\n\nValitkaa yhteensä vähintään ${event.minSelectionsRequired || 3} teille sopivaa vaihtoehtoa.${deadlineNote}\n\nYstävällisin terveisin,\n${event.teacherName || 'Esko'}`;
    }

    navigator.clipboard.writeText(text);
    setCopiedWilma(true);
    showToast(event.isPublished ? 'Wilma-julkaisuviesti kopioitu!' : 'Wilma-kyselyviesti kopioitu!');
    setTimeout(() => setCopiedWilma(false), 3000);
  };

  // Handle manual submission add
  const handleSaveManual = () => {
    if (!manualFirst.trim() || !manualInitial.trim()) {
      alert('Täytäthän etunimen ja sukunimen ensimmäisen kirjaimen.');
      return;
    }
    if (manualSlots.length === 0) {
      alert('Valitse vähintään yksi aika.');
      return;
    }

    addSubmission({
      eventId: event.id,
      firstName: manualFirst.trim(),
      lastNameInitial: manualInitial.trim().toUpperCase(),
      selectedSlotIds: manualSlots,
    });

    setShowManualModal(false);
    setManualFirst('');
    setManualInitial('');
    setManualSlots([]);
    showToast(`Oppilas ${manualFirst} lisätty järjestelmään!`);
    window.location.reload();
  };

  // Distinct day labels for filtering, ordered chronologically
  const sortedSlots = sortSlotsChronologically(event.slots);
  const distinctDays = Array.from(new Set(sortedSlots.map(s => s.dateLabel || s.date)));

  const displayedSlots = sortedSlots.filter(s => {
    if (filterDay === 'ALL') return true;
    return (s.dateLabel || s.date) === filterDay;
  });

  return (
    <div className="main-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notice">
          <Sparkles size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top action header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Aikasovitus & palapelin ratkaisu
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Vie hiiri oppilaan nimen päälle nähdäksesi kaikki hänen toiveensa hehkumassa!
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn-secondary" onClick={() => setShowManualModal(true)} title="Lisää oppilaan toiveet paperilapusta">
            <PlusCircle size={16} />
            <span>+ Lisää vastaus käsin</span>
          </button>

          <button
            className="btn-primary"
            style={{ background: '#7c3aed' }}
            onClick={handleAutoSolve}
            title="Taikasauva sijoittaa toiveet optimaalisesti yhdellä klikkauksella!"
          >
            <Wand2 size={16} />
            <span>🪄 Automaattisovitus</span>
          </button>

          <button className="btn-primary" onClick={copyWilmaMessage}>
            {copiedWilma ? <Check size={16} /> : <Copy size={16} />}
            <span>{copiedWilma ? 'Kopioitu!' : event.isPublished ? 'Kopioi Wilma-tiedote' : 'Kopioi Wilma-kysely'}</span>
          </button>

          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setCreatedSurveyLinks(null);
              setShowNewSurveyModal(true);
            }}
            title="Luo uusi virallinen kysely puhtaalla pohjalla"
          >
            <Share2 size={16} />
            <span>+ Uusi virallinen kysely</span>
          </button>
        </div>
      </div>

      {/* Lifecycle Status & Action Banner */}
      <div
        className="card"
        style={{
          background: event.isPublished
            ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
            : event.isLocked
            ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
            : 'linear-gradient(135deg, #eff6ff 0%, #f8fafc 100%)',
          border: event.isPublished
            ? '2px solid #86efac'
            : event.isLocked
            ? '2px solid #fde68a'
            : '2px solid #bfdbfe',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              background: event.isPublished ? '#dcfce7' : event.isLocked ? '#fef3c7' : '#dbeafe',
              color: event.isPublished ? '#15803d' : event.isLocked ? '#b45309' : '#1d4ed8',
              padding: '0.65rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {event.isPublished ? <CheckCircle size={22} /> : event.isLocked ? <Lock size={22} /> : <Unlock size={22} />}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: event.isPublished ? '#15803d' : event.isLocked ? '#b45309' : '#1d4ed8',
                  background: '#ffffff',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  border: `1px solid ${event.isPublished ? '#86efac' : event.isLocked ? '#fde68a' : '#bfdbfe'}`,
                }}
              >
                {event.isPublished ? '3. Julkaistu vanhemmille' : event.isLocked ? '2. Palapeli käynnissä' : '1. Vastausaika avoinna'}
              </span>
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0.2rem 0 0.15rem 0' }}>
              {event.isPublished
                ? 'Aikataulu on julkaistu vanhemmille'
                : event.isLocked
                ? 'Vastausaika on suljettu – sovitat aikoja palapelissä'
                : 'Vastausaika on avoinna huoltajille'}
            </h3>
            <p style={{ color: '#475569', fontSize: '0.88rem', margin: 0 }}>
              {event.isPublished
                ? 'Vanhemmat näkevät nyt vahvistetut ajat samasta Wilma-linkistä.'
                : event.isLocked
                ? 'Vanhemmat näkevät ystävällisen odotusviestin samassa linkissä.'
                : 'Vanhemmat voivat syöttää toiveitaan vastauslomakkeella.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Toggle Lock */}
          {!event.isPublished && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleToggleLock}
              style={{ fontSize: '0.88rem', padding: '0.55rem 0.9rem' }}
            >
              {event.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
              <span>{event.isLocked ? 'Avaa vastaukset' : 'Sulje vastaukset'}</span>
            </button>
          )}

          {/* Toggle Publish */}
          <button
            type="button"
            className="btn-primary"
            onClick={handleTogglePublish}
            style={{
              background: event.isPublished ? 'rgba(118, 118, 128, 0.16)' : 'var(--success)',
              color: event.isPublished ? 'var(--text-main)' : '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.92rem',
              padding: '0.65rem 1.35rem',
              borderRadius: 'var(--radius-full)',
              boxShadow: event.isPublished ? 'none' : '0 2px 10px rgba(52, 199, 89, 0.3)',
              transition: 'all 0.2s var(--apple-spring)',
            }}
          >
            {event.isPublished ? (
              <>
                <RotateCcw size={16} />
                <span>Palauta luonnokseksi</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>🚀 Julkaise aikataulu vanhemmille</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Overview Status Cards & Progress Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', marginBottom: 0, borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.55rem', borderRadius: '12px' }}>
              <Users size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Vastauksia saatu</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                {submissions.length} kpl
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', marginBottom: 0, borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '0.55rem', borderRadius: '12px' }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Aika jaettu</span>
              <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--success)', letterSpacing: '-0.02em' }}>
                {assignedCount} / {submissions.length} ({progressPercent}%)
              </div>
            </div>
          </div>
          <div className="progress-container">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', marginBottom: 0, borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: unassignedSubmissions.length > 0 ? 'var(--warning-light)' : 'var(--success-light)',
                color: unassignedSubmissions.length > 0 ? 'var(--warning)' : 'var(--success)',
                padding: '0.55rem',
                borderRadius: '12px'
              }}>
                <AlertCircle size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Ilman aikaa</span>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: unassignedSubmissions.length > 0 ? 'var(--warning)' : 'var(--success)', letterSpacing: '-0.02em' }}>
                  {unassignedSubmissions.length} oppilasta
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              {unassignedSubmissions.length > 0 && assignedCount > 0 && (
                <button
                  type="button"
                  className="select-all-btn"
                  style={{
                    background: '#ede9fe',
                    color: '#6d28d9',
                    borderColor: '#c4b5fd',
                    fontWeight: 700,
                  }}
                  onClick={handleReSolveAll}
                  title="Sovita uudet ja vanhat automaattisesti"
                >
                  <Sparkles size={12} />
                  <span>Sovita</span>
                </button>
              )}
              {assignedCount > 0 && (
                <button
                  className="select-all-btn"
                  style={{ color: 'var(--danger)', borderColor: 'rgba(255, 59, 48, 0.3)' }}
                  onClick={handleClearAll}
                  title="Tyhjennä kaikki valinnat"
                >
                  <RotateCcw size={12} />
                  <span>Nollaa</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Smart Unassigned Assistant Banner */}
      {unassignedSubmissions.length > 0 && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
            border: '2px solid #fde68a',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: '#f59e0b', color: '#ffffff', padding: '0.6rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#92400e', margin: 0 }}>
                  {unassignedSubmissions.length === 1 ? '1 oppilas odottaa vielä aikaa (Uusi vastaus)' : `${unassignedSubmissions.length} oppilasta odottaa vielä aikaa`}
                </h3>
                <p style={{ fontSize: '0.86rem', color: '#78350f', margin: '0.15rem 0 0 0' }}>
                  Voit sijoittaa heidät alla olevilla suorilla ehdotuksilla tai sovittaa koko luokan uudelleen yhdellä klikkauksella.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{
                background: '#7c3aed',
                fontSize: '0.86rem',
                padding: '0.6rem 1.15rem',
                borderRadius: 'var(--radius-full)',
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onClick={handleReSolveAll}
              title="Sovita koko luokka uudelleen puhtaalta pöydältä siten, että uudetkin vastaukset sijoittuvat parhaalla mahdollisella tavalla"
            >
              <RotateCcw size={15} />
              <span>Sovita kaikki uudelleen automaatilla</span>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {smartSuggestions.map(sug => {
              const displayName = getStudentDisplayName(sug.student, submissions);

              if (sug.type === 'free_slot' && sug.freeSlot) {
                const slot = sug.freeSlot;
                return (
                  <div
                    key={sug.student.id}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #86efac',
                      borderRadius: '12px',
                      padding: '0.9rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{displayName}</span>
                        <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                          Vapaa aika löytyy!
                        </span>
                      </div>
                      <p style={{ fontSize: '0.84rem', color: '#475569', margin: '0.2rem 0 0 0' }}>
                        Oppilaan toiveista on suoraan vapaana: <strong>{slot.dateLabel || slot.date} klo {slot.startTime}–{slot.endTime}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      style={{
                        background: '#16a34a',
                        fontSize: '0.84rem',
                        padding: '0.55rem 1.1rem',
                        borderRadius: 'var(--radius-full)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      onClick={() => handleAssignFreeSlot(sug.student.id, slot.id)}
                    >
                      <Check size={15} />
                      <span>Sijoita vapaaseen aikaan</span>
                    </button>
                  </div>
                );
              }

              if (sug.type === 'relocation' && sug.displacedStudent && sug.occupiedSlot && sug.altSlot) {
                const occName = getStudentDisplayName(sug.displacedStudent, submissions);
                const occSlot = sug.occupiedSlot;
                const altSlot = sug.altSlot;

                return (
                  <div
                    key={sug.student.id}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #bfdbfe',
                      borderRadius: '12px',
                      padding: '0.9rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{displayName}</span>
                        <span style={{ background: '#e0e7ff', color: '#4338ca', fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                          💡 Älykäs siirtoehdotus
                        </span>
                      </div>
                      <p style={{ fontSize: '0.84rem', color: '#334155', margin: 0, lineHeight: 1.45 }}>
                        Oppilas <strong>{occName}</strong> on ajalla <em>{occSlot.dateLabel || occSlot.date} klo {occSlot.startTime}</em> (jota {sug.student.firstName} toivoi).
                        Mutta {sug.displacedStudent.firstName}lle sopii myös vapaana oleva toiveensa <strong>{altSlot.dateLabel || altSlot.date} klo {altSlot.startTime}</strong>!
                      </p>
                    </div>

                    <button
                      type="button"
                      className="btn-primary"
                      style={{
                        background: '#2563eb',
                        fontSize: '0.84rem',
                        padding: '0.55rem 1.15rem',
                        borderRadius: 'var(--radius-full)',
                        whiteSpace: 'nowrap',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                      onClick={() => handleApplyRelocation(sug.student.id, occSlot.id, sug.displacedStudent!.id, altSlot.id)}
                    >
                      <ArrowLeftRight size={15} />
                      <span>Siirrä {sug.displacedStudent.firstName} & anna aika {sug.student.firstName}lle</span>
                    </button>
                  </div>
                );
              }

              // No direct simple swap found
              return (
                <div
                  key={sug.student.id}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #fde68a',
                    borderRadius: '12px',
                    padding: '0.9rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '0.75rem',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{displayName}</span>
                    <p style={{ fontSize: '0.83rem', color: '#78350f', margin: '0.2rem 0 0 0' }}>
                      Kaikki {sug.student.firstName}n toiveet ovat varattuja eikä yksinkertaista suoraa siirtoa löytynyt.
                      Suorita automaattisovitus uudelleen puhtaalta pöydältä, jolloin kone etsii uuden optimin kaikille oppilaille.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
                    onClick={handleReSolveAll}
                  >
                    <RotateCcw size={14} />
                    <span>Sovita uudelleen</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Matching Table Card */}
      <div className="card">
        {/* Day Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-subtle)' }}>
              Rajaa päivää:
            </span>
            <button
              className={`select-all-btn ${filterDay === 'ALL' ? 'active' : ''}`}
              style={{
                background: filterDay === 'ALL' ? 'var(--primary)' : 'rgba(118, 118, 128, 0.08)',
                color: filterDay === 'ALL' ? '#fff' : 'var(--text-main)',
                border: 'none',
              }}
              onClick={() => setFilterDay('ALL')}
            >
              Kaikki päivät ({event.slots.length})
            </button>
            {distinctDays.map(day => (
              <button
                key={day}
                className={`select-all-btn ${filterDay === day ? 'active' : ''}`}
                style={{
                  background: filterDay === day ? 'var(--primary)' : 'rgba(118, 118, 128, 0.08)',
                  color: filterDay === day ? '#fff' : 'var(--text-main)',
                  border: 'none',
                }}
                onClick={() => setFilterDay(day)}
              >
                {day}
              </button>
            ))}
          </div>

          {activeStudent && (
            <div style={{
              background: '#ede9fe',
              color: '#6d28d9',
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}>
              <Sparkles size={14} />
              <span>Toiveet hehkuvat: {activeStudent.firstName} ({activeStudentWishedSlots.length} aikaa)</span>
              <button
                type="button"
                style={{ background: 'transparent', border: 'none', color: '#6d28d9', cursor: 'pointer', padding: '0 2px' }}
                onClick={() => setHoveredStudentId(null)}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {displayedSlots.length === 0 ? (
          <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px', color: '#64748b' }}>
            <Clock size={32} style={{ margin: '0 auto 0.5rem auto', color: '#94a3b8' }} />
            <h4 style={{ fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>Ei vielä luotuja aikoja</h4>
            <p style={{ fontSize: '0.88rem' }}>Siirry ylävalikosta "Aikojen hallinta" -näkymään lisätäksesi päiviä ja aikoja.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="matching-table">
            <thead>
              <tr>
                <th style={{ width: '180px' }}>Päivä</th>
                <th style={{ width: '150px' }}>Kellonaika</th>
                <th style={{ width: '140px' }}>Toivoi</th>
                <th>Lukittu oppilas tälle ajalle</th>
                <th style={{ width: '190px' }}>Toiveet & Vaihtomahdollisuus</th>
              </tr>
            </thead>
            <tbody>
              {displayedSlots.map(slot => {
                const candidateStudents = submissions.filter(sub => sub.selectedSlotIds.includes(slot.id));
                const isAssigned = !!slot.assignedStudentId;
                const assignedStudent = submissions.find(s => s.id === slot.assignedStudentId);

                // Candidates who are not yet assigned anywhere OR are assigned to this exact slot
                const unassignedCandidates = candidateStudents.filter(candidate => {
                  const currentSlotId = assignedStudentMap.get(candidate.id);
                  return !currentSlotId || currentSlotId === slot.id;
                });

                // Candidates who wished for this slot but are already locked to another slot
                const alreadyAssignedCandidates = candidateStudents.filter(candidate => {
                  const currentSlotId = assignedStudentMap.get(candidate.id);
                  return currentSlotId && currentSlotId !== slot.id;
                });

                // Exactly one unassigned candidate left wishing for this slot
                const soleUnassignedCandidate = !isAssigned && unassignedCandidates.length === 1 ? unassignedCandidates[0] : null;

                // Is this slot among the hovered student's desired slots?
                const isDesiredByHovered = activeStudentWishedSlots.includes(slot.id);
                const isCurrentAssignedSlotForHovered = slot.id === activeStudentAssignedSlotId;

                return (
                  <tr
                    key={slot.id}
                    className={isDesiredByHovered ? 'highlighted-desired-slot' : ''}
                  >
                    <td>
                      <span style={{ fontWeight: 700, color: '#1e293b' }}>
                        {slot.dateLabel || slot.date}
                      </span>
                      {slot.section && (
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>
                          {slot.section}
                        </span>
                      )}
                    </td>

                    <td>
                      <span className="slot-badge">
                        <Clock size={13} color="#2563eb" />
                        {slot.startTime} – {slot.endTime}
                      </span>
                    </td>

                    <td>
                      {candidateStudents.length === 0 ? (
                        <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>—</span>
                      ) : unassignedCandidates.length === 0 ? (
                        <div style={{ fontSize: '0.82rem', lineHeight: 1.3 }}>
                          <span style={{ fontWeight: 600, color: '#94a3b8' }}>0 vapaana</span>
                          <span style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8' }}>
                            ({alreadyAssignedCandidates.length} jo toisella ajalla)
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.85rem', lineHeight: 1.3 }}>
                          <span style={{ fontWeight: 700, color: '#2563eb' }}>
                            {unassignedCandidates.length} vapaana
                          </span>
                          {alreadyAssignedCandidates.length > 0 && (
                            <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>
                              (yht. {candidateStudents.length} toivoi)
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
                        onMouseEnter={() => {
                          if (slot.assignedStudentId) setHoveredStudentId(slot.assignedStudentId);
                        }}
                      >
                        <select
                          className="form-select"
                          value={slot.assignedStudentId || ''}
                          onChange={e => handleSelectStudent(slot.id, e.target.value || null)}
                          style={{
                            borderColor: isAssigned
                              ? '#86efac'
                              : soleUnassignedCandidate
                              ? '#3b82f6'
                              : '#cbd5e1',
                            borderStyle: !isAssigned && soleUnassignedCandidate ? 'dashed' : 'solid',
                            borderWidth: !isAssigned && soleUnassignedCandidate ? '1.5px' : '1px',
                            background: isAssigned
                              ? '#f0fdf4'
                              : soleUnassignedCandidate
                              ? '#eff6ff'
                              : '#ffffff',
                            color: isAssigned
                              ? '#15803d'
                              : soleUnassignedCandidate
                              ? '#1d4ed8'
                              : '#1e293b',
                            fontWeight: isAssigned ? 700 : soleUnassignedCandidate ? 600 : 500,
                          }}
                        >
                          <option value="">
                            {isAssigned
                              ? '-- Vapauta aika (poista valinta) --'
                              : soleUnassignedCandidate
                              ? `💡 Ehdotus: ${getStudentDisplayName(soleUnassignedCandidate, submissions)} (ei vielä lukittu)`
                              : unassignedCandidates.length > 0
                              ? `-- Vapaa aika (${unassignedCandidates.length} vapaana) --`
                              : candidateStudents.length > 0
                              ? `-- Vapaa aika (0 vapaana, ${candidateStudents.length} toisella ajalla) --`
                              : '-- Vapaa aika (ei valittua) --'}
                          </option>
                          {candidateStudents.map(candidate => {
                            const isAlreadyAssignedElsewhere =
                              assignedStudentMap.has(candidate.id) && assignedStudentMap.get(candidate.id) !== slot.id;

                            const displayName = getStudentDisplayName(candidate, submissions);
                            return (
                              <option key={candidate.id} value={candidate.id}>
                                {displayName}{isAlreadyAssignedElsewhere ? ' (jo toisella ajalla)' : ''}
                              </option>
                            );
                          })}
                        </select>

                        {/* Quick 1-click Lock Button for sole unassigned candidate */}
                        {!isAssigned && soleUnassignedCandidate && (
                          <button
                            type="button"
                            onClick={() => handleSelectStudent(slot.id, soleUnassignedCandidate.id)}
                            style={{
                              background: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '5px 10px',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                            }}
                            title={`Lukitse ${soleUnassignedCandidate.firstName} tälle ajalle`}
                          >
                            <Check size={13} />
                            <span>Lukitse {soleUnassignedCandidate.firstName}</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td>
                      {/* Dynamic highlight & Swap UI */}
                      {isDesiredByHovered && !isCurrentAssignedSlotForHovered && activeStudent && (
                        <div>
                          {!isAssigned ? (
                            <button
                              type="button"
                              className="free-wish-badge"
                              onClick={() => {
                                handleSelectStudent(slot.id, activeStudent.id);
                                showToast(`Siirretty ${activeStudent.firstName} tähän vapaaseen aikaan!`);
                              }}
                              title="Klikkaa siirtääksesi oppilas tähän vapaaseen aikaan"
                            >
                              <Sparkles size={12} />
                              <span>✨ Vapaa: siirrä {activeStudent.firstName}</span>
                            </button>
                          ) : (
                            assignedStudent && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <button
                                  type="button"
                                  className="swap-badge"
                                  onClick={() => {
                                    if (activeStudentAssignedSlotId) {
                                      handleSwapStudents(
                                        activeStudent.id,
                                        activeStudentAssignedSlotId,
                                        assignedStudent.id,
                                        slot.id
                                      );
                                    } else {
                                      handleSelectStudent(slot.id, activeStudent.id);
                                    }
                                  }}
                                  title="Vaihda molempien oppilaiden ajat keskenään päittäin"
                                >
                                  <ArrowLeftRight size={12} />
                                  <span>Vaihda päittäin {activeStudent.firstName}</span>
                                </button>

                                <button
                                  type="button"
                                  style={{
                                    background: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '4px',
                                    padding: '2px 6px',
                                    fontSize: '0.72rem',
                                    color: '#64748b',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                  }}
                                  onClick={() => handleSelectStudent(slot.id, activeStudent.id)}
                                  title="Siirrä tähän ja vapauta aiempi oppilas"
                                >
                                  ↳ Siirrä vain {activeStudent.firstName} (vapauta {assignedStudent.firstName})
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      )}

                      {!isDesiredByHovered && (
                        <div>
                          {isAssigned ? (
                            <span
                              style={{
                                color: '#16a34a',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={() => setHoveredStudentId(slot.assignedStudentId!)}
                              title="Vie hiiri tähän nähdäksesi kaikki hänen toiveensa!"
                            >
                              ✓ Varattu ({assignedStudent?.firstName})
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                              Vapaa
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>

      {/* Unassigned Students Helper Box */}
      {unassignedSubmissions.length > 0 && (
        <div className="card" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#92400e', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>Nämä oppilaat odottavat vielä sopivaa aikaa ({unassignedSubmissions.length} kpl):</span>
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#78350f', marginBottom: '0.75rem' }}>
            Voit viedä hiiren heidän nimensä päälle nähdäksesi minne he toivoivat aikoja, tai klikata <strong>🪄 Automaattisovitus</strong>.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {unassignedSubmissions.map(student => {
              const displayName = getStudentDisplayName(student, submissions);
              const isSelected = hoveredStudentId === student.id;

              return (
                <button
                  key={student.id}
                  type="button"
                  style={{
                    background: isSelected ? '#ede9fe' : '#ffffff',
                    border: `1.5px solid ${isSelected ? '#7c3aed' : '#fcd34d'}`,
                    padding: '0.4rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: isSelected ? '#6d28d9' : '#78350f',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  onMouseEnter={() => setHoveredStudentId(student.id)}
                  onClick={() => setHoveredStudentId(hoveredStudentId === student.id ? null : student.id)}
                  title="Vie hiiri tähän nähdäksesi toiveet taulukossa!"
                >
                  <span>{displayName}</span>
                  <span style={{ fontSize: '0.75rem', color: '#b45309' }}>
                    ({student.selectedSlotIds.length} toivetta)
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Manual student add modal */}
      {showManualModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Lisää oppilaan toiveet käsin</h3>
              <button
                type="button"
                className="select-all-btn"
                onClick={() => setShowManualModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="name-input-container" style={{ marginBottom: '1rem' }}>
              <div className="name-input-first form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Etunimi *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="esim. Laura"
                  value={manualFirst}
                  onChange={e => setManualFirst(e.target.value)}
                />
              </div>
              <div className="name-input-initial form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ whiteSpace: 'nowrap' }}>Sukunimen 1. kirjain *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="M"
                  maxLength={2}
                  value={manualInitial}
                  onChange={e => setManualInitial(e.target.value.toUpperCase().slice(0, 2))}
                />
              </div>
            </div>

            <label className="form-label" style={{ marginBottom: '0.5rem' }}>
              Rastita paperilapussa merkityt ajat:
            </label>
            <div style={{ maxHeight: '220px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem', marginBottom: '1.25rem' }}>
              {sortedSlots.map(s => {
                const isChecked = manualSlots.includes(s.id);
                return (
                  <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setManualSlots(prev =>
                          prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                        );
                      }}
                    />
                    <span><strong>{s.dateLabel}</strong> klo {s.startTime}–{s.endTime}</span>
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowManualModal(false)}>
                Peruuta
              </button>
              <button type="button" className="btn-primary" onClick={handleSaveManual}>
                Tallenna oppilas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Solve Settings & Confirmation Modal */}
      {showAutoSolveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '540px', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: '#f5f3ff', color: '#7c3aed', padding: '0.5rem', borderRadius: '10px' }}>
                  <Wand2 size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Automaattisovitus
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                    Valitse miten taikasauva sijoittaa toiveet kalenteriin
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="select-all-btn"
                onClick={() => setShowAutoSolveModal(false)}
                aria-label="Sulje"
              >
                <X size={16} />
              </button>
            </div>

            {/* Priority 1 Promise Badge */}
            <div style={{
              background: '#f0fdf4',
              border: '1.5px solid #bbf7d0',
              borderRadius: '10px',
              padding: '0.65rem 0.85rem',
              marginBottom: '1.15rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.85rem',
              color: '#15803d',
              fontWeight: 700,
            }}>
              <CheckCircle size={18} style={{ flexShrink: 0 }} />
              <span>🎯 Ensisijainen sääntö: Kukaan ei jää ilman aikaa (0 oppilasta ilman aikaa). Kaikki vastanneet sijoitetaan ensin, ja aikataulut tiivistetään toissijaisesti.</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '1.25rem' }}>
              {/* Option 1: Balanced & Spaced */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '12px',
                border: `2px solid ${autoSolveMode === 'balanced' ? '#7c3aed' : '#e2e8f0'}`,
                background: autoSolveMode === 'balanced' ? '#faf5ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}>
                <input
                  type="radio"
                  name="autoSolveMode"
                  checked={autoSolveMode === 'balanced'}
                  onChange={() => setAutoSolveMode('balanced')}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                      🌿 Tasainen & väljä aikataulu
                    </strong>
                    <span style={{
                      background: '#7c3aed',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '999px',
                    }}>
                      Suositus
                    </span>
                  </div>
                  <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '0.25rem 0 0 0', lineHeight: 1.45 }}>
                    Jakaa ajat tasaisesti eri päiville ja sijoittaa peräkkäin ilman täyteen ahtamista (esim. 3 peräkkäistä 4:stä, 2 peräkkäistä 3:sta, 1 jos vain yksi vaihtoehto).
                  </p>
                </div>
              </label>

              {/* Option 2: Packed */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '12px',
                border: `2px solid ${autoSolveMode === 'packed' ? '#7c3aed' : '#e2e8f0'}`,
                background: autoSolveMode === 'packed' ? '#faf5ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}>
                <input
                  type="radio"
                  name="autoSolveMode"
                  checked={autoSolveMode === 'packed'}
                  onChange={() => setAutoSolveMode('packed')}
                  style={{ marginTop: '3px' }}
                />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>
                    Täytä päivät täyteen (Tiivis)
                  </strong>
                  <p style={{ fontSize: '0.83rem', color: '#64748b', margin: '0.25rem 0 0 0', lineHeight: 1.45 }}>
                    Täyttää kaikki päivät ja mahdolliset vapaat ajat maksimikapasiteetilla heti peräkkäin.
                  </p>
                </div>
              </label>
            </div>

            {/* Special Options / Erikoistoiminnot */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Erikoistoiminnot & ehdot:
              </span>

              {/* Gaps checkbox (default false) */}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={autoSolveAllowGaps}
                  onChange={e => setAutoSolveAllowGaps(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                    Salli hyppytunnit (tyhjät välit aikojen väliin)
                  </strong>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0', lineHeight: 1.4 }}>
                    Oletuksena pois päältä: ajat sijoitetaan aina tiiviisti peräkkäin ilman turhia odotteluvälejä. Rastita tämä vain, jos haluat erikseen sallia tyhjän välin saman päivän tapaamisten väliin.
                  </p>
                </div>
              </label>

              {/* Fallback to fill in balanced mode */}
              {autoSolveMode === 'balanced' && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={autoSolveFallbackToFill}
                    onChange={e => setAutoSolveFallbackToFill(e.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                      Täytä varalohkot vain, jos oppilaat eivät muuten mahdu
                    </strong>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0', lineHeight: 1.4 }}>
                      Jos joku oppilas jäisi muuten ilman aikaa, hänet voidaan sijoittaa vapaaseen lisäaikaan peräkkäiseksi jatkoksi.
                    </p>
                  </div>
                </label>
              )}

              {/* Reset all and solve from clean slate */}
              {assignedCount > 0 && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                  <input
                    type="checkbox"
                    checked={autoSolveResetAll}
                    onChange={e => setAutoSolveResetAll(e.target.checked)}
                    style={{ marginTop: '2px' }}
                  />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                      Sovita kaikki oppilaat uudelleen puhtaalta pöydältä
                    </strong>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.15rem 0 0 0', lineHeight: 1.4 }}>
                      {autoSolveResetAll
                        ? 'Kaikkien oppilaiden toiveet jaetaan uudelleen parhaalla mahdollisella tavalla (suositus uuden vastauksen saapuessa).'
                        : 'Säilyttää nykyiset valinnat ja yrittää sovittaa vain ilman aikaa olevat jäljellä oleviin vapaisiin aikoihin.'}
                    </p>
                  </div>
                </label>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowAutoSolveModal(false)}
              >
                Peruuta
              </button>
              <button
                type="button"
                className="btn-primary"
                style={{ background: '#7c3aed', border: 'none' }}
                onClick={() => executeAutoSolve(autoSolveMode, autoSolveAllowGaps, autoSolveFallbackToFill, autoSolveResetAll)}
              >
                <Wand2 size={16} />
                <span>Suorita automaattisovitus</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New official survey modal */}
      {showNewSurveyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto', padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.5rem', borderRadius: '10px' }}>
                  <Share2 size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Aloita uusi virallinen kysely
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                    Luo uusi puhdas kysely omalla salaisella osoitteella
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="select-all-btn"
                onClick={() => setShowNewSurveyModal(false)}
                aria-label="Sulje"
              >
                <X size={16} />
              </button>
            </div>

            {!createdSurveyLinks ? (
              <div>
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  Haluatko luoda uuden, puhtaan kyselyn oikeita arviointikeskusteluja varten?
                  Järjestelmä luo uuden uniikin kyselytunnuksen, jotta harjoitusvastaukset eivät sekoitu oikeaan kyselyyn.
                </p>

                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '0.65rem' }}>
                    Valitse pohja uudelle kyselylle:
                  </span>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '0.75rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="surveySlotsOption"
                      checked={newSurveyKeepSlots}
                      onChange={() => setNewSurveyKeepSlots(true)}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                        Pidä nykyiset ajankohdat pohjana ({event.slots.length} kpl)
                      </strong>
                      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.15rem 0 0 0', lineHeight: 1.4 }}>
                        Suositus: Säilyttää syöttämäsi päivät ja kellonajat, mutta tyhjentää kaikki harjoitusoppilaat ja varaukset puhtaaksi.
                      </p>
                    </div>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="surveySlotsOption"
                      checked={!newSurveyKeepSlots}
                      onChange={() => setNewSurveyKeepSlots(false)}
                      style={{ marginTop: '3px' }}
                    />
                    <div>
                      <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                        Aloita täysin tyhjältä pöydältä
                      </strong>
                      <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.15rem 0 0 0', lineHeight: 1.4 }}>
                        Poistaa kaikki ajat ja vastaukset, ja aloittaa puhtaalta sivulta.
                      </p>
                    </div>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowNewSurveyModal(false)}>
                    Peruuta
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ background: '#2563eb' }}
                    onClick={handleStartNewSurvey}
                  >
                    Luo virallinen kysely 🚀
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 800, marginBottom: '0.25rem' }}>
                    <Sparkles size={18} />
                    <span>Uusi kysely on luotu onnistuneesti!</span>
                  </div>
                  <p style={{ fontSize: '0.88rem', color: '#166534', margin: 0 }}>
                    Tässä ovat uudet linkkisi. Ota talteen opettajan hallintalinkki ja lähetä huoltajien linkki Wilmassa.
                  </p>
                </div>

                {/* Secret Teacher Admin Link */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    <Key size={16} color="#2563eb" />
                    <span>1. Opettajan salainen hallintalinkki (vain sinulle)</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.65rem' }}>
                    Tällä linkillä pääset aina suoraan hallitsemaan ja sovittamaan tämän kyselyn aikoja miltä tahansa laitteelta:
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      readOnly
                      value={createdSurveyLinks.adminUrl}
                      className="form-input"
                      style={{ fontSize: '0.85rem', background: '#ffffff' }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(createdSurveyLinks.adminUrl);
                        setCopiedAdminLink(true);
                        setTimeout(() => setCopiedAdminLink(false), 2500);
                      }}
                      style={{ flexShrink: 0 }}
                    >
                      {copiedAdminLink ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copiedAdminLink ? 'Kopioitu!' : 'Kopioi'}</span>
                    </button>
                  </div>
                </div>

                {/* Parent Link */}
                <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                    <Globe size={16} color="#16a34a" />
                    <span>2. Huoltajien linkki (lähetä Wilmassa)</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.65rem' }}>
                    Tämän saman linkin lähetät vanhemmille. He vastaavat tähän ja näkevät myöhemmin vahvistetun aikataulun:
                  </p>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      readOnly
                      value={createdSurveyLinks.parentUrl}
                      className="form-input"
                      style={{ fontSize: '0.85rem', background: '#ffffff' }}
                    />
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        navigator.clipboard.writeText(createdSurveyLinks.parentUrl);
                        setCopiedParentLink(true);
                        setTimeout(() => setCopiedParentLink(false), 2500);
                      }}
                      style={{ flexShrink: 0 }}
                    >
                      {copiedParentLink ? <Check size={16} /> : <Copy size={16} />}
                      <span>{copiedParentLink ? 'Kopioitu!' : 'Kopioi'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setShowNewSurveyModal(false);
                      window.history.pushState({}, '', createdSurveyLinks.adminUrl);
                    }}
                  >
                    Valmis! Siirry kyselyyn
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guided Next Step Banner to A4 Print */}
      {event.slots.some(s => s.assignedStudentId) && onNavigate && (
        <div style={{
          marginTop: '1.5rem',
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '1.5rem 1.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 8px 20px -4px rgba(22, 163, 74, 0.35)',
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9, fontWeight: 800 }}>
              🎉 Johdatuspolku: Vaihe 2/3 valmis
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '4px 0 2px 0', color: '#ffffff' }}>
              Ajat sovitettu! Haluatko tulostaa A4-aikataulun?
            </h3>
            <p style={{ opacity: 0.92, fontSize: '0.9rem', margin: 0 }}>
              Voit ottaa siistin A4-tulosteen luokan oveen tai tarkastella huoltajien katselulinkkiä.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onNavigate('public')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                border: '1.5px solid rgba(255, 255, 255, 0.45)',
                padding: '0.7rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Katselulinkki huoltajille
            </button>
            <button
              type="button"
              onClick={() => onNavigate('print')}
              style={{
                background: '#ffffff',
                color: '#15803d',
                border: 'none',
                padding: '0.7rem 1.4rem',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              }}
            >
              <span>Siirry A4-Tulosteeseen</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
