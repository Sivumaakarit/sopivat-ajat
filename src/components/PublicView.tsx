import React, { useState } from 'react';
import type { ScheduleEvent, StudentSubmission } from '../types';
import { getStudentDisplayName, sortSlotsChronologically } from '../utils/timeUtils';
import { normalizeImageUrl } from '../services/storage';
import { Search, Calendar, Clock, CheckCircle } from 'lucide-react';

interface PublicViewProps {
  event: ScheduleEvent;
  submissions: StudentSubmission[];
}

export const PublicView: React.FC<PublicViewProps> = ({ event, submissions }) => {
  const [searchName, setSearchName] = useState('');

  // Assigned slots only, sorted chronologically
  const sortedSlots = sortSlotsChronologically(event.slots);
  const assignedSlots = sortedSlots.filter(s => s.assignedStudentId);

  const filteredSlots = assignedSlots.filter(slot => {
    if (!searchName.trim()) return true;
    const student = submissions.find(s => s.id === slot.assignedStudentId);
    if (!student) return false;
    const name = getStudentDisplayName(student, submissions).toLowerCase();
    return name.includes(searchName.trim().toLowerCase());
  });

  return (
    <div className="main-layout">
      {/* Header Card */}
      <div className="card">
        <div className="paper-header-box" style={{ borderBottom: 'none', marginBottom: '0.5rem', paddingBottom: 0 }}>
          <div className="brand-avatar" title="Sopivat ajat -logo">
            <img src={normalizeImageUrl(event.imageUrl)} alt="Sopivat ajat" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f0fdf4', color: '#16a34a', padding: '3px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              <CheckCircle size={14} />
              <span>Vahvistettu aikataulu</span>
            </div>
            <h1 className="paper-title">{event.title}</h1>
            <p style={{ color: '#64748b', fontSize: '0.95rem' }}>
              Opettaja {event.teacherName} on vahvistanut arviointikeskusteluajat. Tervetuloa luokkaamme sovittuna aikana!
            </p>
          </div>
        </div>

        {/* Quick Search */}
        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ position: 'relative', maxWidth: '420px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px' }}
              placeholder="Etsi omaa nimeä (esim. Esko)..."
              value={searchName}
              onChange={e => setSearchName(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Confirmed Schedule List */}
      <div className="card">
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem' }}>
          Vahvistetut tapaamiset ({filteredSlots.length} kpl)
        </h3>

        {filteredSlots.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '1rem 0' }}>
            {searchName ? `Ei löytynyt aikoja haulla "${searchName}".` : 'Ei vielä vahvistettuja aikoja.'}
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filteredSlots.map(slot => {
              const student = submissions.find(s => s.id === slot.assignedStudentId);
              const displayName = student ? getStudentDisplayName(student, submissions) : 'Oppilas';

              return (
                <div
                  key={slot.id}
                  style={{
                    background: '#f8fafc',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#2563eb' }}>
                      {displayName}
                    </span>
                    <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      Vahvistettu
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: '#334155', fontWeight: 600 }}>
                    <Calendar size={14} color="#64748b" />
                    <span>{slot.dateLabel || slot.date}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: '#334155', fontWeight: 700 }}>
                    <Clock size={14} color="#64748b" />
                    <span>klo {slot.startTime} – {slot.endTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
