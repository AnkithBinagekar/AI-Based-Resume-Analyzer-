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

// --- DYNAMIC RESPONSIVE NAVIGATION BAR ---
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

  // 🛡️ THE FIX: The Navbar is now dark across all main application routes!
  const isDark = ['/hr', '/candidate', '/jobs'].includes(currentPath);

  // --- Dynamic Tailwind Classes ---
  const headerBg = isDark ? 'bg-[#0B1121]/90 border-slate-800' : 'bg-white/80 border-slate-200';
  const logoColor = isDark ? 'text-white' : 'text-slate-800';
  const menuIconColor = isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-blue-600';
  
  const linkStyle = (path) => {
    const isActive = currentPath === path;
    if (isDark) {
      return `text-sm font-bold transition-all hover:text-white ${isActive ? 'text-white border-b-2 border-blue-500 pb-1' : 'text-slate-400'}`;
    }
    return `text-sm font-bold transition-all hover:text-blue-600 ${isActive ? 'text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-500'}`;
  };

  const mobileMenuBg = isDark ? 'bg-[#0F172A] border-slate-800' : 'bg-white border-slate-200';
  const mobileLinkStyle = (path) => {
    const isActive = currentPath === path;
    if (isDark) {
      return `block w-full text-left px-4 py-3 text-sm font-bold rounded-xl transition-colors ${isActive ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:bg-slate-800'}`;
    }
    return `block w-full text-left px-4 py-3 text-sm font-bold rounded-xl transition-colors ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`;
  };

  const logoutBtnStyle = isDark 
    ? "ml-4 px-5 py-2 text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-xl transition-all active:scale-95"
    : "ml-4 px-5 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-md active:scale-95";

  return (
    <header className={`${headerBg} backdrop-blur-md border-b sticky top-0 z-50 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group cursor-pointer">
            <span className="text-2xl drop-shadow-md group-hover:scale-110 transition-transform">⚡</span>
            <h1 className={`text-xl font-black tracking-tight hidden sm:block transition-colors ${logoColor}`}>AI Resume Analyzer</h1>
            <h1 className={`text-xl font-black tracking-tight sm:hidden transition-colors ${logoColor}`}>AI Analyzer</h1>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/candidate" className={linkStyle('/candidate')}>Candidate Portal</Link>
            
            {token && (
              <>
                <Link to="/jobs" className={linkStyle('/jobs')}>Job Board</Link>
                <Link to="/hr" className={linkStyle('/hr')}>HR Dashboard</Link>
                <button onClick={handleLogout} className={logoutBtnStyle}>
                  Logout
                </button>
              </>
            )}
          </nav>

          {/* Mobile Hamburger Button */}
          <button 
            className={`md:hidden p-2 focus:outline-none transition-colors ${menuIconColor}`}
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
        <div className={`md:hidden border-b px-4 pt-2 pb-6 space-y-2 shadow-xl animate-in slide-in-from-top-2 ${mobileMenuBg}`}>
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
      <div className="min-h-[100dvh] font-sans text-slate-900 overflow-x-hidden selection:bg-blue-200">
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