import React from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  const handleLogin = (role) => {
    localStorage.setItem('userRole', role);
    if (role === 'recruiter') {
      navigate('/hr');
    } else {
      navigate('/candidate');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B1121] text-slate-300 font-sans selection:bg-blue-500/30 relative overflow-x-hidden">
      
      {/* --- BACKGROUND GRID & GLOW EFFECTS --- */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
        <div className="absolute top-[-20%] w-[1000px] h-[600px] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
      </div>

      {/* --- NAVBAR --- */}
      <nav className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            AI
          </div>
          <span className="text-lg sm:text-xl font-black text-white tracking-tight">
            Intelligence<span className="text-slate-400 font-medium hidden sm:inline">ATS</span>
          </span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-semibold text-slate-400">
          <a href="#workflow" className="hover:text-white transition-colors">Features</a>
          <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
          <a href="#capabilities" className="hover:text-white transition-colors">Security</a>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        
        {/* LEFT COLUMN: Copy & CTA */}
        <div className="animate-in fade-in slide-in-from-left-8 duration-700 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black tracking-widest uppercase mb-6 sm:mb-8 shadow-sm">
            Human-In-The-Loop AI Recruitment
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-white tracking-tight leading-[1.1] mb-6">
            Hire Using <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Context.</span> <br />
            Not Just Keywords.
          </h1>
          
          <p className="text-base sm:text-lg font-medium text-slate-400 mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            An AI-assisted recruitment intelligence platform combining semantic NLP, fraud detection, explainable machine learning, and recruiter-centered workflow automation.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12 sm:mb-16">
            <button 
              onClick={() => handleLogin('recruiter')}
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-95 flex items-center justify-center gap-2 group"
            >
              Enter HR Portal <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <button 
              onClick={() => handleLogin('candidate')}
              className="w-full sm:w-auto px-8 py-4 bg-slate-900/50 hover:bg-slate-800 border border-slate-700 text-white rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center"
            >
              Candidate Portal
            </button>
          </div>

          {/* Micro-Features Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-slate-800 pt-8 text-center sm:text-left">
            <div>
              <h4 className="text-white font-bold text-base sm:text-lg">Tri-Vector</h4>
              <p className="text-xs text-slate-500 mt-1">Semantic + Lexical + Skill</p>
            </div>
            <div>
              <h4 className="text-white font-bold text-base sm:text-lg">XAI</h4>
              <p className="text-xs text-slate-500 mt-1">Explainable Decision Support</p>
            </div>
            <div>
              <h4 className="text-white font-bold text-base sm:text-lg">HITL</h4>
              <p className="text-xs text-slate-500 mt-1">Human-in-the-Loop Triage</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CSS-Built Dashboard Mockup */}
        <div className="relative w-full max-w-md mx-auto aspect-square md:aspect-auto md:h-[550px] animate-in fade-in slide-in-from-right-8 duration-700 hidden lg:block">
          <div className="absolute inset-0 bg-blue-500/5 blur-[80px] rounded-full"></div>
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] bg-[#0F172A] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl flex flex-col">
            <div className="bg-[#1E293B]/50 px-4 py-3 flex items-center gap-2 border-b border-slate-800">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
              </div>
              <div className="flex-1 text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                Recruiter Intelligence Dashboard
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg xl:text-xl font-black text-white">Senior Backend Engineer</h3>
                  <p className="text-xs text-slate-400 mt-1">Contextual Match: 84%</p>
                </div>
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[10px] xl:text-xs font-bold shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                  Shortlisted
                </span>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800/50">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>Technical Skill Alignment</span>
                    <span className="text-slate-300">88%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="w-[88%] h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.8)]"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>Contextual Experience</span>
                    <span className="text-slate-300">81%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="w-[81%] h-full bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.8)]"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-slate-400">
                    <span>Exact Keyword Match</span>
                    <span className="text-slate-300">73%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="w-[73%] h-full bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-xl bg-red-950/30 border border-red-900/50">
                <h4 className="text-xs font-bold text-red-400 mb-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                  Potential ATS Manipulation Detected
                </h4>
                <p className="text-[10px] text-red-400/80 leading-relaxed">
                  Abnormal keyword density detected with low contextual alignment. Resume flagged for manual review.
                </p>
              </div>

              <div className="mt-2 p-4 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <h4 className="text-xs font-bold text-white mb-1">AI Decision Summary</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Candidate demonstrates strong backend engineering alignment with relevant API development experience but lacks production Kubernetes exposure.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- SECTION 1: WORKFLOW --- */}
      <section id="workflow" className="relative z-10 w-full py-16 sm:py-24 border-t border-slate-800 bg-[#070B14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-4">Recruitment Intelligence Workflow</h2>
            <p className="text-sm sm:text-base text-slate-400 font-medium max-w-2xl mx-auto">
              Designed as a Human-in-the-Loop recruitment system where AI assists analysis while recruiters retain final decision authority.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-[#0F172A] p-6 sm:p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 mb-4 sm:mb-6 bg-slate-800 flex items-center justify-center rounded-lg text-xl">📄</div>
              <h3 className="text-sm font-black text-white mb-2">Document Ingestion</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Upload resumes, bulk ZIP files, or image-based job descriptions.</p>
            </div>
            <div className="bg-[#0F172A] p-6 sm:p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 mb-4 sm:mb-6 bg-slate-800 flex items-center justify-center rounded-lg text-xl">🧠</div>
              <h3 className="text-sm font-black text-white mb-2">Hybrid NLP Analysis</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Semantic embeddings, lexical analysis, and skill extraction.</p>
            </div>
            <div className="bg-[#0F172A] p-6 sm:p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 mb-4 sm:mb-6 bg-slate-800 flex items-center justify-center rounded-lg text-xl">🛡️</div>
              <h3 className="text-sm font-black text-white mb-2">Fraud & Bias Detection</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Detect keyword stuffing and enable blind hiring workflows.</p>
            </div>
            <div className="bg-[#0F172A] p-6 sm:p-8 rounded-2xl border border-slate-800 hover:border-slate-700 transition-colors">
              <div className="w-10 h-10 mb-4 sm:mb-6 bg-slate-800 flex items-center justify-center rounded-lg text-xl">📊</div>
              <h3 className="text-sm font-black text-white mb-2">Recruiter Decision Support</h3>
              <p className="text-xs text-slate-500 leading-relaxed">AI-assisted ranking with explainable recruiter insights.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION 2: CAPABILITIES --- */}
      <section id="capabilities" className="relative z-10 w-full py-16 sm:py-24 bg-[#0B1121]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-4">Core Platform Capabilities</h2>
            <p className="text-sm sm:text-base text-slate-400 font-medium max-w-2xl mx-auto">
              Built using local NLP pipelines, explainable machine learning, and controlled generative AI assistance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-gradient-to-b from-[#0F172A] to-[#070B14] p-6 sm:p-8 rounded-2xl border border-slate-800">
              <h3 className="text-base sm:text-lg font-black text-white mb-3">Hybrid ML Engine</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">Combines semantic analysis, skill extraction, and lexical scoring through a Random Forest ensemble.</p>
            </div>
            <div className="bg-gradient-to-b from-[#0F172A] to-[#070B14] p-6 sm:p-8 rounded-2xl border border-slate-800">
              <h3 className="text-base sm:text-lg font-black text-white mb-3">Recruiter Copilot</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">Retrieval-Augmented candidate querying using vector search and grounded AI responses.</p>
            </div>
            <div className="bg-gradient-to-b from-[#0F172A] to-[#070B14] p-6 sm:p-8 rounded-2xl border border-slate-800">
              <h3 className="text-base sm:text-lg font-black text-white mb-3">Blind Hiring Mode</h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">Automatically removes personally identifiable information during recruiter screening.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 w-full border-t border-slate-800 bg-[#070B14] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div>
            <h4 className="text-white font-black">IntelligenceATS</h4>
            <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-widest mt-1">AI-Assisted Recruitment Intelligence Platform</p>
          </div>
          <div className="text-[9px] sm:text-[10px] text-slate-600 uppercase tracking-widest font-bold">
            &copy; Ankith Binagekar
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;