import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, FileText, Brain, ShieldCheck, BarChart2, Settings, Bot, Eye } from 'lucide-react';

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
    <div className="min-h-screen w-full bg-[#1A1F2E] text-[#F7F9FC] font-sans relative overflow-x-hidden">
      
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#242B3D_1px,transparent_1px),linear-gradient(to_bottom,#242B3D_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[600px] bg-[#2F6FED]/20 blur-[150px] rounded-full pointer-events-none mix-blend-screen"></div>
        <div className="absolute top-[40%] left-[-10%] w-[600px] h-[500px] bg-[#2FBF71]/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen"></div>
      </div>

      <nav className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
          <Zap className="w-8 h-8 text-[#2F6FED] drop-shadow-[0_0_15px_rgba(47,111,237,0.6)] group-hover:scale-110 transition-transform" />
          <span className="text-xl font-black text-[#F7F9FC] tracking-tight drop-shadow-sm">
            Resume<span className="text-[#94A3B8] font-medium hidden sm:inline">Intelligence</span>
          </span>
        </div>
        <div className="hidden md:flex gap-8 text-sm font-semibold text-[#94A3B8]">
          <a href="#workflow" className="hover:text-[#F7F9FC] transition-colors">Features</a>
          <a href="#workflow" className="hover:text-[#F7F9FC] transition-colors">Workflow</a>
          <a href="#capabilities" className="hover:text-[#F7F9FC] transition-colors">Security</a>
        </div>
      </nav>

      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-16 sm:pb-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        
        <div className="animate-in fade-in slide-in-from-left-8 duration-700 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2F6FED]/10 backdrop-blur-md border border-[#2F6FED]/30 text-[#2F6FED] text-[10px] font-black tracking-widest uppercase mb-6 sm:mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#2F6FED] animate-pulse"></span> Human-In-The-Loop AI Recruitment
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black text-[#F7F9FC] tracking-tight leading-[1.1] mb-6 drop-shadow-lg">
            Hire Using <br className="hidden sm:block" />
            <span className="text-[#2F6FED] drop-shadow-[0_0_20px_rgba(47,111,237,0.4)]">Context.</span> <br />
            Not Just Keywords.
          </h1>
          
          <p className="text-base sm:text-lg font-medium text-[#94A3B8] mb-8 sm:mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            An AI-assisted recruitment intelligence platform combining semantic NLP, fraud detection, explainable machine learning, and recruiter-centered workflow automation.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-12 sm:mb-16">
            <button 
              onClick={() => handleLogin('recruiter')}
              className="w-full sm:w-auto px-8 py-4 bg-[#2F6FED]/90 backdrop-blur-md hover:bg-[#2563EB] border border-white/10 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_30px_rgba(47,111,237,0.3)] active:scale-95 flex items-center justify-center gap-2 group tracking-wide"
            >
              ENTER HR PORTAL <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
            <button 
              onClick={() => handleLogin('candidate')}
              className="w-full sm:w-auto px-8 py-4 bg-[#242B3D]/50 backdrop-blur-md hover:bg-[#374151]/80 border border-white/10 text-[#F7F9FC] rounded-xl font-bold text-sm transition-all active:scale-95 flex items-center justify-center tracking-wide"
            >
              CANDIDATE PORTAL
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-white/10 pt-8 text-center sm:text-left">
            <div><h4 className="text-[#F7F9FC] font-bold text-base sm:text-lg drop-shadow-sm">Tri-Vector</h4><p className="text-xs text-[#94A3B8] mt-1">Semantic + Lexical + Skill</p></div>
            <div><h4 className="text-[#F7F9FC] font-bold text-base sm:text-lg drop-shadow-sm">XAI</h4><p className="text-xs text-[#94A3B8] mt-1">Explainable Decision Support</p></div>
            <div><h4 className="text-[#F7F9FC] font-bold text-base sm:text-lg drop-shadow-sm">HITL</h4><p className="text-xs text-[#94A3B8] mt-1">Human-in-the-Loop Triage</p></div>
          </div>
        </div>

        {/* 🔮 HEAVY GLASSMORPHISM DASHBOARD MOCKUP */}
        <div className="relative w-full max-w-md mx-auto aspect-square md:aspect-auto md:h-[550px] animate-in fade-in slide-in-from-right-8 duration-700 hidden lg:block">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] bg-[#242B3D]/30 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
            <div className="bg-[#1A1F2E]/40 backdrop-blur-md px-5 py-4 flex items-center gap-3 border-b border-white/5">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#E85D75] shadow-[0_0_8px_rgba(232,93,117,0.8)]"></div>
                <div className="w-3 h-3 rounded-full bg-[#F59E0B] shadow-[0_0_8px_rgba(245,158,11,0.8)]"></div>
                <div className="w-3 h-3 rounded-full bg-[#2FBF71] shadow-[0_0_8px_rgba(47,191,113,0.8)]"></div>
              </div>
              <div className="flex-1 text-center text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest drop-shadow-md">
                Recruiter Intelligence
              </div>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-[#F7F9FC] drop-shadow-sm">Senior Backend Engineer</h3>
                  <p className="text-xs font-bold text-[#94A3B8] mt-1 uppercase tracking-widest">Match Score: 84%</p>
                </div>
                <span className="px-3 py-1.5 bg-[#2FBF71]/10 backdrop-blur-md border border-[#2FBF71]/30 text-[#2FBF71] rounded-lg text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(47,191,113,0.2)]">
                  Shortlisted
                </span>
              </div>

              <div className="space-y-5 pt-4 border-t border-white/5">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#94A3B8] uppercase tracking-wider"><span>Skill Alignment</span><span className="text-[#2FBF71] drop-shadow-sm">88%</span></div>
                  <div className="w-full h-2.5 bg-[#1A1F2E]/50 rounded-full overflow-hidden shadow-inner border border-white/5">
                    <div className="w-[88%] h-full bg-[#2FBF71] rounded-full shadow-[0_0_10px_rgba(47,191,113,0.8)]"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#94A3B8] uppercase tracking-wider"><span>Contextual Match</span><span className="text-[#2F6FED] drop-shadow-sm">81%</span></div>
                  <div className="w-full h-2.5 bg-[#1A1F2E]/50 rounded-full overflow-hidden shadow-inner border border-white/5">
                    <div className="w-[81%] h-full bg-[#2F6FED] rounded-full shadow-[0_0_10px_rgba(47,111,237,0.8)]"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#94A3B8] uppercase tracking-wider"><span>Keyword Match</span><span className="text-[#F59E0B] drop-shadow-sm">73%</span></div>
                  <div className="w-full h-2.5 bg-[#1A1F2E]/50 rounded-full overflow-hidden shadow-inner border border-white/5">
                    <div className="w-[73%] h-full bg-[#F59E0B] rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)]"></div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-5 rounded-2xl bg-[#E85D75]/10 backdrop-blur-md border border-[#E85D75]/30 shadow-inner">
                <h4 className="text-xs font-black text-[#E85D75] mb-2 flex items-center gap-3 uppercase tracking-widest drop-shadow-sm">
                  <span className="w-2 h-2 bg-[#E85D75] rounded-full animate-pulse shadow-[0_0_10px_rgba(232,93,117,0.9)]"></span> Fraud Detected
                </h4>
                <p className="text-xs text-[#E85D75]/90 font-medium leading-relaxed">Abnormal keyword density detected with low contextual alignment. Flagged for review.</p>
              </div>

              <div className="mt-2 p-5 rounded-2xl bg-[#1A1F2E]/60 backdrop-blur-md border border-white/10 shadow-inner">
                <h4 className="text-xs font-black text-[#F7F9FC] mb-2 uppercase tracking-widest drop-shadow-sm">🧠 AI Summary</h4>
                <p className="text-xs text-[#94A3B8] font-medium leading-relaxed">Candidate demonstrates strong backend engineering alignment with relevant API development experience but lacks production Kubernetes exposure.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section id="workflow" className="relative z-10 w-full py-16 sm:py-24 border-t border-white/5 bg-[#1A1F2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#F7F9FC] mb-4 drop-shadow-sm">Recruitment Intelligence Workflow</h2>
            <p className="text-sm sm:text-base text-[#94A3B8] font-medium max-w-2xl mx-auto">Designed as a Human-in-the-Loop recruitment system where AI assists analysis while recruiters retain final decision authority.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-[#242B3D]/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/5 hover:border-[#2F6FED]/50 hover:bg-[#242B3D]/60 transition-all shadow-lg group">
              <div className="w-12 h-12 mb-6 bg-[#1A1F2E]/80 backdrop-blur-md border border-white/10 flex items-center justify-center rounded-xl text-2xl group-hover:scale-110 transition-transform shadow-inner"><FileText className="w-6 h-6 text-[#94A3B8]" /></div>
              <h3 className="text-sm font-black text-[#F7F9FC] mb-2 uppercase tracking-wider drop-shadow-sm">Document Ingestion</h3>
              <p className="text-xs text-[#94A3B8] font-medium leading-relaxed">Upload resumes, bulk ZIP files, or image-based job descriptions.</p>
            </div>
            <div className="bg-[#242B3D]/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/5 hover:border-[#2F6FED]/50 hover:bg-[#242B3D]/60 transition-all shadow-lg group">
              <div className="w-12 h-12 mb-6 bg-[#1A1F2E]/80 backdrop-blur-md border border-white/10 flex items-center justify-center rounded-xl text-2xl group-hover:scale-110 transition-transform shadow-inner"><Brain className="w-6 h-6 text-[#94A3B8]" /></div>
              <h3 className="text-sm font-black text-[#F7F9FC] mb-2 uppercase tracking-wider drop-shadow-sm">Hybrid NLP Analysis</h3>
              <p className="text-xs text-[#94A3B8] font-medium leading-relaxed">Semantic embeddings, lexical analysis, and skill extraction.</p>
            </div>
            <div className="bg-[#242B3D]/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/5 hover:border-[#2F6FED]/50 hover:bg-[#242B3D]/60 transition-all shadow-lg group">
              <div className="w-12 h-12 mb-6 bg-[#1A1F2E]/80 backdrop-blur-md border border-white/10 flex items-center justify-center rounded-xl text-2xl group-hover:scale-110 transition-transform shadow-inner"><ShieldCheck className="w-6 h-6 text-[#94A3B8]" /></div>
              <h3 className="text-sm font-black text-[#F7F9FC] mb-2 uppercase tracking-wider drop-shadow-sm">Fraud Detection</h3>
              <p className="text-xs text-[#94A3B8] font-medium leading-relaxed">Detect keyword stuffing and enable blind hiring workflows.</p>
            </div>
            <div className="bg-[#242B3D]/40 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/5 hover:border-[#2F6FED]/50 hover:bg-[#242B3D]/60 transition-all shadow-lg group">
              <div className="w-12 h-12 mb-6 bg-[#1A1F2E]/80 backdrop-blur-md border border-white/10 flex items-center justify-center rounded-xl text-2xl group-hover:scale-110 transition-transform shadow-inner"><BarChart2 className="w-6 h-6 text-[#94A3B8]" /></div>
              <h3 className="text-sm font-black text-[#F7F9FC] mb-2 uppercase tracking-wider drop-shadow-sm">Decision Support</h3>
              <p className="text-xs text-[#94A3B8] font-medium leading-relaxed">AI-assisted ranking with explainable recruiter insights.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="capabilities" className="relative z-10 w-full py-16 sm:py-24 bg-[#1A1F2E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#F7F9FC] mb-4 drop-shadow-sm">Core Capabilities</h2>
            <p className="text-sm sm:text-base text-[#94A3B8] font-medium max-w-2xl mx-auto">Built using local NLP pipelines, explainable ML, and generative AI.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-b from-[#242B3D]/60 to-[#1A1F2E]/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 hover:border-[#2F6FED]/30 hover:shadow-[0_0_30px_rgba(47,111,237,0.15)] transition-all shadow-lg">
              <div className="w-10 h-10 rounded-full bg-[#2F6FED]/20 backdrop-blur-md border border-[#2F6FED]/30 flex items-center justify-center text-[#2F6FED] mb-6 drop-shadow-md"><Settings className="w-5 h-5" /></div>
              <h3 className="text-lg font-black text-[#F7F9FC] mb-3 drop-shadow-sm">Hybrid ML Engine</h3>
              <p className="text-sm text-[#94A3B8] font-medium leading-relaxed">Combines semantic analysis, skill extraction, and lexical scoring through a Random Forest ensemble.</p>
            </div>
            <div className="bg-gradient-to-b from-[#242B3D]/60 to-[#1A1F2E]/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 hover:border-[#2F6FED]/30 hover:shadow-[0_0_30px_rgba(47,111,237,0.15)] transition-all shadow-lg">
              <div className="w-10 h-10 rounded-full bg-[#2F6FED]/20 backdrop-blur-md border border-[#2F6FED]/30 flex items-center justify-center text-[#2F6FED] mb-6 drop-shadow-md"><Bot className="w-5 h-5" /></div>
              <h3 className="text-lg font-black text-[#F7F9FC] mb-3 drop-shadow-sm">Recruiter Copilot</h3>
              <p className="text-sm text-[#94A3B8] font-medium leading-relaxed">Instantly query candidate profiles and exact experience using natural language.</p>
            </div>
            <div className="bg-gradient-to-b from-[#242B3D]/60 to-[#1A1F2E]/40 backdrop-blur-xl p-8 rounded-3xl border border-white/5 hover:border-[#2F6FED]/30 hover:shadow-[0_0_30px_rgba(47,111,237,0.15)] transition-all shadow-lg">
              <div className="w-10 h-10 rounded-full bg-[#2F6FED]/20 backdrop-blur-md border border-[#2F6FED]/30 flex items-center justify-center text-[#2F6FED] mb-6 drop-shadow-md"><Eye className="w-5 h-5" /></div>
              <h3 className="text-lg font-black text-[#F7F9FC] mb-3 drop-shadow-sm">Blind Hiring Mode</h3>
              <p className="text-sm text-[#94A3B8] font-medium leading-relaxed">Automatically removes personally identifiable information during recruiter screening.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 w-full border-t border-white/5 bg-[#1A1F2E]/80 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <div className="flex items-center gap-2">
             <Zap className="w-6 h-6 text-[#2F6FED] drop-shadow-sm" />
             <div>
               <h4 className="text-[#F7F9FC] font-black tracking-tight drop-shadow-sm">IntelligenceATS</h4>
               <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest mt-0.5">AI-Assisted Recruitment Intelligence Platform</p>
             </div>
          </div>
          <div className="text-[10px] text-[#94A3B8] uppercase tracking-widest font-bold">&copy; Ankith Binagekar</div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;