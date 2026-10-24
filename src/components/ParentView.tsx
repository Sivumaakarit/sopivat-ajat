import React, { useState } from 'react';
import type { ScheduleEvent, StudentSubmission, ViewMode } from '../types';
import { groupSlotsByDate } from '../utils/timeUtils';
import confetti from 'canvas-confetti';
import {
  Check,
  Sparkles,
  Send,
  CheckCircle2,
  User,
  HelpCircle,
  AlertCircle,
  ArrowRight,
  Copy,
  Share2,
  MessageSquare,
  ShieldCheck,
  X,
  ExternalLink,
} from 'lucide-react';

interface ParentViewProps {
  event: ScheduleEvent;
  submissions?: StudentSubmission[];
  onSubmit: (submission: Omit<StudentSubmission, 'id' | 'submittedAt'>) => void;
  isPreview?: boolean;
  onNavigate?: (view: ViewMode) => void;
}

export const ParentView: React.FC<ParentViewProps> = ({
  event,
  submissions = [],
  onSubmit,
  isPreview,
  onNavigate,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastNameInitial, setLastNameInitial] = useState('');
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedWilma, setCopiedWilma] = useState(false);
  const [showGdprModal, setShowGdprModal] = useState(false);

  // Check if a submission with this student name already exists
  const existingSubmission = submissions.find(
    s =>
      firstName.trim().length > 0 &&
      lastNameInitial.trim().length > 0 &&
      s.firstName.trim().toLowerCase() === firstName.trim().toLowerCase() &&
      s.lastNameInitial.trim().toUpperCase().replace('.', '') === lastNameInitial.trim().toUpperCase().replace('.', '')
  );

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
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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

          {isPreview && onNavigate && (
            <button
              type="button"
              className="btn-primary"
              onClick={() => onNavigate('matching')}
              style={{
                background: '#16a34a',
                border: 'none',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.65rem 1.3rem',
                borderRadius: '8px',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              <span>Siirry aikasovitukseen (palapeli)</span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}${window.location.pathname}?e=${encodeURIComponent(event.id)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyWilma = () => {
    const wilmaMsg = `Hei huoltajat!\n\nOn aika varata oppilaiden arviointikeskusteluajat. Yhteiseen keskusteluun osallistuvat oppilas, opettaja ja kodin edustaja(t).\n\nKäykää valitsemassa teille sopivat ajat alla olevasta linkistä:\n${shareUrl}\n\nValitkaa vähintään ${minRequired} teille sopivaa vaihtoehtoa. Vahvistan kullekin perheelle sovitun ajan Wilma-viestillä.\n\nYstävällisin terveisin,\n${event.teacherName || 'Opettaja'}`;

    navigator.clipboard.writeText(wilmaMsg);
    setCopiedWilma(true);
    setTimeout(() => setCopiedWilma(false), 2500);
  };

  return (
    <div className="main-layout">
      {isPreview && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
            border: '2px solid #93c5fd',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            borderRadius: '14px',
            boxShadow: '0 4px 15px rgba(37, 99, 235, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: '0.35rem',
                }}
              >
                <Sparkles size={14} />
                <span>Vaihe 2 / 4: Huoltajanäkymän esikatselu & jakaminen</span>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
                Jaa tämä lomake huoltajille Wilmassa
              </h3>
              <p style={{ color: '#475569', fontSize: '0.9rem', margin: 0, maxWidth: '640px' }}>
                Alla näet lomakkeen sellaisena kuin huoltajat näkevät sen omalla laitteellaan (ilman tätä opettajan jakolaatikkoa).
              </p>
            </div>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('matching')}
                style={{
                  background: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  padding: '0.65rem 1.35rem',
                  borderRadius: '10px',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 3px 10px rgba(22, 163, 74, 0.25)',
                }}
                title="Siirry aikasovitukseen sovittamaan aikoja"
              >
                <span>Vaihe 3: Siirry aikasovitukseen (palapeli)</span>
                <ArrowRight size={18} />
              </button>
            )}
          </div>

          {/* Share Link Row & Wilma Copy */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              background: '#ffffff',
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: '240px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: '#f8fafc',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Share2 size={16} color="#64748b" />
              <span
                style={{
                  fontSize: '0.85rem',
                  color: '#0f172a',
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  userSelect: 'all',
                }}
              >
                {shareUrl}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className="btn-secondary"
              style={{
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap',
              }}
            >
              {copiedLink ? <Check size={16} color="#16a34a" /> : <Copy size={16} />}
              <span>{copiedLink ? 'Linkki kopioitu! ✓' : 'Kopioi linkki'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopyWilma}
              style={{
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.1rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.2)',
              }}
            >
              {copiedWilma ? <Check size={16} /> : <MessageSquare size={16} />}
              <span>{copiedWilma ? 'Wilma-viesti kopioitu! ✓' : '📋 Kopioi valmis Wilma-viesti'}</span>
            </button>
          </div>

          {/* Live submissions indicator */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '0.75rem',
              fontSize: '0.82rem',
              color: '#475569',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: submissions.length > 0 ? '#16a34a' : '#94a3b8',
                }}
              ></div>
              <span>
                <strong>{submissions.length}</strong> huoltajaa on vastannut tähän kyselyyn.
              </span>
            </div>
            <span style={{ color: '#64748b' }}>💡 Vastaukset tallentuvat pilveen reaaliajassa.</span>
          </div>
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
            <div className="name-input-first form-group" style={{ marginBottom: 0 }}>
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

            <div className="name-input-initial form-group" style={{ marginBottom: 0 }}>
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
                autoComplete="off"
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', marginTop: '0.85rem', flexWrap: 'wrap', gap: '1.25rem' }}>
            <div className="name-preview-pill">
              <span>Opettajalle näkyvä muoto:</span>
              <strong>{firstName.trim() || 'Etunimi'} {lastNameInitial.trim().toUpperCase() ? `${lastNameInitial.trim().toUpperCase()}.` : 'X.'}</strong>
            </div>

            <button
              type="button"
              onClick={() => setShowGdprModal(true)}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.2rem 0',
                fontSize: '0.82rem',
                color: '#2563eb',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
                fontWeight: 600,
              }}
              title="Avaa viralliset GDPR- ja tietosuojatiedot"
            >
              <HelpCircle size={15} color="#2563eb" />
              <span>Tietosuoja: Koko sukunimeä ei kerätä (Lue GDPR-ohjeistus)</span>
            </button>
          </div>

          {/* Gentle Duplicate Reminder Banner */}
          {existingSubmission && (
            <div style={{
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              marginTop: '0.85rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}>
              <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.86rem', color: '#92400e', lineHeight: 1.5 }}>
                <strong>Lempeä muistutus: Oppilaalle {existingSubmission.firstName} {existingSubmission.lastNameInitial}. on jo aiempi vastaus!</strong>
                <p style={{ margin: '0.25rem 0 0 0', color: '#78350f', fontSize: '0.82rem' }}>
                  Perheen toinen huoltaja on voinut jo käydä valitsemassa aikoja. Jos lähetät tämän lomakkeen, uudet toiveesi <strong>päivittävät ja korvaavat</strong> aiemman vastauksen. Näin opettajalle ei synny tuplavarausta.
                </p>
              </div>
            </div>
          )}
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

          {groupedDays.length === 0 ? (
            <div style={{ padding: '2.5rem 1rem', textAlign: 'center', background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '12px', color: '#64748b' }}>
              <p style={{ fontWeight: 600, fontSize: '1rem' }}>Opettaja ei ole vielä lisännyt aikoja tähän tapahtumaan.</p>
            </div>
          ) : (
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
          )}
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
          <span>{existingSubmission ? 'Päivitä oppilaan toiveet' : 'Lähetä toiveet opettajalle'}</span>
        </button>
      </div>

      {/* Comprehensive GDPR & Privacy Modal */}
      {showGdprModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowGdprModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '560px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '1.75rem',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setShowGdprModal(false)}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b',
              }}
              title="Sulje"
            >
              <X size={18} />
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#dcfce7', color: '#16a34a', padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              <ShieldCheck size={14} />
              <span>Tietosuoja ja GDPR (Perusopetus)</span>
            </div>

            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem 0' }}>
              Miksi vain etunimi ja sukunimen 1. kirjain?
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', color: '#334155', fontSize: '0.92rem', lineHeight: 1.6, marginTop: '1rem' }}>
              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.25rem 0' }}>
                  1. Tietojen minimointi (GDPR 5(1)(c) artikla)
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                  EU:n yleisen tietosuoja-asetuksen mukaan henkilötietoja saa kerätä vain sen verran kuin on käyttötarkoituksen kannalta välttämätöntä (<em>Data Minimization</em>). Tässä kyselyssä <strong>ei kerätä koko sukunimeä, henkilötunnusta, sähköpostiosoitetta, puhelinnumeroa tai kotiosoitetta</strong>.
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.25rem 0' }}>
                  2. Lakisääteinen tehtävä ja käyttötarkoitus
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                  Tietoja käytetään ainoastaan tämän arviointikeskustelukierroksen aikojen sovittamiseen kodin ja koulun välillä (Perusopetuslaki 628/1998, 16 § ja 22 §: kodin ja koulun välinen yhteistyö ja oppilaan arviointi).
                </p>
              </div>

              <div style={{ background: '#f8fafc', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.25rem 0' }}>
                  3. Säilytysaika ja tietoturva
                </h4>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#475569' }}>
                  Tiedot tallennetaan turvallisesti EU-alueella sijaitsevaan palvelimeen (Tukholma, Ruotsi). Vastaukset poistetaan heti keskustelujen päätyttyä, ja opettaja voi poistaa kaikki tiedot milloin tahansa yhdellä klikkauksella. Tietoja ei luovuteta kolmansille osapuolille.
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <a
                  href="https://tietosuoja.fi"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: '#2563eb', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'underline' }}
                >
                  <span>Tietosuojavaltuutetun toimisto (tietosuoja.fi)</span>
                  <ExternalLink size={14} />
                </a>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setShowGdprModal(false)}
                  style={{ padding: '0.55rem 1.35rem', fontSize: '0.9rem', borderRadius: '8px' }}
                >
                  Ymmärretty, sulje
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
