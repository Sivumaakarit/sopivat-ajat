import React from 'react';
import type { ViewMode } from '../types';
import { Calendar, CheckSquare, Puzzle, Printer, Globe, RotateCcw } from 'lucide-react';

interface HeaderNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  submissionsCount: number;
  assignedCount: number;
  totalSlots: number;
  onResetData: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentView,
  onViewChange,
  submissionsCount,
  assignedCount,
  onResetData,
}) => {
  return (
    <header className="app-header no-print">
      <div className="header-container">
        <div className="brand-badge">
          <div className="brand-icon">
            <Calendar size={20} />
          </div>
          <span>Sopivat Ajat</span>
        </div>

        {/* View switcher tabs */}
        <nav className="view-switcher" aria-label="Näkymän valinta">
          <button
            className={`view-btn ${currentView === 'creator' ? 'active' : ''}`}
            onClick={() => onViewChange('creator')}
            title="Luo ja muokkaa aikoja"
          >
            <Calendar size={16} />
            <span>Aikojen hallinta</span>
          </button>

          <button
            className={`view-btn ${currentView === 'parent' ? 'active' : ''}`}
            onClick={() => onViewChange('parent')}
            title="Kokeile huoltajan vastauslomaketta"
          >
            <CheckSquare size={16} />
            <span>Huoltajan lomake</span>
          </button>

          <button
            className={`view-btn ${currentView === 'matching' ? 'active' : ''}`}
            onClick={() => onViewChange('matching')}
            title="Sovita vastaukset aikoihin ilman tuplabuukkauksia"
          >
            <Puzzle size={16} />
            <span>Aikasovitus</span>
            {submissionsCount > 0 && (
              <span style={{
                background: assignedCount === submissionsCount ? '#16a34a' : '#2563eb',
                color: '#fff',
                fontSize: '0.72rem',
                padding: '2px 6px',
                borderRadius: '10px',
                marginLeft: '2px'
              }}>
                {assignedCount}/{submissionsCount}
              </span>
            )}
          </button>

          <button
            className={`view-btn ${currentView === 'print' ? 'active' : ''}`}
            onClick={() => onViewChange('print')}
            title="Tulosta A4-aikataulu oveen tai kansioon"
          >
            <Printer size={16} />
            <span>A4-Tuloste</span>
          </button>

          <button
            className={`view-btn ${currentView === 'public' ? 'active' : ''}`}
            onClick={() => onViewChange('public')}
            title="Huoltajille jaettava katselulinkki"
          >
            <Globe size={16} />
            <span>Julkinen linkki</span>
          </button>
        </nav>

        {/* Demo reset button */}
        <div>
          <button
            className="btn-secondary"
            onClick={onResetData}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            title="Palauta oletustiedot (mallipaperin ajat ja esimerkkivastaukset)"
          >
            <RotateCcw size={14} />
            <span>Palauta malli</span>
          </button>
        </div>
      </div>
    </header>
  );
};
