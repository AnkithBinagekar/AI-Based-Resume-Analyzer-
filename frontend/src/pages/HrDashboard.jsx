import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import XAIDial from '../components/XAIDial';
import ReactMarkdown from 'react-markdown';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function HrDashboard() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('board'); 
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  // Chatbot State
  const [globalChatOpen, setGlobalChatOpen] = useState(false);
  const [globalChatHistory, setGlobalChatHistory] = useState([]);
  const [globalChatInput, setGlobalChatInput] = useState('');
  const [globalChatLoading, setGlobalChatLoading] = useState(false);
  
  // Job Selection State
  const [dbJobs, setDbJobs] = useState([]);
  const [chatJobId, setChatJobId] = useState(''); 
  
  const [recruiterNote, setRecruiterNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchCandidates();
    fetchJobs();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/candidates`);
      const initializedCandidates = response.data.data.map(c => {
        let aiStatus = 'archived';
        if (c.final_score >= 75) aiStatus = 'shortlisted';
        else if (c.final_score >= 50) aiStatus = 'review';
        return {
          ...c,
          pipeline_status: c.pipeline_status || aiStatus,
          is_human_overridden: false,
          recruiter_notes: c.recruiter_notes || ''
        };
      });
      setCandidates(initializedCandidates);
    } catch (err) {
      console.error("Failed to fetch candidates", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jobs`);
      setDbJobs(response.data.data);
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    }
  };

  const generateAnalytics = () => {
    if (candidates.length === 0) return { avgMatch: 0, fraudCount: 0, topSkill: 'None' };
    const avgMatch = (candidates.reduce((sum, c) => sum + c.final_score, 0) / candidates.length).toFixed(1);
    const fraudCount = candidates.filter(c => c.filename.includes('[FRAUD]') || c.lexical_score > (c.semantic_score + 0.3)).length;
    const allMissingSkills = candidates.flatMap(c => c.missing_skills ? c.missing_skills.split(',').map(s => s.trim()) : []);
    const skillFrequencies = allMissingSkills.reduce((acc, skill) => {
      if (skill) acc[skill] = (acc[skill] || 0) + 1;
      return acc;
    }, {});
    
    let topSkill = 'None';
    let maxCount = 0;
    for (const [skill, count] of Object.entries(skillFrequencies)) {
      if (count > maxCount) { maxCount = count; topSkill = skill; }
    }
    return { avgMatch, fraudCount, topSkill };
  };

  const { avgMatch, fraudCount, topSkill } = generateAnalytics();

  const handleDragStart = (e, candidateId) => { e.dataTransfer.setData('candidateId', candidateId); };
  const handleDragOver = (e) => { e.preventDefault(); };
  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const candidateId = Number(e.dataTransfer.getData('candidateId'));
    setCandidates(prev => prev.map(c => {
      if (c.id === candidateId && c.pipeline_status !== newStatus) {
        return { ...c, pipeline_status: newStatus, is_human_overridden: true };
      }
      return c;
    }));
  };

  const openDeepDive = (candidate) => {
    setSelectedCandidate(candidate);
    setRecruiterNote(candidate.recruiter_notes || '');
  };

  const handleSaveNote = () => {
    setSavingNote(true);
    setTimeout(() => {
      setCandidates(prev => prev.map(c => 
        c.id === selectedCandidate.id ? { ...c, recruiter_notes: recruiterNote } : c
      ));
      setSavingNote(false);
    }, 600);
  };

  const handleGlobalChat = async (e) => {
    e.preventDefault();
    if (!globalChatInput.trim()) return;

    const newQuestion = globalChatInput;
    setGlobalChatHistory(prev => [...prev, { role: 'user', content: newQuestion }]);
    setGlobalChatInput('');
    setGlobalChatLoading(true);

    const formData = new FormData();
    formData.append('question', newQuestion);
    if (chatJobId) formData.append('job_id', chatJobId);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/global-chat`, formData);
      const aiResponse = response.data?.answer || "Sorry, I received an empty response from the database.";
      setGlobalChatHistory(prev => [...prev, { role: 'ai', content: String(aiResponse) }]);
    } catch (err) {
      setGlobalChatHistory(prev => [...prev, { role: 'ai', content: "⚠️ Failed to reach AI backend." }]);
    } finally {
      setGlobalChatLoading(false);
    }
  };

  const topMatches = candidates.filter(c => c.pipeline_status === 'shortlisted');
  const reviewNeeded = candidates.filter(c => c.pipeline_status === 'review');
  const archived = candidates.filter(c => c.pipeline_status === 'archived');

  const getScoreBadge = (score) => {
    if (score >= 75) return <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-black shadow-[0_0_10px_rgba(16,185,129,0.1)]">{score.toFixed(1)}%</span>;
    if (score >= 50) return <span className="px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-black shadow-[0_0_10px_rgba(245,158,11,0.1)]">{score.toFixed(1)}%</span>;
    return <span className="px-3 py-1 bg-slate-800 text-slate-400 border border-slate-700 rounded-full text-xs font-black">{score.toFixed(1)}%</span>;
  };

  const generateXAIReasons = (candidate) => {
    if (!candidate) return [];
    const reasons = [];
    const semantic = parseFloat(candidate.semantic_score);
    const lexical = parseFloat(candidate.lexical_score);
    const skills = parseFloat(candidate.skill_overlap_score);

    if (lexical > (semantic + 0.3)) reasons.push({ type: 'danger', text: "Lexical Anomaly: Exact keyword match is unusually high compared to actual contextual experience. Potential Keyword Stuffing." });
    else if (lexical < 0.2 && semantic > 0.5) reasons.push({ type: 'positive', text: "Excellent vocabulary variance. Candidate explains concepts well without blindly copying the Job Description." });

    if (skills >= 0.8) reasons.push({ type: 'positive', text: "Candidate possesses the vast majority of required technical tools." });
    else if (skills < 0.4) reasons.push({ type: 'negative', text: "Severe skill gap detected. Missing core technical requirements." });

    if (semantic >= 0.6) reasons.push({ type: 'positive', text: "High semantic alignment. Past experience contextually matches the job role." });
    else if (semantic < 0.3 && skills > 0.5) reasons.push({ type: 'warning', text: "Domain Mismatch Risk: Has the technical skills, but applied them in a different context." });

    return reasons;
  };

  const CandidateCard = ({ candidate }) => (
    <div 
      draggable 
      onDragStart={(e) => handleDragStart(e, candidate.id)}
      onClick={() => openDeepDive(candidate)} 
      className={`bg-[#1E293B] p-5 rounded-2xl shadow-lg border hover:-translate-y-1 transition-all duration-300 cursor-grab active:cursor-grabbing relative overflow-hidden group ${candidate.is_human_overridden ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-700 hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(37,99,235,0.15)]'}`}
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 z-0 group-hover:scale-125 transition-transform duration-500"></div>
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner border ${candidate.filename.includes('🔒') ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
            {candidate.filename.includes('🔒') ? '🛡️' : '📄'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-white truncate" title={candidate.filename}>{candidate.filename.replace('🔒 Anonymous_Candidate_', 'Candidate_')}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Job #{candidate.job_id}</p>
              {candidate.is_human_overridden && <span className="text-[9px] uppercase font-black tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-sm">✋ Override</span>}
            </div>
          </div>
        </div>
        {getScoreBadge(candidate.final_score)}
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-2 mb-2">
        <div className="bg-[#0F172A] p-2 rounded-lg border border-slate-800">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Experience</p>
          <p className="text-xs font-black text-slate-300">{candidate.total_yoe || 0} Yrs</p>
        </div>
        <div className="bg-[#0F172A] p-2 rounded-lg border border-slate-800">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Education</p>
          <p className="text-xs font-black text-slate-300 truncate" title={candidate.highest_education}>{candidate.highest_education || 'Unknown'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B1121] text-slate-300 pt-6 pb-20 relative overflow-x-hidden font-sans selection:bg-blue-500/30">
      
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black tracking-widest uppercase mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Human-in-the-Loop Pipeline
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight">Recruiter Intelligence</h2>
            <p className="text-slate-400 font-medium mt-2 max-w-xl">AI automates the triage. Humans retain the executive override.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-[#0F172A] p-1.5 rounded-xl border border-slate-800 shadow-lg">
            <button onClick={() => setViewMode('board')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'board' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>Kanban</button>
            <button onClick={() => setViewMode('list')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}>List</button>
          </div>
        </div>

        {!loading && candidates.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-5 relative overflow-hidden">
              <div className="w-14 h-14 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(37,99,235,0.15)] relative z-10">👥</div>
              <div className="relative z-10"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Total Scans</p><p className="text-3xl font-black text-white">{candidates.length}</p></div>
            </div>
            
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-5 relative overflow-hidden">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(16,185,129,0.15)] relative z-10">📊</div>
              <div className="relative z-10"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Avg Match</p><p className="text-3xl font-black text-white">{avgMatch}%</p></div>
            </div>
            
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-bl-full -mr-4 -mt-4 z-0"></div>
              <div className="w-14 h-14 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(239,68,68,0.15)] relative z-10 animate-pulse">🚨</div>
              <div className="relative z-10"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Fraud Alerts</p><p className="text-3xl font-black text-white">{fraudCount}</p></div>
            </div>
            
            <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-6 rounded-2xl border border-slate-800 shadow-xl flex items-center gap-5 relative overflow-hidden">
              <div className="w-14 h-14 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(168,85,247,0.15)] relative z-10">🎯</div>
              <div className="overflow-hidden relative z-10"><p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Top Missing Skill</p><p className="text-lg font-black text-white truncate" title={topSkill}>{topSkill}</p></div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
             <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6"></div>
             <p className="text-slate-400 font-bold tracking-widest uppercase text-xs animate-pulse">Syncing Enterprise Database...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-[#0F172A]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 p-24 text-center animate-in fade-in zoom-in-95">
            <div className="text-6xl mb-8">📭</div>
            <h3 className="text-3xl font-black text-white mb-3">No Candidates Found</h3>
            <p className="text-slate-400 mb-10 font-medium text-lg">Your ATS database is currently empty.</p>
            <button onClick={() => navigate('/candidate')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all active:scale-95">Go to Scanner Portal</button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700">
            {viewMode === 'board' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                
                {/* Shortlisted Column */}
                <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'shortlisted')} className="bg-[#0F172A]/60 backdrop-blur-xl rounded-3xl p-5 border border-slate-800 shadow-2xl min-h-[600px]">
                  <div className="flex items-center justify-between mb-6 px-2 border-b border-slate-800 pb-4">
                    <h3 className="font-black text-white flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span> 
                      Shortlisted
                    </h3>
                    <span className="bg-slate-800 text-slate-300 text-xs font-black px-3 py-1 rounded-full border border-slate-700">{topMatches.length}</span>
                  </div>
                  <div className="space-y-4">{topMatches.map(c => <CandidateCard key={c.id} candidate={c} />)}</div>
                </div>

                {/* Review Needed Column */}
                <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'review')} className="bg-[#0F172A]/60 backdrop-blur-xl rounded-3xl p-5 border border-slate-800 shadow-2xl min-h-[600px]">
                  <div className="flex items-center justify-between mb-6 px-2 border-b border-slate-800 pb-4">
                    <h3 className="font-black text-white flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]"></span> 
                      Review Needed
                    </h3>
                    <span className="bg-slate-800 text-slate-300 text-xs font-black px-3 py-1 rounded-full border border-slate-700">{reviewNeeded.length}</span>
                  </div>
                  <div className="space-y-4">{reviewNeeded.map(c => <CandidateCard key={c.id} candidate={c} />)}</div>
                </div>

                {/* Archived Column */}
                <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'archived')} className="bg-[#0F172A]/40 backdrop-blur-xl rounded-3xl p-5 border border-slate-800/50 shadow-2xl min-h-[600px] opacity-70 hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between mb-6 px-2 border-b border-slate-800/50 pb-4">
                    <h3 className="font-black text-slate-400 flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-slate-500 shadow-[0_0_10px_rgba(100,116,139,0.5)]"></span> 
                      Archived
                    </h3>
                    <span className="bg-slate-800 text-slate-400 text-xs font-black px-3 py-1 rounded-full border border-slate-700">{archived.length}</span>
                  </div>
                  <div className="space-y-4">{archived.map(c => <CandidateCard key={c.id} candidate={c} />)}</div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      {/* --- DEEP DIVE MODAL (DARK MODE) --- */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070B14]/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0F172A] rounded-3xl shadow-2xl border border-slate-800 w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
              <div>
                <span className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 inline-flex items-center gap-2">
                  Intelligence Report • Job #{selectedCandidate.job_id}
                  {selectedCandidate.is_human_overridden && <span className="bg-blue-600 text-white px-2 py-0.5 rounded-md">✋ Human Override Active</span>}
                </span>
                <h2 className="text-3xl font-black text-white leading-tight flex items-center gap-3">
                  {selectedCandidate.filename.includes('🔒') ? '🛡️' : '📄'} {selectedCandidate.filename.replace('🔒 Anonymous_Candidate_', 'Candidate_')}
                </h2>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full flex items-center justify-center transition-colors font-bold border border-slate-700">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar bg-[#0B1121] flex flex-col md:flex-row">
              <div className="p-8 flex-1 border-r border-slate-800">
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700 shadow-lg text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Total Match</p>
                    <p className={`text-4xl font-black ${selectedCandidate.final_score >= 75 ? 'text-emerald-400' : selectedCandidate.final_score >= 50 ? 'text-amber-400' : 'text-slate-400'}`}>{selectedCandidate.final_score.toFixed(1)}%</p>
                  </div>
                  <div className="bg-[#1E293B] p-6 rounded-2xl border border-slate-700 shadow-lg text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Contextual Exp. (Semantic)</p>
                    <p className="text-3xl font-black text-white">{(selectedCandidate.semantic_score * 100).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="bg-[#1E293B] p-8 rounded-3xl border border-slate-700 shadow-lg flex flex-col items-center justify-center mb-8">
                  <h3 className="text-sm font-black text-slate-300 uppercase tracking-widest mb-8">Explainable AI Vectors</h3>
                  <div className="bg-[#0F172A] p-6 rounded-full border border-slate-800 shadow-inner">
                    <XAIDial featureBreakdown={{ skill_overlap_score: selectedCandidate.skill_overlap_score, semantic_score: selectedCandidate.semantic_score, lexical_score: selectedCandidate.lexical_score }} />
                  </div>
                </div>

                <div className="bg-slate-900/50 p-8 rounded-3xl border border-slate-800 shadow-inner mb-8">
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-3">
                    <span className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">🧠</span> 
                    AI Screening Insights
                  </h4>
                  <ul className="space-y-4">
                    {generateXAIReasons(selectedCandidate).map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-4 text-sm font-medium p-5 rounded-2xl bg-[#1E293B] border border-slate-700 shadow-sm">
                        {reason.type === 'positive' && <span className="text-emerald-400 text-xl mt-0.5 shadow-[0_0_10px_rgba(16,185,129,0.3)] rounded-full">✓</span>}
                        {reason.type === 'negative' && <span className="text-red-400 text-xl mt-0.5">✕</span>}
                        {reason.type === 'warning' && <span className="text-amber-400 text-xl mt-0.5">⚠️</span>}
                        {reason.type === 'danger' && <span className="text-red-500 text-xl mt-0.5 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">🚨</span>}
                        <span className={reason.type === 'positive' ? 'text-emerald-300 leading-relaxed' : reason.type === 'negative' ? 'text-slate-300 leading-relaxed' : reason.type === 'warning' ? 'text-amber-300 leading-relaxed' : 'text-red-400 font-bold leading-relaxed'}>{reason.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="w-full md:w-96 bg-[#0F172A] p-8 flex flex-col border-l border-slate-800">
                <div className="mb-8"><h3 className="text-xl font-black text-white flex items-center gap-3"><span>✍️</span> Human Evaluation</h3></div>
                <div className="flex-1 flex flex-col">
                  <textarea value={recruiterNote} onChange={(e) => setRecruiterNote(e.target.value)} placeholder="Enter manual recruiter notes here..." className="flex-1 w-full p-5 rounded-2xl border border-slate-700 bg-[#1E293B] text-slate-300 placeholder:text-slate-600 focus:bg-[#0B1121] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-sm resize-none shadow-inner" />
                  <button onClick={handleSaveNote} disabled={savingNote || recruiterNote === (selectedCandidate.recruiter_notes || '')} className="mt-6 w-full bg-blue-600 hover:bg-blue-500 text-white font-black tracking-wide py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 disabled:opacity-50 disabled:shadow-none">
                    {savingNote ? "SAVING..." : "SAVE NOTES"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          GLOBAL AI COPILOT (DARK MODE WIDGET)
          ========================================= */}
      <button onClick={() => setGlobalChatOpen(!globalChatOpen)} className="fixed bottom-8 right-8 w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-[0_10px_30px_rgba(37,99,235,0.5)] flex items-center justify-center text-3xl transition-transform hover:scale-110 z-40 border border-blue-400/30">💬</button>

      {globalChatOpen && (
        <div className="fixed bottom-32 right-8 w-[400px] bg-[#0F172A] rounded-3xl shadow-2xl border border-slate-700 overflow-hidden z-50 flex flex-col h-[600px] animate-in slide-in-from-bottom-8 duration-300">
          
          <div className="bg-[#1E293B] p-5 text-white flex flex-col border-b border-slate-700 shadow-md z-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div className="flex justify-between items-center mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-xl border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.2)]">🤖</div>
                <div>
                  <h3 className="font-black text-base leading-tight">Global ATS Copilot</h3>
                  <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-0.5">Bulk Filtering Mode</p>
                </div>
              </div>
              <button onClick={() => setGlobalChatOpen(false)} className="text-slate-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full hover:bg-slate-700 border border-slate-700">✕</button>
            </div>
            
            <select 
              value={chatJobId} 
              onChange={(e) => setChatJobId(e.target.value)}
              className="w-full bg-[#0B1121] text-xs font-bold text-slate-300 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer relative z-10 shadow-inner"
            >
              <option value="">🌍 Search Entire Company Database</option>
              {dbJobs.map(job => (
                <option key={job.id} value={job.id}>🎯 Role: {job.title} (Job #{job.id})</option>
              ))}
            </select>
          </div>

          <div className="flex-1 p-6 overflow-y-auto bg-[#0B1121] space-y-5 custom-scrollbar">
            {globalChatHistory.length === 0 ? (
              <div className="text-center text-slate-400 mt-10 px-4 animate-in zoom-in-95">
                <div className="w-20 h-20 bg-[#1E293B] rounded-full shadow-lg border border-slate-700 flex items-center justify-center text-4xl mx-auto mb-6">🔎</div>
                <p className="font-black text-white text-lg mb-2">Query your Talent Pool</p>
                <p className="text-sm font-medium leading-relaxed text-slate-500">Select a specific job role above to filter, then ask me to shortlist candidates.</p>
                <div className="mt-8 space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Try asking:</p>
                  <p className="text-xs font-medium italic bg-[#1E293B] p-3 rounded-xl border border-slate-700 shadow-sm cursor-pointer hover:border-blue-500/50 hover:text-blue-400 transition-colors" onClick={() => setGlobalChatInput("Show me the top 3 candidates for this role")}>"Show me the top 3 candidates for this role"</p>
                </div>
              </div>
            ) : (
              globalChatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-sm shadow-md prose prose-sm prose-p:leading-relaxed prose-li:my-0 prose-strong:text-white ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm font-medium' : 'bg-[#1E293B] border border-slate-700 text-slate-300 rounded-bl-sm prose-p:text-slate-300'}`}>
                    {msg.role === 'ai' ? <ReactMarkdown>{String(msg.content)}</ReactMarkdown> : msg.content}
                  </div>
                </div>
              ))
            )}
            {globalChatLoading && (
              <div className="flex justify-start">
                 <div className="px-5 py-4 rounded-2xl bg-[#1E293B] border border-slate-700 text-slate-400 flex items-center gap-2 rounded-bl-sm shadow-md">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                 </div>
              </div>
            )}
          </div>

          <form onSubmit={handleGlobalChat} className="p-5 bg-[#1E293B] border-t border-slate-700 flex gap-3">
            <input
              type="text"
              value={globalChatInput}
              onChange={(e) => setGlobalChatInput(e.target.value)}
              placeholder="Filter candidates..."
              className="flex-1 px-4 py-3 bg-[#0B1121] text-white border border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all placeholder:text-slate-600"
              disabled={globalChatLoading}
            />
            <button type="submit" disabled={globalChatLoading || !globalChatInput.trim()} className="bg-blue-600 text-white w-12 h-12 flex items-center justify-center rounded-xl font-bold hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 disabled:shadow-none">➤</button>
          </form>
        </div>
      )}
    </div>
  );
}

export default HrDashboard;