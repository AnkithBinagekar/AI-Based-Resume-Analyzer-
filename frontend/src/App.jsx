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

// --- GLASSMORPHISM NAVIGATION BAR ---
function NavigationBar() {
  const location = useLocation();
  const currentPath = location.pathname;
  const token = localStorage.getItem('access_token');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (currentPath === '/' || currentPath === '/login' || currentPath === '/signup') return null;

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  const linkStyle = (path) => {
    const isActive = currentPath === path;
    return `text-sm font-bold transition-all hover:text-[#2F6FED] ${isActive ? 'text-[#F7F9FC] border-b-2 border-[#2F6FED] pb-1' : 'text-[#94A3B8]'}`;
  };

  const mobileLinkStyle = (path) => {
    const isActive = currentPath === path;
    return `block w-full text-left px-4 py-3 text-sm font-bold rounded-xl transition-colors ${isActive ? 'bg-[#2F6FED]/10 text-[#2F6FED]' : 'text-[#94A3B8] hover:bg-[#242B3D]/50'}`;
  };

  return (
    <header className="bg-[#1A1F2E]/60 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-50 transition-colors duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <span className="text-2xl text-[#2F6FED] drop-shadow-sm group-hover:scale-110 transition-transform">⚡</span>
            <h1 className="text-xl font-black text-[#F7F9FC] tracking-tight hidden sm:block drop-shadow-sm">AI Resume Analyzer</h1>
            <h1 className="text-xl font-black text-[#F7F9FC] tracking-tight sm:hidden drop-shadow-sm">AI Analyzer</h1>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/candidate" className={linkStyle('/candidate')}>Candidate Portal</Link>
            
            {token && (
              <>
                <Link to="/jobs" className={linkStyle('/jobs')}>Job Board</Link>
                <Link to="/hr" className={linkStyle('/hr')}>HR Dashboard</Link>
                <button 
                  onClick={handleLogout} 
                  className="ml-4 px-5 py-2 text-sm font-bold text-[#F7F9FC] bg-[#242B3D]/50 hover:bg-[#E85D75]/20 hover:text-[#E85D75] border border-white/10 hover:border-[#E85D75]/50 rounded-xl transition-all active:scale-95 backdrop-blur-md"
                >
                  Logout
                </button>
              </>
            )}
          </nav>

          <button 
            className="md:hidden p-2 focus:outline-none text-[#94A3B8] hover:text-[#2F6FED] transition-colors"
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

      {isMobileMenuOpen && (
        <div className="md:hidden border-b px-4 pt-2 pb-6 space-y-2 shadow-2xl animate-in slide-in-from-top-2 bg-[#1A1F2E]/90 backdrop-blur-2xl border-white/5">
          <Link to="/candidate" onClick={() => setIsMobileMenuOpen(false)} className={mobileLinkStyle('/candidate')}>Candidate Portal</Link>
          
          {token && (
            <>
              <Link to="/jobs" onClick={() => setIsMobileMenuOpen(false)} className={mobileLinkStyle('/jobs')}>Job Board</Link>
              <Link to="/hr" onClick={() => setIsMobileMenuOpen(false)} className={mobileLinkStyle('/hr')}>HR Dashboard</Link>
              <div className="pt-2">
                <button onClick={handleLogout} className="w-full mt-2 px-4 py-3 text-sm font-bold text-white bg-[#E85D75]/80 hover:bg-[#E85D75] rounded-xl transition-all shadow-sm backdrop-blur-md border border-white/10">
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

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-[100dvh] font-sans text-[#F7F9FC] overflow-x-hidden bg-[#1A1F2E] selection:bg-[#2F6FED]/30 selection:text-[#2F6FED]">
        <NavigationBar />
        <main className="w-full">
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