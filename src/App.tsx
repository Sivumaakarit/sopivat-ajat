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
  const isTeacherQuery = urlParams.get('mode') === 'teacher' || urlParams.get('admin') === 'true';
  const isParentMode = Boolean(sharedEventId && !isTeacherQuery);

  const [event, setEvent] = useState<ScheduleEvent>(getEvent);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(getSubmissions);
  const [currentView, setCurrentView] = useState<ViewMode>(() => {
    if (isParentMode) return 'parent';
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
        }
      });
      fetchSubmissionsFromCloud(sharedEventId).then(cloudSubs => {
        if (cloudSubs && cloudSubs.length > 0) {
          setSubmissions(cloudSubs);
        }
      });
    }
  }, [sharedEventId]);

  // Real-time Supabase subscription: update submissions immediately when a parent responds
  useEffect(() => {
    if (!event.id) return;

    // Check cloud for existing submissions
    fetchSubmissionsFromCloud(event.id).then(cloudSubs => {
      if (cloudSubs && cloudSubs.length > 0) {
        setSubmissions(cloudSubs);
      }
    });

    const channel = supabase
      .channel(`submissions:${event.id}`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [event.id]);

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
            <span style={{ fontSize: '1.25rem' }}>🗓️</span>
            <div>
              <h1 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>
                Sopivat ajat
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                Arviointikeskustelujen toivekysely
              </p>
            </div>
          </div>
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
          />
        )}
      </main>
    </div>
  );
}

export default App;

