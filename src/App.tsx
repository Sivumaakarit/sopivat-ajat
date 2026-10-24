import { useState, useEffect } from 'react';
import type { ViewMode, ScheduleEvent, StudentSubmission } from './types';
import {
  getEvent,
  saveEvent,
  getSubmissions,
  addSubmission,
  resetAllData,
  INITIAL_EVENT,
  INITIAL_SUBMISSIONS,
} from './services/storage';
import { HeaderNav } from './components/HeaderNav';
import { ScheduleCreator } from './components/ScheduleCreator';
import { ParentView } from './components/ParentView';
import { MatchingView } from './components/MatchingView';
import { PrintView } from './components/PrintView';
import { PublicView } from './components/PublicView';

export function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('matching');
  const [event, setEvent] = useState<ScheduleEvent>(getEvent);
  const [submissions, setSubmissions] = useState<StudentSubmission[]>(getSubmissions);

  // Sync state on load
  useEffect(() => {
    setEvent(getEvent());
    setSubmissions(getSubmissions());
  }, []);

  const handleUpdateEvent = (updated: ScheduleEvent) => {
    setEvent(updated);
    saveEvent(updated);
  };

  const handleNewSubmission = (sub: Omit<StudentSubmission, 'id' | 'submittedAt'>) => {
    const newSub = addSubmission(sub);
    setSubmissions(prev => [...prev, newSub]);
  };

  const handleResetData = () => {
    if (window.confirm('Haluatko varmasti palauttaa mallipaperin oletustiedot ja esimerkkivastaukset?')) {
      resetAllData();
      setEvent(INITIAL_EVENT);
      setSubmissions(INITIAL_SUBMISSIONS);
    }
  };

  const assignedCount = event.slots.filter(s => s.assignedStudentId).length;

  return (
    <div className="app-root">
      <HeaderNav
        currentView={currentView}
        onViewChange={setCurrentView}
        submissionsCount={submissions.length}
        assignedCount={assignedCount}
        totalSlots={event.slots.length}
        onResetData={handleResetData}
      />

      <main>
        {currentView === 'creator' && (
          <ScheduleCreator
            event={event}
            onUpdateEvent={handleUpdateEvent}
            onOpenPreview={() => setCurrentView('parent')}
          />
        )}

        {currentView === 'parent' && (
          <ParentView
            event={event}
            onSubmit={handleNewSubmission}
            isPreview={true}
          />
        )}

        {currentView === 'matching' && (
          <MatchingView
            event={event}
            submissions={submissions}
            onEventUpdated={handleUpdateEvent}
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
