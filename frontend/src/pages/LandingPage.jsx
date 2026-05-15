import React from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col relative bg-slate-50 overflow-hidden">
      
      {/* Modern SaaS Background Pattern (Subtle dots) */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-slate-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>

      {/* Navigation Bar */}
      <nav className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg">
              AI
            </div>
            <span className="font-extrabold text-slate-800 tracking-tight text-xl">
              Resume Analyzer
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <button 
              onClick={() => navigate('/hr')} 
              className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Recruiter Login
            </button>
            <button 
              onClick={() => navigate('/candidate')} 
              className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-sm"
            >
              Upload Resume
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center pt-24 pb-20">
        
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto px-6 mb-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-bold tracking-wide mb-8 border border-blue-100 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Next-Generation ATS Intelligence
          </div>
          
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 leading-[1.1]">
            Hire the perfect fit. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">
              Without the guesswork.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-2xl mx-auto font-medium">
            Go beyond keyword matching. Our AI-Based Resume Analyzer understands deep semantic context, uncovers hidden skill overlap, and provides recruiters with data-driven hiring confidence.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => navigate('/hr')} 
              className="px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              Go to HR Dashboard <span className="text-xl">→</span>
            </button>
            <button 
              onClick={() => navigate('/candidate')} 
              className="px-8 py-4 text-base font-bold text-slate-700 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all active:scale-95 shadow-sm"
            >
              Candidate Portal
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl w-full px-6">
          
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
              📊
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-3">Explainable Match Scoring</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              See exactly why a candidate matched. Our engine breaks down semantic distance, lexical similarity, and verified skill density into one clear radar chart.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
              🤖
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-3">Conversational Copilot</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              Stop reading 5-page CVs. Chat directly with the resume using our secure memory engine to instantly verify past projects and responsibilities.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform">
              🛡️
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-3">Enterprise Security & Trust</h3>
            <p className="text-slate-500 leading-relaxed font-medium">
              Enforce fair hiring with one-click Blind Mode to scrub personal identifiers, while automatically detecting invisible fonts and formatting fraud.
            </p>
          </div>

        </div>
      </main>

      {/* Simple Footer */}
      <footer className="w-full border-t border-slate-200 bg-white py-8 text-center">
        <p className="text-slate-400 font-medium text-sm">
          © {new Date().getFullYear()} AI Based Resume Analyzer. Enterprise ATS Intelligence.
        </p>
      </footer>

    </div>
  );
}

export default LandingPage;