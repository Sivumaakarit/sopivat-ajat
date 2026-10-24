import React, { useState } from 'react';
import type { ScheduleEvent, StudentSubmission } from '../types';
import { getStudentDisplayName, sortSlotsChronologically } from '../utils/timeUtils';
import { normalizeImageUrl } from '../services/storage';
import {
  Search,
  Calendar,
  Clock,
  CheckCircle,
  Sparkles,
  ArrowLeftRight,
  ShieldCheck,
  X,
  MapPin,
} from 'lucide-react';

interface PublicViewProps {
  event: ScheduleEvent;
  submissions: StudentSubmission[];
}

export const PublicView: React.FC<PublicViewProps> = ({ event, submissions }) => {
  const [searchName, setSearchName] = useState('');
  const [filterDay, setFilterDay] = useState<string>('ALL');

  const sortedSlots = sortSlotsChronologically(event.slots);
  const distinctDays = Array.from(new Set(sortedSlots.map(s => s.dateLabel || s.date)));

  // Find all matched slots for user's search
  const query = searchName.trim().toLowerCase();
  const matchedSlots = query
    ? sortedSlots.filter(slot => {
        if (!slot.assignedStudentId) return false;
        const student = submissions.find(s => s.id === slot.assignedStudentId);
        if (!student) return false;
        const displayName = getStudentDisplayName(student, submissions).toLowerCase();
        return (
          student.firstName.toLowerCase().includes(query) ||
          displayName.includes(query)
        );
      })
    : [];

  const topMatchSlot = matchedSlots.length > 0 ? matchedSlots[0] : null;
  const topMatchStudent = topMatchSlot
    ? submissions.find(s => s.id === topMatchSlot.assignedStudentId)
    : null;

  // Filter slots for list
  const displayedSlots = sortedSlots.filter(slot => {
    if (filterDay !== 'ALL' && (slot.dateLabel || slot.date) !== filterDay) {
      return false;
    }
    return true;
  });

  return (
    <div className="main-layout">
      {/* 1. Header Card */}
      <div className="card">
        <div className="paper-header-box" style={{ borderBottom: 'none', marginBottom: '0.5rem', paddingBottom: 0 }}>
          <div className="brand-avatar" title="Sopivat ajat -logo">
            <img src={normalizeImageUrl(event.imageUrl)} alt="Sopivat ajat" />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#f0fdf4',
                color: '#16a34a',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                marginBottom: '0.5rem',
                border: '1px solid #bbf7d0',
              }}
            >
              <CheckCircle size={14} />
              <span>Vahvistettu aikataulu</span>
            </div>
            <h1 className="paper-title" style={{ fontSize: '1.6rem', color: '#0f172a' }}>
              {event.title}
            </h1>
            <p style={{ color: '#475569', fontSize: '0.98rem', marginTop: '0.35rem', lineHeight: 1.5 }}>
              Opettaja {event.teacherName || 'Esko'} on vahvistanut luokan arviointikeskusteluajat.
              Tervetuloa tapaamiseen omassa luokassamme sovittuna aikana!
            </p>
          </div>
        </div>

        {/* 2. Search Box */}
        <div style={{ marginTop: '1.5rem', position: 'relative', maxWidth: '480px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px', paddingRight: searchName ? '38px' : '14px', fontSize: '1rem' }}
            placeholder="Etsi lapsen nimellä (esim. Esko)..."
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
          />
          {searchName && (
            <button
              type="button"
              onClick={() => setSearchName('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
              }}
              title="Tyhjennä haku"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 3. Top Celebratory Result Card when searched */}
      {topMatchSlot && topMatchStudent && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
            border: '2px solid #86efac',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a', fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
            <Sparkles size={18} />
            <span>Sinun vahvistettu aikasi löydetty!</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              🎉 {getStudentDisplayName(topMatchStudent, submissions)}
            </h2>
            <span
              style={{
                background: '#16a34a',
                color: '#ffffff',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 700,
              }}
            >
              Vahvistettu aika
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              marginTop: '1.25rem',
              background: '#ffffff',
              padding: '1rem',
              borderRadius: '12px',
              border: '1px solid #bbf7d0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Calendar size={18} color="#16a34a" />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Päivä</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  {topMatchSlot.dateLabel || topMatchSlot.date}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={18} color="#16a34a" />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Kellonaika</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  klo {topMatchSlot.startTime} – {topMatchSlot.endTime}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <MapPin size={18} color="#16a34a" />
              <div>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Paikka</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  Koululla omassa luokassa
                </div>
              </div>
            </div>
          </div>

          <p style={{ margin: '1rem 0 0 0', fontSize: '0.9rem', color: '#166534', fontWeight: 500 }}>
            Merkitsethän ajan kalenteriisi! Jos tarvitset myöhemmin muutosta, katso alla olevat ohjeet vaihtamiseen.
          </p>
        </div>
      )}

      {query && matchedSlots.length === 0 && (
        <div
          className="card"
          style={{
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            color: '#92400e',
            fontSize: '0.95rem',
          }}
        >
          🔍 Nimellä <strong>"{searchName}"</strong> ei löytynyt vahvistettua aikaa. Varmista etunimen kirjoitusasu tai laita viestiä opettajalle Wilmassa!
        </div>
      )}

      {/* 4. Warm Swapping Note (Requested by user in Audio 1) */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
          border: '1.5px solid #cbd5e1',
          borderRadius: '14px',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <div
            style={{
              background: '#e0e7ff',
              color: '#4338ca',
              padding: '0.5rem',
              borderRadius: '10px',
              flexShrink: 0,
            }}
          >
            <ArrowLeftRight size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', margin: '0 0 0.4rem 0' }}>
              Tuli esteitä tai toive vaihtaa päittäin?
            </h3>
            <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, margin: '0 0 0.5rem 0' }}>
              Aikatauluja saa totta kai vielä vaihtaa keskenään! Jos teille tulee myöhemmin este tai toivotte toista aikaa, voitte vapaasti sopia toisen perheen kanssa aikojen vaihtamisesta päittäin.
            </p>
            <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
              Kun olette sopineet vaihdosta keskenänne, laittakaa siitä vain lyhyt viesti <strong>{event.teacherName || 'Eskolle'}</strong> Wilmassa – opettaja päivittää sen sitten aikatauluun. Näinkin joskus sattuu ja se on täysin okei! 😊
            </p>
          </div>
        </div>
      </div>

      {/* 5. Schedule Table / Cards by Day */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Koko luokan vahvistettu aikataulu
          </h3>

          {/* Day Filter Pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`select-all-btn ${filterDay === 'ALL' ? 'active' : ''}`}
              style={{
                background: filterDay === 'ALL' ? '#2563eb' : '#ffffff',
                color: filterDay === 'ALL' ? '#ffffff' : '#475569',
              }}
              onClick={() => setFilterDay('ALL')}
            >
              Kaikki ({sortedSlots.length})
            </button>
            {distinctDays.map(day => (
              <button
                key={day}
                type="button"
                className={`select-all-btn ${filterDay === day ? 'active' : ''}`}
                style={{
                  background: filterDay === day ? '#2563eb' : '#ffffff',
                  color: filterDay === day ? '#ffffff' : '#475569',
                }}
                onClick={() => setFilterDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {displayedSlots.length === 0 ? (
          <p style={{ color: '#94a3b8', fontStyle: 'italic', padding: '1rem 0' }}>
            Ei aikoja valitussa näkymässä.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {displayedSlots.map(slot => {
              const student = slot.assignedStudentId
                ? submissions.find(s => s.id === slot.assignedStudentId)
                : null;
              const displayName = student ? getStudentDisplayName(student, submissions) : null;
              const isUserSearchedMatch =
                query &&
                student &&
                (student.firstName.toLowerCase().includes(query) ||
                  displayName?.toLowerCase().includes(query));

              return (
                <div
                  key={slot.id}
                  style={{
                    background: isUserSearchedMatch ? '#f0fdf4' : slot.assignedStudentId ? '#ffffff' : '#f8fafc',
                    border: isUserSearchedMatch
                      ? '2px solid #16a34a'
                      : slot.assignedStudentId
                      ? '1.5px solid #e2e8f0'
                      : '1.5px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.45rem',
                    boxShadow: isUserSearchedMatch ? '0 4px 12px rgba(22, 163, 74, 0.15)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: '1.05rem',
                        color: isUserSearchedMatch ? '#166534' : slot.assignedStudentId ? '#0f172a' : '#64748b',
                      }}
                    >
                      {displayName ? displayName : '— Vapaa aika —'}
                    </span>
                    {isUserSearchedMatch ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: '#16a34a',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 700,
                        }}
                      >
                        Oma aikasi ⭐
                      </span>
                    ) : slot.assignedStudentId ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 700,
                        }}
                      >
                        Varattu
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: '#f1f5f9',
                          color: '#64748b',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 600,
                        }}
                      >
                        Vapaana
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: '#475569', fontWeight: 600 }}>
                    <Calendar size={14} color="#64748b" />
                    <span>{slot.dateLabel || slot.date}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', color: '#0f172a', fontWeight: 700 }}>
                    <Clock size={14} color="#64748b" />
                    <span>klo {slot.startTime} – {slot.endTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 6. Discreet GDPR footer */}
        <div
          style={{
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: '#94a3b8',
            fontSize: '0.75rem',
          }}
        >
          <ShieldCheck size={14} />
          <span>
            Tietosuojan (GDPR) mukaisesti oppilaista näytetään julkisesti vain etunimi ja sukunimen alkukirjain.
          </span>
        </div>
      </div>
    </div>
  );
};
