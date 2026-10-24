import React, { useState } from 'react';
import type { ScheduleEvent, TimeSlot, ViewMode } from '../types';
import {
  addMinutesToTime,
  getMinutesDifference,
  groupSlotsByDate,
  getNextBusinessDay,
  sortSlotsChronologically,
} from '../utils/timeUtils';
import {
  Plus,
  Trash2,
  Clock,
  Coffee,
  Eye,
  Calendar,
  Settings,
  Sparkles,
  Copy,
  Zap,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

interface ScheduleCreatorProps {
  event: ScheduleEvent;
  onUpdateEvent: (updated: ScheduleEvent) => void;
  onOpenPreview: () => void;
  onNavigate: (view: ViewMode) => void;
}

export const ScheduleCreator: React.FC<ScheduleCreatorProps> = ({
  event,
  onUpdateEvent,
  onOpenPreview,
  onNavigate,
}) => {
  // Current active day for slot creation (empty if starting from scratch with 0 slots)
  const [selectedDateLabel, setSelectedDateLabel] = useState(() => {
    if (event.slots.length > 0) return event.slots[0].dateLabel || event.slots[0].date;
    return '';
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    if (event.slots.length > 0) return event.slots[0].date;
    return '';
  });
  const [selectedSection, setSelectedSection] = useState(() => {
    if (event.slots.length > 0) return event.slots[0].section || '';
    return '';
  });

  // Sync state if slots are cleared (reset to 0)
  React.useEffect(() => {
    if (event.slots.length === 0 && !customDateValue && !customDayLabel) {
      setSelectedDateLabel('');
      setSelectedDate('');
      setSelectedSection('');
    } else if (event.slots.length > 0 && !selectedDateLabel) {
      setSelectedDateLabel(event.slots[0].dateLabel || event.slots[0].date);
      setSelectedDate(event.slots[0].date);
      setSelectedSection(event.slots[0].section || '');
    }
  }, [event.slots.length]);

  // Input for the next slot (user can freely type 17:00 or any time)
  const [startTimeInput, setStartTimeInput] = useState('13:15');

  // Custom day input state
  const [showCustomDayInput, setShowCustomDayInput] = useState(false);
  const [customDateValue, setCustomDateValue] = useState('');
  const [customDayLabel, setCustomDayLabel] = useState('');
  const [customSection, setCustomSection] = useState('Marraskuu');

  // Find slots of active day, always sorted chronologically
  const currentDaySlots = sortSlotsChronologically(
    event.slots.filter(
      s => (s.dateLabel === selectedDateLabel || s.date === selectedDate) && (s.section === selectedSection)
    )
  );

  const calculatedEndTime = addMinutesToTime(startTimeInput, event.slotDurationMinutes);

  // Add a new slot
  const handleAddSlot = (start: string, end: string) => {
    const newSlot: TimeSlot = {
      id: 'slot-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      date: selectedDate,
      dateLabel: selectedDateLabel,
      startTime: start,
      endTime: end,
      section: selectedSection,
    };

    const updatedSlots = sortSlotsChronologically([...event.slots, newSlot]);
    onUpdateEvent({ ...event, slots: updatedSlots });

    // Auto-advance next suggested start time
    setStartTimeInput(end);
  };

  // Add buffer break (e.g. +5 min or +10 min)
  const handleAddBuffer = (bufferMinutes: number) => {
    const newStart = addMinutesToTime(startTimeInput, bufferMinutes);
    setStartTimeInput(newStart);
  };

  // Delete a single slot
  const handleDeleteSlot = (slotId: string) => {
    const updatedSlots = event.slots.filter(s => s.id !== slotId);
    onUpdateEvent({ ...event, slots: updatedSlots });
  };

  // Delete an entire day (with confirmation dialog)
  const handleDeleteDay = (dayLabel: string) => {
    const slotsInDay = event.slots.filter(s => s.dateLabel === dayLabel || s.date === dayLabel);
    if (slotsInDay.length === 0) {
      setSelectedDateLabel('');
      setSelectedDate('');
      setSelectedSection('');
      return;
    }
    if (
      window.confirm(
        `Haluatko varmasti poistaa koko päivän "${dayLabel}" ja sen kaikki ${slotsInDay.length} aikaa?`
      )
    ) {
      const remainingSlots = event.slots.filter(
        s => s.dateLabel !== dayLabel && s.date !== dayLabel
      );
      onUpdateEvent({ ...event, slots: remainingSlots });

      // If the currently selected day was deleted, switch to the first remaining day or clear
      const remainingDays = Array.from(new Set(remainingSlots.map(s => s.dateLabel || s.date)));
      if (remainingDays.length > 0) {
        setSelectedDateLabel(remainingDays[0]);
        const matched = remainingSlots.find(s => s.dateLabel === remainingDays[0]);
        if (matched) {
          setSelectedDate(matched.date);
          setSelectedSection(matched.section || '');
        }
      } else {
        setSelectedDateLabel('');
        setSelectedDate('');
        setSelectedSection('');
      }
    }
  };

  // Copy times from an existing day to current selected day
  const handleCopyTimesFromDay = (sourceDayLabel: string) => {
    const sourceSlots = event.slots.filter(s => s.dateLabel === sourceDayLabel);
    if (sourceSlots.length === 0) return;

    if (
      window.confirm(
        `Kopioidaanko ${sourceSlots.length} kellonaikaa päivältä "${sourceDayLabel}" päivälle "${selectedDateLabel}"?`
      )
    ) {
      const clonedSlots: TimeSlot[] = sourceSlots.map(s => ({
        id: 'slot-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        date: selectedDate,
        dateLabel: selectedDateLabel,
        startTime: s.startTime,
        endTime: s.endTime,
        section: selectedSection,
      }));

      onUpdateEvent({ ...event, slots: sortSlotsChronologically([...event.slots, ...clonedSlots]) });
    }
  };

  // When date is chosen from date picker, auto-generate Finnish weekday name!
  const handleCalendarPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isoDate = e.target.value;
    if (!isoDate) return;
    setCustomDateValue(isoDate);

    const d = new Date(isoDate + 'T00:00:00');
    const weekdays = [
      'Sunnuntai',
      'Maanantai',
      'Tiistai',
      'Keskiviikko',
      'Torstai',
      'Perjantai',
      'Lauantai',
    ];
    const weekday = weekdays[d.getDay()];
    const dayNum = d.getDate();
    const monthNum = d.getMonth() + 1;
    const generatedLabel = `${weekday} ${dayNum}.${monthNum}.`;
    setCustomDayLabel(generatedLabel);
  };

  const handleAddCustomDay = () => {
    if (!customDayLabel.trim()) return;
    setSelectedDateLabel(customDayLabel.trim());
    setSelectedDate(customDateValue || new Date().toISOString().split('T')[0]);
    setSelectedSection(customSection.trim());
    setCustomDayLabel('');
    setCustomDateValue('');
    setShowCustomDayInput(false);
  };

  // Quick-add specific day (e.g. next business day)
  const handleAddSpecificDay = (isoDate: string, dayLabel: string, section?: string) => {
    setSelectedDateLabel(dayLabel);
    setSelectedDate(isoDate);
    setSelectedSection(section || '');
    setCustomDayLabel('');
    setCustomDateValue('');
    setShowCustomDayInput(false);
  };

  // Distinct day labels currently in the schedule, ordered chronologically
  const distinctDayLabels = Array.from(new Set(sortSlotsChronologically(event.slots).map(s => s.dateLabel || s.date)));
  const groupedDays = groupSlotsByDate(event.slots);

  // Compute next business day suggestion (skips weekends!)
  const referenceDate = selectedDate || (event.slots.length > 0 ? event.slots[event.slots.length - 1].date : new Date().toISOString().split('T')[0]);
  const nextBusinessDay = getNextBusinessDay(referenceDate);

  const handleOpenCustomDay = () => {
    if (!showCustomDayInput) {
      setCustomDateValue(nextBusinessDay.isoDate);
      setCustomDayLabel(nextBusinessDay.dateLabel);
      setCustomSection(nextBusinessDay.section);
    }
    setShowCustomDayInput(!showCustomDayInput);
  };

  return (
    <div className="main-layout">
      {/* Top Banner & Quick Preview Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>
            Ajanvarauksen hallinta
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            Syötä ajat vaivattomasti automaattisella ketjutuksella, Enter-painalluksella ja aikahypyillä.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          {event.slots.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('parent')}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.55rem 1.25rem',
                  borderRadius: '8px',
                  fontWeight: 800,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
                }}
                title="Esikatsele huoltajanäkymää ja kopioi jakolinkki Wilmaan"
              >
                <span>Vaihe 2: Esikatsele ja jaa huoltajille</span>
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => onNavigate('matching')}
                title="Siirry suoraan aikasovitukseen (palapeli)"
                style={{ fontWeight: 600, fontSize: '0.85rem' }}
              >
                <span>Aikasovitus (palapeli)</span>
              </button>
            </>
          ) : (
            <button className="btn-secondary" onClick={onOpenPreview}>
              <Eye size={16} />
              <span>Esikatsele huoltajanäkymää</span>
            </button>
          )}
        </div>
      </div>

      {/* Basic Settings Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
          <Settings size={20} color="#2563eb" />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
            Keskustelun perustiedot
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Tapahtuman otsikko</label>
            <input
              type="text"
              className="form-input"
              value={event.title}
              onChange={e => onUpdateEvent({ ...event, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Opettajan / Järjestäjän nimi</label>
            <input
              type="text"
              className="form-input"
              value={event.teacherName}
              onChange={e => onUpdateEvent({ ...event, teacherName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tapaamisen kesto (minuuttia)</label>
            <input
              type="number"
              className="form-input"
              value={event.slotDurationMinutes}
              min={5}
              max={120}
              step={5}
              onChange={e => onUpdateEvent({ ...event, slotDurationMinutes: parseInt(e.target.value, 10) || 20 })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Minimimäärä rastitettavia aikoja</label>
            <input
              type="number"
              className="form-input"
              value={event.minSelectionsRequired}
              min={1}
              max={10}
              onChange={e => onUpdateEvent({ ...event, minSelectionsRequired: parseInt(e.target.value, 10) || 3 })}
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Ohjeet huoltajille</label>
          <textarea
            className="form-textarea"
            rows={4}
            value={event.instructions}
            onChange={e => onUpdateEvent({ ...event, instructions: e.target.value })}
          />
        </div>
      </div>

      {/* Smart Slot Creator Card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={20} color="#2563eb" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
              Päivien ja aikojen hallinta
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* 1-click next business day button */}
            <button
              type="button"
              onClick={() => handleAddSpecificDay(nextBusinessDay.isoDate, nextBusinessDay.dateLabel, nextBusinessDay.section)}
              title={`Luo seuraava arkipäivä ${nextBusinessDay.dateLabel} yhdellä klikkauksella`}
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #86efac',
                color: '#15803d',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.15s ease'
              }}
            >
              <Zap size={14} color="#16a34a" />
              <span>+ Seuraava arkipäivä: <strong>{nextBusinessDay.dateLabel}</strong></span>
            </button>

            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
              onClick={handleOpenCustomDay}
            >
              <Calendar size={15} />
              <span>📅 Valitse muu päivä...</span>
            </button>
          </div>
        </div>

        {/* Modal / Inline Add New Day from Calendar */}
        {showCustomDayInput && (
          <div style={{
            background: '#eff6ff',
            border: '1.5px solid #93c5fd',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e40af' }}>
              Valitse uusi päivämäärä kalenterista:
            </h4>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>📅</span>
                  <span>Päivämäärä</span>
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '10px', fontSize: '1.2rem', pointerEvents: 'none', zIndex: 1 }}>📅</span>
                  <input
                    type="date"
                    className="form-input"
                    style={{ width: '175px', paddingLeft: '2.5rem', fontWeight: 700, cursor: 'pointer', height: '42px' }}
                    value={customDateValue}
                    onChange={handleCalendarPickerChange}
                  />
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Suomenkielinen otsikko</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '220px' }}
                  placeholder="esim. Keskiviikko 18.11."
                  value={customDayLabel}
                  onChange={e => setCustomDayLabel(e.target.value)}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Jakso (valinnainen)</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: '160px' }}
                  placeholder="esim. Marraskuu"
                  value={customSection}
                  onChange={e => setCustomSection(e.target.value)}
                />
              </div>

              <div style={{ alignSelf: 'flex-end', display: 'flex', gap: '0.5rem' }}>
                <button type="button" className="btn-primary" onClick={handleAddCustomDay}>
                  Luo päivä
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowCustomDayInput(false)}>
                  Peruuta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Zero-state onboarding card when no days are defined yet */}
        {!selectedDateLabel && distinctDayLabels.length === 0 ? (
          <div style={{
            background: '#f8fafc',
            border: '2px dashed #93c5fd',
            borderRadius: '16px',
            padding: '2rem 1.25rem',
            textAlign: 'center',
            marginBottom: '1rem',
          }}>
            <div style={{
              display: 'inline-flex',
              background: '#eff6ff',
              color: '#2563eb',
              padding: '0.9rem',
              borderRadius: '50%',
              marginBottom: '0.75rem'
            }}>
              <Calendar size={32} />
            </div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e3a8a', marginBottom: '0.35rem' }}>
              Aloita valitsemalla ensimmäinen keskustelupäivä
            </h4>
            <p style={{ color: '#475569', fontSize: '0.92rem', maxWidth: '440px', margin: '0 auto 1.25rem auto', lineHeight: 1.5 }}>
              Lomake aloittaa puhtaalta nollapöydältä. Valitse kalenterista ensimmäinen päivämäärä, jolle haluat tarjota aikoja.
            </p>

            {/* Inline First Day Picker */}
            <div style={{
              maxWidth: '520px',
              margin: '0 auto',
              background: '#ffffff',
              border: '1.5px solid #bfdbfe',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'left',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.08)',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📅</span>
                    <span>1. Valitse päivämäärä kalenterista</span>
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{ position: 'absolute', left: '10px', fontSize: '1.25rem', pointerEvents: 'none', zIndex: 1 }}>📅</span>
                    <input
                      type="date"
                      className="form-input"
                      style={{ paddingLeft: '2.5rem', fontWeight: 700, cursor: 'pointer', height: '42px', fontSize: '0.95rem' }}
                      value={customDateValue}
                      onChange={handleCalendarPickerChange}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 700 }}>2. Suomenkielinen otsikko</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="esim. Maanantai 16.11."
                    value={customDayLabel}
                    onChange={e => setCustomDayLabel(e.target.value)}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Jakso (valinnainen)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="esim. Syksy"
                    value={customSection}
                    onChange={e => setCustomSection(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ alignSelf: 'flex-end', padding: '0.55rem 1.25rem', fontWeight: 700 }}
                  disabled={!customDayLabel.trim()}
                  onClick={handleAddCustomDay}
                >
                  ✨ Luo ensimmäinen päivä
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Day selection tabs */}
            {distinctDayLabels.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Valitse muokattava päivä:</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {distinctDayLabels.map(dayLabel => {
                    const isSelected = selectedDateLabel === dayLabel;
                    const count = event.slots.filter(s => s.dateLabel === dayLabel).length;
                    return (
                      <div
                        key={dayLabel}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          background: isSelected ? '#eff6ff' : '#ffffff',
                          border: `1.5px solid ${isSelected ? '#3b82f6' : '#e2e8f0'}`,
                          borderRadius: '8px',
                          padding: '2px 4px 2px 8px',
                        }}
                      >
                        <button
                          type="button"
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: isSelected ? '#1d4ed8' : '#334155',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '4px 6px',
                          }}
                          onClick={() => {
                            setSelectedDateLabel(dayLabel);
                            const matched = event.slots.filter(s => s.dateLabel === dayLabel);
                            const lastForDay = matched[matched.length - 1];
                            if (lastForDay) {
                              setSelectedDate(lastForDay.date);
                              setSelectedSection(lastForDay.section || '');
                              setStartTimeInput(lastForDay.endTime);
                            } else {
                              setStartTimeInput(dayLabel.includes('Maanantai') ? '14:00' : '13:15');
                            }
                          }}
                        >
                          <span>{dayLabel}</span>
                          <span style={{
                            fontSize: '0.75rem',
                            background: isSelected ? '#2563eb' : '#f1f5f9',
                            color: isSelected ? '#fff' : '#64748b',
                            padding: '1px 6px',
                            borderRadius: '8px',
                          }}>
                            {count}
                          </span>
                        </button>

                        {/* Day trash button directly in active day tab */}
                        <button
                          type="button"
                          className="day-action-btn"
                          onClick={() => handleDeleteDay(dayLabel)}
                          title={`Poista koko päivä "${dayLabel}"`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

        {/* Smart Adder Box */}
        <div style={{
          background: '#f8fafc',
          border: '1.5px solid #bfdbfe',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '1rem' }}>
                Ajan lisäys: {selectedDateLabel}
              </span>
              <button
                type="button"
                className="day-action-btn"
                style={{ color: '#ef4444' }}
                onClick={() => handleDeleteDay(selectedDateLabel)}
                title="Poista tämä päivä kokonaan"
              >
                <Trash2 size={15} />
                <span style={{ fontSize: '0.75rem', marginLeft: '3px' }}>Poista päivä</span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Copy times from another day */}
              {distinctDayLabels.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginRight: '0.5rem' }}>
                  <Copy size={13} color="#2563eb" />
                  <select
                    className="form-select"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: 'auto' }}
                    defaultValue=""
                    onChange={e => {
                      if (e.target.value) {
                        handleCopyTimesFromDay(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="" disabled>📋 Kopioi ajat toiselta päivältä...</option>
                    {distinctDayLabels
                      .filter(d => d !== selectedDateLabel)
                      .map(d => (
                        <option key={d} value={d}>
                          Kopioi ajat päivältä {d}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                className="select-all-btn"
                onClick={() => handleAddBuffer(5)}
                title="Siirrä seuraavaa aloitusaikaa +5 minuuttia eteenpäin"
              >
                <Coffee size={12} />
                <span>+5 min tauko</span>
              </button>
              <button
                type="button"
                className="select-all-btn"
                onClick={() => handleAddBuffer(10)}
                title="Siirrä seuraavaa aloitusaikaa +10 minuuttia eteenpäin"
              >
                <Coffee size={12} />
                <span>+10 min tauko</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                Aloitusaika:
              </label>
              <input
                type="text"
                className="form-input"
                style={{ width: '90px', textAlign: 'center', fontWeight: 700 }}
                value={startTimeInput}
                onChange={e => setStartTimeInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSlot(startTimeInput, calculatedEndTime);
                  }
                }}
                placeholder="13:15"
                title="Kirjoita uusi aloitusaika (esim. 17:00) ja paina Enter hyväksyäksesi!"
              />
            </div>

            <span style={{ color: '#94a3b8', fontWeight: 600 }}>–</span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                Päättyy:
              </label>
              <span style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '0.55rem 0.85rem',
                borderRadius: '8px',
                fontWeight: 700,
                color: '#1e293b',
              }}>
                {calculatedEndTime}
              </span>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={() => handleAddSlot(startTimeInput, calculatedEndTime)}
              style={{ marginLeft: 'auto' }}
            >
              <Plus size={16} />
              <span>Lisää aika ({startTimeInput}–{calculatedEndTime}) ↵ Enter</span>
            </button>
          </div>

          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Sparkles size={14} color="#2563eb" />
            <span>
              <strong>Pikanäppäin:</strong> Voit kirjoittaa aloitusajan (esim. 17:00) ja painaa suoraan <strong>Enter</strong>! Järjestelmä laskee keston ja luo aikahypyn automaattisesti.
            </span>
          </div>
        </div>

        {/* Existing Slots for Current Day */}
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#334155', marginBottom: '0.75rem' }}>
            Nykyiset ajat päivälle {selectedDateLabel} ({currentDaySlots.length} kpl):
          </h4>

          {currentDaySlots.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic' }}>
              Tälle päivälle ei ole vielä lisätty aikoja. Lisää ensimmäinen yltä!
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {currentDaySlots.map((slot, idx) => {
                const prevSlot = currentDaySlots[idx - 1];
                const hasBigGap = prevSlot && getMinutesDifference(prevSlot.endTime, slot.startTime) >= 60;
                const gapMinutes = prevSlot ? getMinutesDifference(prevSlot.endTime, slot.startTime) : 0;

                return (
                  <React.Fragment key={slot.id}>
                    {hasBigGap && (
                      <div className="time-gap-divider">
                        <Coffee size={14} />
                        <span>Aikahyppy / tauko ({Math.floor(gapMinutes / 60)} t {gapMinutes % 60 > 0 ? `${gapMinutes % 60} min` : ''})</span>
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      padding: '0.6rem 0.9rem',
                      borderRadius: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1e293b' }}>
                          {slot.startTime} – {slot.endTime}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          ({getMinutesDifference(slot.startTime, slot.endTime)} min)
                        </span>
                      </div>

                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => handleDeleteSlot(slot.id)}
                        title="Poista tämä aika"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Guided Action Pathway: Step 1 Complete -> Next step */}
          {event.slots.length > 0 && (
            <div style={{
              marginTop: '1.75rem',
              background: '#f0fdf4',
              border: '2px solid #86efac',
              borderRadius: '14px',
              padding: '1.25rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#dcfce7', color: '#16a34a', padding: '0.5rem', borderRadius: '50%', display: 'flex' }}>
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#14532d', margin: 0 }}>
                    Keskusteluajat luotu ({event.slots.length} aikaa {distinctDayLabels.length} päivälle)
                  </h4>
                  <p style={{ color: '#166534', fontSize: '0.85rem', margin: '2px 0 0 0' }}>
                    Siirry seuraavaksi tarkastelemaan toiveita tai esikatsele huoltajanäkymää.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => onNavigate('parent')}
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.65rem 1.3rem',
                    borderRadius: '10px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 4px 10px rgba(22, 163, 74, 0.25)',
                  }}
                  title="Esikatsele huoltajanäkymää ja kopioi jakolinkki Wilmaan"
                >
                  <span>Vaihe 2: Esikatsele ja jaa huoltajille</span>
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => onNavigate('matching')}
                  style={{ fontWeight: 600 }}
                  title="Siirry suoraan aikasovitukseen (palapeli)"
                >
                  <span>Aikasovitus (palapeli)</span>
                </button>
              </div>
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* Overview of All Days & Bottom Trash Removal */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b' }}>
              Kaikki luodut päivät ja ajat (Yhteensä {event.slots.length} aikaa)
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Voit poistaa minkä tahansa kokonaisen päivän suoraan kyseisen kortin roskakorikuvakkeesta.
            </p>
          </div>
        </div>

        {groupedDays.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px', color: '#64748b' }}>
            <Clock size={32} style={{ margin: '0 auto 0.5rem auto', color: '#94a3b8' }} />
            <h4 style={{ fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>Ei vielä luotuja aikoja</h4>
            <p style={{ fontSize: '0.88rem' }}>Syötä ensimmäiset ajat yllä olevalla lisäystyökalulla aloittaaksesi.</p>
          </div>
        ) : (
          <div className="day-columns-grid">
            {groupedDays.map(g => (
            <div key={`${g.date}_${g.section || ''}`} className="day-column-card">
              <div className="day-header">
                <div>
                  <span className="day-title">{g.dateLabel}</span>
                  {g.section && (
                    <span style={{ display: 'block', fontSize: '0.72rem', color: '#64748b' }}>
                      {g.section}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb' }}>
                    {g.slots.length} kpl
                  </span>
                  {/* Delete whole day button with confirmation */}
                  <button
                    type="button"
                    className="day-action-btn"
                    onClick={() => handleDeleteDay(g.dateLabel)}
                    title={`Poista koko päivä "${g.dateLabel}"`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="slots-stack">
                {g.slots.map(s => (
                  <div
                    key={s.id}
                    style={{
                      padding: '0.4rem 0.6rem',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: '#334155',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>{s.startTime} – {s.endTime}</span>
                    <button
                      type="button"
                      style={{ border: 'none', background: 'transparent', color: '#cbd5e1', cursor: 'pointer', padding: '2px' }}
                      onClick={() => handleDeleteSlot(s.id)}
                      title="Poista tämä aika"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Bottom Big Guided Next Step Banner */}
      {event.slots.length > 0 && (
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
          gap: '1.25rem',
          boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.35)',
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.9, fontWeight: 800 }}>
              🚀 Johdatuspolku: Vaihe 1/3 valmis
            </span>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '4px 0 2px 0', color: '#ffffff' }}>
              Päivät ja ajat on luotu! Siirrytäänkö eteenpäin?
            </h3>
            <p style={{ opacity: 0.92, fontSize: '0.9rem', margin: 0 }}>
              Siirry aikasovitukseen (palapeli) tarkastelemaan vastauksia tai jaa julkinen linkki huoltajille Wilmassa.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => onNavigate('parent')}
              style={{
                background: '#ffffff',
                color: '#15803d',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '10px',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.6rem',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
              }}
            >
              <span>Vaihe 2: Esikatsele ja jaa huoltajille</span>
              <ArrowRight size={20} />
            </button>

            <button
              type="button"
              onClick={() => onNavigate('matching')}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                color: '#ffffff',
                border: '1.5px solid rgba(255, 255, 255, 0.45)',
                padding: '0.75rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span>Tai siirry suoraan aikasovitukseen</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
