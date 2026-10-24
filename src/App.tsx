import { useState, useEffect } from 'react';
import type { ViewMode, ScheduleEvent, StudentSubmission } from './types';
import {
  getEvent,
  saveEvent,
  getSubmissions,
  upsertSubmission,
  resetAllData,
  INITIAL_EVENT,
  INITIAL_SUBMISSIONS,
  fetchEventFromCloud,
  fetchSubmissionsFromCloud,
} from './services/storage';
import { supabase } from './services/supabaseClient';
import { HeaderNav } from './components/HeaderNav';
import { ScheduleCreator } from './components/ScheduleCreator';
import { ParentView } from './components/ParentView';
import { MatchingView } from './components/MatchingView';
import { PrintView } from './components/PrintView';
import { PublicView } from './components/PublicView';

export function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const sharedEventId = urlParams.get('e');
  const adminParam = urlParams.get('admin');
  const modeParam = urlParams.get('mode');

  const [event, setEvent] = useState<ScheduleEvent>(getEvent);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(getSubmissions);

  // Check teacher status: teacher query param, admin flag/token, or local mode (no shared event ID)
  const isTeacher =
    modeParam === 'teacher' ||
    adminParam === 'true' ||
    Boolean(adminParam && event.adminToken && adminParam === event.adminToken) ||
    !sharedEventId;

  const isParentMode = Boolean(sharedEventId && !isTeacher);

  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    if (isParentMode) {
      const e = getEvent();
      return e.isPublished ? 'public' : 'parent';
    }
    const e = getEvent();
    return e.slots.length > 0 ? 'matching' : 'creator';
  });

  // Fetch shared event from Supabase if opening a shared link
  useEffect(() => {
    if (sharedEventId) {
      fetchEventFromCloud(sharedEventId).then(cloudEvent => {
        if (cloudEvent) {
          setEvent(cloudEvent);
          saveEvent(cloudEvent);
          if (isParentMode) {
            setCurrentView(cloudEvent.isPublished ? 'public' : 'parent');
          }
        }
      });
      fetchSubmissionsFromCloud(sharedEventId).then(cloudSubs => {
        if (cloudSubs && cloudSubs.length > 0) {
          setSubmissions(cloudSubs);
        }
      });
    }
  }, [sharedEventId, isParentMode]);

  // Real-time Supabase subscription: update submissions and event status immediately
  useEffect(() => {
    if (!event.id) return;

    // Check cloud for existing submissions
    fetchSubmissionsFromCloud(event.id).then(cloudSubs => {
      if (cloudSubs && cloudSubs.length > 0) {
        setSubmissions(cloudSubs);
      }
    });

    const channel = supabase
      .channel(`live-channel:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'submissions',
          filter: `event_id=eq.${event.id}`,
        },
        async () => {
          const fresh = await fetchSubmissionsFromCloud(event.id);
          if (fresh) {
            setSubmissions(fresh);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${event.id}`,
        },
        async () => {
          const freshEvent = await fetchEventFromCloud(event.id);
          if (freshEvent) {
            setEvent(freshEvent);
            if (isParentMode) {
              setCurrentView(freshEvent.isPublished ? 'public' : 'parent');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id, isParentMode]);

  const handleUpdateEvent = (updated: ScheduleEvent) => {
    setEvent(updated);
    saveEvent(updated);
  };

  const handleNewSubmission = (sub: Omit<StudentSubmission, 'id' | 'submittedAt'>) => {
    const res = upsertSubmission(sub);
    setSubmissions(res.allSubmissions);
  };

  const handleResetData = () => {
    if (window.confirm('Haluatko varmasti tyhjentää kaikki tiedot ja aloittaa puhtaalta nollapöydältä?')) {
      resetAllData();
      setEvent(INITIAL_EVENT);
      setSubmissions(INITIAL_SUBMISSIONS);
      setCurrentView('creator');
    }
  };

  const assignedCount = event.slots.filter(s => s.assignedStudentId).length;

  return (
    <div className="app-root">
      {!isParentMode && (
        <HeaderNav
          currentView={currentView}
          onViewChange={setCurrentView}
          submissionsCount={submissions.length}
          assignedCount={assignedCount}
          totalSlots={event.slots.length}
          onResetData={handleResetData}
        />
      )}

      {isParentMode && (
        <header
          style={{
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            padding: '0.75rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <img src="/logo.svg" alt="Sopivat ajat" style={{ width: '28px', height: '28px', borderRadius: '6px' }} />
            <div>
              <h1 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                Sopivat ajat
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                {event.isPublished ? 'Vahvistettu aikataulu' : 'Arviointikeskustelujen toivekysely'}
              </p>
            </div>
          </div>
          {event.isPublished ? (
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#16a34a',
                background: '#dcfce7',
                padding: '0.25rem 0.65rem',
                borderRadius: '20px',
              }}
            >
              ● Aikataulu vahvistettu
            </span>
          ) : event.isLocked ? (
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#d97706',
                background: '#fef3c7',
                padding: '0.25rem 0.65rem',
                borderRadius: '20px',
              }}
            >
              ⏳ Palapeli käynnissä
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                color: '#16a34a',
                background: '#dcfce7',
                padding: '0.25rem 0.65rem',
                borderRadius: '20px',
              }}
            >
              ● Ajanvaraus avoinna
            </span>
          )}
        </header>
      )}

      <main>
        {currentView === 'creator' && (
          <ScheduleCreator
            event={event}
            onUpdateEvent={handleUpdateEvent}
            onOpenPreview={() => setCurrentView('parent')}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'parent' && (
          <ParentView
            event={event}
            submissions={submissions}
            onSubmit={handleNewSubmission}
            isPreview={!isParentMode}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'matching' && (
          <MatchingView
            event={event}
            submissions={submissions}
            onEventUpdated={handleUpdateEvent}
            onNavigate={setCurrentView}
          />
        )}

        {currentView === 'print' && (
          <PrintView
            event={event}
            submissions={submissions}
            onBack={() => setCurrentView('matching')}
          />
        )}

        {currentView === 'public' && (
          <PublicView
            event={event}
            submissions={submissions}
            isPreview={!isParentMode}
            onNavigate={setCurrentView}
          />
        )}
      </main>
    </div>
  );
}

export default App;

