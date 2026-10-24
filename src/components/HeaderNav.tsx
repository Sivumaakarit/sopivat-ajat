import React, { useState, useEffect } from 'react';
import type { ViewMode } from '../types';
import { Calendar, CheckSquare, Puzzle, Printer, Globe, RotateCcw, Menu, X } from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile drawer on Escape key or window resize to desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleNavClick = (view: ViewMode) => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="app-header no-print">
      <div className="header-container">
        {/* Brand */}
        <div className="brand-badge" onClick={() => handleNavClick('creator')} style={{ cursor: 'pointer' }}>
          <img src="/logo.svg" alt="Sopivat ajat" style={{ width: '30px', height: '30px', borderRadius: '7px' }} />
          <span>Sopivat ajat</span>
        </div>

        {/* Desktop View Switcher */}
        <nav className="view-switcher desktop-nav" aria-label="Näkymän valinta">
          <button
            type="button"
            className={`view-btn ${currentView === 'creator' ? 'active' : ''}`}
            onClick={() => handleNavClick('creator')}
            title="Luo ja muokkaa aikoja"
          >
            <Calendar size={16} />
            <span>Aikojen hallinta</span>
          </button>

          <button
            type="button"
            className={`view-btn ${currentView === 'parent' ? 'active' : ''}`}
            onClick={() => handleNavClick('parent')}
            title="Kokeile huoltajan vastauslomaketta"
          >
            <CheckSquare size={16} />
            <span>Huoltajan lomake</span>
          </button>

          <button
            type="button"
            className={`view-btn ${currentView === 'matching' ? 'active' : ''}`}
            onClick={() => handleNavClick('matching')}
            title="Sovita vastaukset aikoihin ilman tuplabuukkauksia"
          >
            <Puzzle size={16} />
            <span>Aikasovitus</span>
            {submissionsCount > 0 && (
              <span className="nav-badge" style={{
                background: assignedCount === submissionsCount ? '#16a34a' : '#2563eb',
              }}>
                {assignedCount}/{submissionsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`view-btn ${currentView === 'print' ? 'active' : ''}`}
            onClick={() => handleNavClick('print')}
            title="Tulosta A4-aikataulu oveen tai kansioon"
          >
            <Printer size={16} />
            <span>A4-tuloste</span>
          </button>

          <button
            type="button"
            className={`view-btn ${currentView === 'public' ? 'active' : ''}`}
            onClick={() => handleNavClick('public')}
            title="Huoltajille jaettava katselulinkki"
          >
            <Globe size={16} />
            <span>Julkinen linkki</span>
          </button>
        </nav>

        {/* Desktop Reset Action */}
        <div className="desktop-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onResetData}
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
            title="Tyhjennä kaikki tiedot ja aloita puhtaalta pöydältä"
          >
            <RotateCcw size={14} />
            <span>Aloita alusta</span>
          </button>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          type="button"
          className="hamburger-btn mobile-only"
          onClick={() => setMobileMenuOpen(prev => !prev)}
          aria-label={mobileMenuOpen ? 'Sulje valikko' : 'Avaa valikko'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Navigation Drawer & Backdrop */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobile-menu-backdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <nav className="mobile-menu-drawer" aria-label="Mobiilivalikko">
            <div className="mobile-menu-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="brand-icon" style={{ padding: '0.3rem' }}>
                  <Calendar size={16} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>Valikko</span>
              </div>
              <button
                type="button"
                className="mobile-menu-close"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Sulje valikko"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mobile-nav-links">
              <button
                type="button"
                className={`mobile-nav-item ${currentView === 'creator' ? 'active' : ''}`}
                onClick={() => handleNavClick('creator')}
              >
                <Calendar size={18} />
                <span>Aikojen hallinta</span>
              </button>

              <button
                type="button"
                className={`mobile-nav-item ${currentView === 'parent' ? 'active' : ''}`}
                onClick={() => handleNavClick('parent')}
              >
                <CheckSquare size={18} />
                <span>Huoltajan lomake</span>
              </button>

              <button
                type="button"
                className={`mobile-nav-item ${currentView === 'matching' ? 'active' : ''}`}
                onClick={() => handleNavClick('matching')}
              >
                <Puzzle size={18} />
                <span style={{ flex: 1 }}>Aikasovitus</span>
                {submissionsCount > 0 && (
                  <span className="nav-badge" style={{
                    background: assignedCount === submissionsCount ? '#16a34a' : '#2563eb',
                  }}>
                    {assignedCount}/{submissionsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                className={`mobile-nav-item ${currentView === 'print' ? 'active' : ''}`}
                onClick={() => handleNavClick('print')}
              >
                <Printer size={18} />
                <span>A4-tuloste</span>
              </button>

              <button
                type="button"
                className={`mobile-nav-item ${currentView === 'public' ? 'active' : ''}`}
                onClick={() => handleNavClick('public')}
              >
                <Globe size={18} />
                <span>Julkinen linkki</span>
              </button>
            </div>

            <div className="mobile-menu-footer">
              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.88rem' }}
                onClick={() => {
                  setMobileMenuOpen(false);
                  onResetData();
                }}
                title="Tyhjennä kaikki tiedot ja aloita alusta"
              >
                <RotateCcw size={15} />
                <span>Aloita alusta (Tyhjennä)</span>
              </button>
            </div>
          </nav>
        </>
      )}
    </header>
  );
};
