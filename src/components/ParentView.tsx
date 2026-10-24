import React, { useState } from 'react';
import type { ScheduleEvent, StudentSubmission } from '../types';
import { groupSlotsByDate } from '../utils/timeUtils';
import confetti from 'canvas-confetti';
import { Check, Sparkles, Send, CheckCircle2, User, HelpCircle } from 'lucide-react';

interface ParentViewProps {
  event: ScheduleEvent;
  onSubmit: (submission: Omit<StudentSubmission, 'id' | 'submittedAt'>) => void;
  isPreview?: boolean;
}

export const ParentView: React.FC<ParentViewProps> = ({ event, onSubmit, isPreview }) => {
  const [firstName, setFirstName] = useState('');
  const [lastNameInitial, setLastNameInitial] = useState('');
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const groupedDays = groupSlotsByDate(event.slots);
  const minRequired = event.minSelectionsRequired || 3;
  const isMinMet = selectedSlotIds.length >= minRequired;
  const isNameValid = firstName.trim().length > 0 && lastNameInitial.trim().length > 0;
  const canSubmit = isMinMet && isNameValid;

  const toggleSlot = (slotId: string) => {
    setSelectedSlotIds(prev =>
      prev.includes(slotId) ? prev.filter(id => id !== slotId) : [...prev, slotId]
    );
  };

  const selectAllInDay = (slotIds: string[]) => {
    const allSelected = slotIds.every(id => selectedSlotIds.includes(id));
    if (allSelected) {
      // Unselect all in this day
      setSelectedSlotIds(prev => prev.filter(id => !slotIds.includes(id)));
    } else {
      // Add all missing in this day
      setSelectedSlotIds(prev => Array.from(new Set([...prev, ...slotIds])));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
    });

    onSubmit({
      eventId: event.id,
      firstName: firstName.trim(),
      lastNameInitial: lastNameInitial.trim().toUpperCase(),
      selectedSlotIds,
    });

    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <div style={{ display: 'inline-flex', background: '#dcfce7', color: '#16a34a', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
          <CheckCircle2 size={48} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem', color: '#0f172a' }}>
          Kiitos vastauksestasi!
        </h2>
        <p style={{ color: '#475569', maxWidth: '460px', margin: '0 auto 1.5rem auto', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Toiveesi on tallennettu onnistuneesti oppilaalle <strong>{firstName} {lastNameInitial.toUpperCase()}.</strong>
        </p>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '2rem' }}>
          Opettaja {event.teacherName} vahvistaa lopullisen arviointikeskusteluajan Wilma-viestillä.
        </p>
        <button
          className="btn-secondary"
          onClick={() => {
            setIsSubmitted(false);
            setSelectedSlotIds([]);
            setFirstName('');
            setLastNameInitial('');
          }}
        >
          Lähetä toinen vastaus (toinen lapsi)
        </button>
      </div>
    );
  }

  return (
    <div className="main-layout">
      {isPreview && (
        <div style={{
          background: '#fef3c7',
          color: '#92400e',
          padding: '0.75rem 1rem',
          borderRadius: '10px',
          marginBottom: '1rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Sparkles size={18} />
          <span>Esikatselutila: Näet lomakkeen täsmälleen sellaisena kuin huoltaja sen näkee.</span>
        </div>
      )}

      {/* Paper Header / Snoopy Box */}
      <div className="card">
        <div className="paper-header-box">
          {event.imageUrl && (
            <div className="snoopy-avatar" title="Kuvitus">
              <img src={event.imageUrl} alt="Kuvitus" />
            </div>
          )}
          <div style={{ flex: 1 }}>
            <h1 className="paper-title">{event.title}</h1>
            <div className="paper-instructions">{event.instructions}</div>
          </div>
        </div>

        {/* Student Name GDPR Section */}
        <div style={{
          background: '#f8fafc',
          padding: '1.25rem',
          borderRadius: '12px',
          border: '1.5px solid #e2e8f0',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <User size={18} color="#2563eb" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
              Oppilaan nimi
            </h3>
          </div>

          <div className="name-input-container">
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="firstName">
                Oppilaan etunimi *
              </label>
              <input
                id="firstName"
                type="text"
                className="form-input"
                placeholder="esim. Esko"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="lastNameInitial">
                Sukunimen 1. kirjain *
              </label>
              <input
                id="lastNameInitial"
                type="text"
                className="form-input"
                placeholder="esim. M"
                maxLength={1}
                value={lastNameInitial}
                onChange={e => setLastNameInitial(e.target.value.toUpperCase())}
                style={{ textAlign: 'center', fontWeight: 700, textTransform: 'uppercase' }}
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div className="name-preview-pill">
              <span>Opettajalle näkyvä muoto:</span>
              <strong>{firstName.trim() || 'Etunimi'} {lastNameInitial.trim().toUpperCase() ? `${lastNameInitial.trim().toUpperCase()}.` : 'X.'}</strong>
            </div>

            <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <HelpCircle size={14} />
              Tietosuoja: Koko sukunimeä ei kerätä eikä tallenneta.
            </span>
          </div>
        </div>

        {/* Schedule Grid */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
              Valitse sopivat ajat
            </h3>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Rastita vähintään {minRequired} vaihtoehtoa
            </span>
          </div>

          <div className="day-columns-grid">
            {groupedDays.map(group => {
              const daySlotIds = group.slots.map(s => s.id);
              const allSelected = daySlotIds.length > 0 && daySlotIds.every(id => selectedSlotIds.includes(id));

              return (
                <div key={`${group.date}_${group.section || ''}`} className="day-column-card">
                  <div className="day-header">
                    <div>
                      <span className="day-title">{group.dateLabel}</span>
                      {group.section && (
                        <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                          {group.section}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="select-all-btn"
                      onClick={() => selectAllInDay(daySlotIds)}
                      title="Valitse tai poista kaikki tämän päivän ajat"
                    >
                      {allSelected ? 'Tyhjennä' : '⚡ Kaikki'}
                    </button>
                  </div>

                  <div className="slots-stack">
                    {group.slots.map(slot => {
                      const isSelected = selectedSlotIds.includes(slot.id);
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          className={`slot-toggle-btn ${isSelected ? 'selected' : ''}`}
                          onClick={() => toggleSlot(slot.id)}
                          aria-pressed={isSelected}
                        >
                          <span>{slot.startTime} – {slot.endTime}</span>
                          <span className="slot-check">
                            <Check size={14} />
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar for Submission */}
      <div className="submission-bar">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: isMinMet ? '#dcfce7' : '#fee2e2',
              color: isMinMet ? '#16a34a' : '#ef4444',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}>
              {selectedSlotIds.length}
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isMinMet ? '#16a34a' : '#1e293b' }}>
              {isMinMet
                ? `Aikoja valittu ${selectedSlotIds.length} kpl (Minimi ${minRequired} täytetty ✓)`
                : `Valitse vielä ${minRequired - selectedSlotIds.length} aikaa`}
            </span>
          </div>
          {!isNameValid && (
            <span style={{ fontSize: '0.8rem', color: '#ef4444', display: 'block', marginTop: '2px' }}>
              Täytäthän oppilaan etunimen ja sukunimen ensimmäisen kirjaimen yllä.
            </span>
          )}
        </div>

        <button
          type="button"
          className="submit-btn"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          <Send size={18} />
          <span>Lähetä toiveet opettajalle</span>
        </button>
      </div>
    </div>
  );
};
