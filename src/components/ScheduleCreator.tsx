import React, { useState } from 'react';
import type { ScheduleEvent, TimeSlot } from '../types';
import { addMinutesToTime, getMinutesDifference, groupSlotsByDate } from '../utils/timeUtils';
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
} from 'lucide-react';

interface ScheduleCreatorProps {
  event: ScheduleEvent;
  onUpdateEvent: (updated: ScheduleEvent) => void;
  onOpenPreview: () => void;
}

export const ScheduleCreator: React.FC<ScheduleCreatorProps> = ({
  event,
  onUpdateEvent,
  onOpenPreview,
}) => {
  // Current active day for slot creation
  const [selectedDateLabel, setSelectedDateLabel] = useState('Torstai 12.11.');
  const [selectedDate, setSelectedDate] = useState('2026-11-12');
  const [selectedSection, setSelectedSection] = useState('Marraskuu');

  // Input for the next slot (user can freely type 17:00 or any time)
  const [startTimeInput, setStartTimeInput] = useState('13:15');

  // Custom day input state
  const [showCustomDayInput, setShowCustomDayInput] = useState(false);
  const [customDateValue, setCustomDateValue] = useState('');
  const [customDayLabel, setCustomDayLabel] = useState('');
  const [customSection, setCustomSection] = useState('Marraskuu');

  // Find the last slot of the active day
  const currentDaySlots = event.slots.filter(
    s => (s.dateLabel === selectedDateLabel || s.date === selectedDate) && (s.section === selectedSection)
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

    const updatedSlots = [...event.slots, newSlot];
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
    if (
      window.confirm(
        `Haluatko varmasti poistaa koko päivän "${dayLabel}" ja sen kaikki ${slotsInDay.length} aikaa?`
      )
    ) {
      const remainingSlots = event.slots.filter(
        s => s.dateLabel !== dayLabel && s.date !== dayLabel
      );
      onUpdateEvent({ ...event, slots: remainingSlots });

      // If the currently selected day was deleted, switch to the first remaining day
      const remainingDays = Array.from(new Set(remainingSlots.map(s => s.dateLabel || s.date)));
      if (remainingDays.length > 0) {
        setSelectedDateLabel(remainingDays[0]);
        const matched = remainingSlots.find(s => s.dateLabel === remainingDays[0]);
        if (matched) {
          setSelectedDate(matched.date);
          setSelectedSection(matched.section || '');
        }
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

      onUpdateEvent({ ...event, slots: [...event.slots, ...clonedSlots] });
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

  // Distinct day labels currently in the schedule
  const distinctDayLabels = Array.from(new Set(event.slots.map(s => s.dateLabel || s.date)));
  const groupedDays = groupSlotsByDate(event.slots);

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

        <button className="btn-primary" onClick={onOpenPreview}>
          <Eye size={16} />
          <span>Esikatsele huoltajanäkymää</span>
        </button>
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

          <button
            type="button"
            className="btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.45rem 0.85rem' }}
            onClick={() => setShowCustomDayInput(!showCustomDayInput)}
          >
            <Calendar size={15} />
            <span>📅 + Lisää uusi päivä kalenterista</span>
          </button>
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
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Päivämäärä</label>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: '160px' }}
                  value={customDateValue}
                  onChange={handleCalendarPickerChange}
                />
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

        {/* Day selection tabs */}
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
        </div>
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
      </div>
    </div>
  );
};
