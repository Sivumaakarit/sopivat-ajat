import React from 'react';
import type { ScheduleEvent, StudentSubmission } from '../types';
import { getStudentDisplayName, sortSlotsChronologically } from '../utils/timeUtils';
import { normalizeImageUrl } from '../services/storage';
import { Printer, ArrowLeft } from 'lucide-react';

interface PrintViewProps {
  event: ScheduleEvent;
  submissions: StudentSubmission[];
  onBack: () => void;
}

export const PrintView: React.FC<PrintViewProps> = ({ event, submissions, onBack }) => {
  const handlePrint = () => {
    window.print();
  };

  const sortedSlots = sortSlotsChronologically(event.slots);

  return (
    <div className="main-layout">
      {/* Screen toolbar (hidden in print) */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button className="btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Takaisin</span>
        </button>

        <button className="btn-primary" onClick={handlePrint} style={{ fontSize: '1rem', padding: '0.65rem 1.25rem' }}>
          <Printer size={18} />
          <span>Tulosta tämä sivu (A4)</span>
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div>
            <h1 className="print-page-title" style={{ fontSize: '1.6rem', fontWeight: 800, color: '#000', margin: 0 }}>
              {event.title}
            </h1>
            <p style={{ color: '#333', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Opettaja: <strong>{event.teacherName}</strong> | Vahvistettu aikataulu
            </p>
          </div>

          <div style={{ width: '70px', height: '70px' }}>
            <img src={normalizeImageUrl(event.imageUrl)} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>

        <table className="matching-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={{ width: '220px', border: '1px solid #cbd5e1', padding: '8px 12px' }}>Päivä</th>
              <th style={{ width: '160px', border: '1px solid #cbd5e1', padding: '8px 12px' }}>Kellonaika</th>
              <th style={{ border: '1px solid #cbd5e1', padding: '8px 12px' }}>Oppilas</th>
            </tr>
          </thead>
          <tbody>
            {sortedSlots.map(slot => {
              const student = submissions.find(s => s.id === slot.assignedStudentId);
              const displayName = student ? getStudentDisplayName(student, submissions) : '— (Vapaa) —';

              return (
                <tr key={slot.id}>
                  <td style={{ border: '1px solid #e2e8f0', padding: '8px 12px', fontWeight: 600 }}>
                    {slot.dateLabel || slot.date}
                    {slot.section && <span style={{ display: 'block', fontSize: '0.75rem', color: '#666' }}>{slot.section}</span>}
                  </td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '8px 12px', fontWeight: 700 }}>
                    {slot.startTime} – {slot.endTime}
                  </td>
                  <td style={{ border: '1px solid #e2e8f0', padding: '8px 12px', fontWeight: student ? 700 : 400, color: student ? '#000' : '#888' }}>
                    {displayName}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ marginTop: '2rem', borderTop: '1px solid #ccc', paddingTop: '0.75rem', fontSize: '0.8rem', color: '#555', display: 'flex', justifyContent: 'space-between' }}>
          <span>Tapaamispaikka: Oma luokkahuone</span>
          <span>Tulostettu: {new Date().toLocaleDateString('fi-FI')}</span>
        </div>
      </div>
    </div>
  );
};
