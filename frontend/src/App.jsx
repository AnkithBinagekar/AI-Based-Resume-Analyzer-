import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import CandidateDashboard from './pages/CandidateDashboard';
import HrDashboard from './pages/HrDashboard';
import JobBoard from './pages/JobBoard';
import Login from './pages/Login';
import Signup from './pages/Signup';

// --- AUTH GUARD ---
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

// --- RESPONSIVE NAVIGATION BAR ---
function NavigationBar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const token = localStorage.getItem('access_token');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile state

  if (currentPath === '/' || currentPath === '/login' || currentPath === '/signup') return null;

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  const linkStyle = (path) => 
    `text-sm font-bold transition-all hover:text-blue-600 ${currentPath === path ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-500'}`;

  const mobileLinkStyle = (path) =>
    `block w-full text-left px-4 py-3 text-sm font-bold rounded-xl transition-colors ${currentPath === path ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`;

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <h1 className="text-xl font-black text-slate-800 tracking-tight hidden sm:block">AI Resume Analyzer</h1>
            <h1 className="text-xl font-black text-slate-800 tracking-tight sm:hidden">AI Analyzer</h1>
          </div>
          
          {/* Desktop Navigation (Hidden on Mobile) */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/candidate" className={linkStyle('/candidate')}>Candidate Portal</Link>
            
            {token && (
              <>
                <Link to="/jobs" className={linkStyle('/jobs')}>Job Board</Link>
                <Link to="/hr" className={linkStyle('/hr')}>HR Dashboard</Link>
                <button onClick={handleLogout} className="ml-4 px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-md active:scale-95">
                  Logout
                </button>
              </>
            )}
          </nav>

          {/* Mobile Hamburger Button (Hidden on Desktop) */}
          <button 
            className="md:hidden p-2 text-slate-600 hover:text-blue-600 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 pt-2 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top-2">
          <Link to="/candidate" onClick={() => setIsMobileMenuOpen(false)} className={mobileLinkStyle('/candidate')}>Candidate Portal</Link>
          
          {token && (
            <>
              <Link to="/jobs" onClick={() => setIsMobileMenuOpen(false)} className={mobileLinkStyle('/jobs')}>Job Board</Link>
              <Link to="/hr" onClick={() => setIsMobileMenuOpen(false)} className={mobileLinkStyle('/hr')}>HR Dashboard</Link>
              <div className="pt-2">
                <button onClick={handleLogout} className="w-full mt-2 px-4 py-3 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all shadow-sm">
                  Secure Logout
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}

// --- MAIN ROUTER ---
function App() {
  return (
    <BrowserRouter>
      {/* Make sure the main background fills the screen and prevents horizontal scrolling on phones */}
      <div className="min-h-[100dvh] bg-slate-50 font-sans text-slate-900 overflow-x-hidden selection:bg-blue-200">
        <NavigationBar />
        
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/candidate" element={<CandidateDashboard />} />
            <Route path="/hr" element={ <ProtectedRoute> <HrDashboard /> </ProtectedRoute> } />
            <Route path="/jobs" element={ <ProtectedRoute> <JobBoard /> </ProtectedRoute> } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;