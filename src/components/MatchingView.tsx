import React, { useState } from 'react';
import type { ScheduleEvent, StudentSubmission, ViewMode } from '../types';
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Map of student IDs that have been assigned somewhere (studentId -> slotId)
  const assignedStudentMap = new Map<string, string>();
  event.slots.forEach(slot => {
    if (slot.assignedStudentId) {
      assignedStudentMap.set(slot.assignedStudentId, slot.id);
    }
  });

  const assignedCount = assignedStudentMap.size;
  const unassignedSubmissions = submissions.filter(sub => !assignedStudentMap.has(sub.id));
  const progressPercent = submissions.length > 0 ? Math.round((assignedCount / submissions.length) * 100) : 0;

  // Selected or hovered student details
  const activeStudent = submissions.find(s => s.id === hoveredStudentId);
  const activeStudentWishedSlots = activeStudent ? activeStudent.selectedSlotIds : [];
  const activeStudentAssignedSlotId = hoveredStudentId ? assignedStudentMap.get(hoveredStudentId) : null;

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

  // Magic Auto-Solver
  const handleAutoSolve = () => {
    const newSlots = [...event.slots];
    const currentlyAssigned = new Set<string>();

    newSlots.forEach(s => {
      if (s.assignedStudentId) currentlyAssigned.add(s.assignedStudentId);
    });

    const studentsToAssign = submissions
      .filter(s => !currentlyAssigned.has(s.id))
      .sort((a, b) => a.selectedSlotIds.length - b.selectedSlotIds.length);

    let assignedNow = 0;

    for (const student of studentsToAssign) {
      const candidateSlot = newSlots.find(
        slot => !slot.assignedStudentId && student.selectedSlotIds.includes(slot.id)
      );

      if (candidateSlot) {
        candidateSlot.assignedStudentId = student.id;
        currentlyAssigned.add(student.id);
        assignedNow++;
      }
    }

    const updatedEvent = { ...event, slots: newSlots };
    saveEvent(updatedEvent);
    onEventUpdated(updatedEvent);

    if (assignedNow > 0) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
      showToast(`Taikasauva sijoitti ${assignedNow} oppilasta aikoihin!`);
    } else {
      showToast('Kaikki mahdolliset oppilaat on jo sijoitettu.');
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
      text = `Hei huoltajat!\n\nLuokan arviointikeskustelujen aikataulu on nyt valmis ja vahvistettu!\n\nNäette oman perheenne vahvistetun ajan alla olevasta linkistä:\n${shareUrl}\n\nAikatauluja saa tarpeen tullen vielä vaihtaa keskenään, eli voitte vapaasti sopia toisen perheen kanssa aikojen vaihtamisesta päittäin. Jos olette sopineet vaihdosta, laittakaa siitä vielä lyhyt viesti ${teacherTarget} Wilmassa 😊.\n\nTervetuloa tapaamiseen omassa luokassamme sovittuna aikana!\n\nYstävällisin terveisin,\n${event.teacherName || 'Esko'}`;
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
              background: event.isPublished ? '#475569' : '#16a34a',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.92rem',
              padding: '0.6rem 1.1rem',
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
        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ background: '#eff6ff', color: '#2563eb', padding: '0.5rem', borderRadius: '10px' }}>
              <Users size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Vastauksia saatu</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>
                {submissions.length} kpl
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.5rem', borderRadius: '10px' }}>
              <CheckCircle size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Aika jaettu</span>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a' }}>
                {assignedCount} / {submissions.length} ({progressPercent}%)
              </div>
            </div>
          </div>
          <div className="progress-container">
            <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                background: unassignedSubmissions.length > 0 ? '#fef3c7' : '#f0fdf4',
                color: unassignedSubmissions.length > 0 ? '#d97706' : '#16a34a',
                padding: '0.5rem',
                borderRadius: '10px'
              }}>
                <AlertCircle size={20} />
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Ilman aikaa</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: unassignedSubmissions.length > 0 ? '#d97706' : '#16a34a' }}>
                  {unassignedSubmissions.length} oppilasta
                </div>
              </div>
            </div>

            {assignedCount > 0 && (
              <button
                className="select-all-btn"
                style={{ color: '#ef4444', borderColor: '#fca5a5' }}
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

      {/* Main Matching Table Card */}
      <div className="card">
        {/* Day Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
              Rajaa päivää:
            </span>
            <button
              className={`select-all-btn ${filterDay === 'ALL' ? 'active' : ''}`}
              style={{ background: filterDay === 'ALL' ? '#2563eb' : '#fff', color: filterDay === 'ALL' ? '#fff' : '#2563eb' }}
              onClick={() => setFilterDay('ALL')}
            >
              Kaikki päivät ({event.slots.length})
            </button>
            {distinctDays.map(day => (
              <button
                key={day}
                className={`select-all-btn ${filterDay === day ? 'active' : ''}`}
                style={{ background: filterDay === day ? '#2563eb' : '#fff', color: filterDay === day ? '#fff' : '#334155' }}
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
                                {displayName} {isAlreadyAssignedElsewhere ? '(jo toisella ajalla)' : '(vapaana)'}
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
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Etunimi *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="esim. Laura"
                  value={manualFirst}
                  onChange={e => setManualFirst(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Sukunimen 1. kirjain *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="esim. P"
                  maxLength={1}
                  value={manualInitial}
                  onChange={e => setManualInitial(e.target.value.toUpperCase())}
                  style={{ textAlign: 'center', fontWeight: 700 }}
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
