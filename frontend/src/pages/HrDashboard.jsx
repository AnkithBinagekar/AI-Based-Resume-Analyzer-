import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import XAIDial from '../components/XAIDial';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function HrDashboard() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('board'); 
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  // NEW: State for Recruiter Notes (Priority 1)
  const [recruiterNote, setRecruiterNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/candidates`);
      
      // Initialize candidates with an AI-derived status AND a human-override flag
      const initializedCandidates = response.data.data.map(c => {
        let aiStatus = 'archived';
        if (c.final_score >= 75) aiStatus = 'shortlisted';
        else if (c.final_score >= 50) aiStatus = 'review';
        
        return {
          ...c,
          pipeline_status: c.pipeline_status || aiStatus, // Allows DB to override if saved
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

  // ==========================================
  // PRIORITY 9: RECRUITER ANALYTICS DASHBOARD
  // ==========================================
  const generateAnalytics = () => {
    if (candidates.length === 0) return { avgMatch: 0, fraudCount: 0, topSkill: 'None' };

    // 1. Average Match Score
    const avgMatch = (candidates.reduce((sum, c) => sum + c.final_score, 0) / candidates.length).toFixed(1);

    // 2. Lexical Fraud Alerts (Keyword Stuffing)
    const fraudCount = candidates.filter(c => c.lexical_score > (c.semantic_score + 0.3)).length;

    // 3. Top Missing Skill Across Entire Database
    const allMissingSkills = candidates.flatMap(c => c.missing_skills ? c.missing_skills.split(',').map(s => s.trim()) : []);
    const skillFrequencies = allMissingSkills.reduce((acc, skill) => {
      if (skill) acc[skill] = (acc[skill] || 0) + 1;
      return acc;
    }, {});
    
    let topSkill = 'None';
    let maxCount = 0;
    for (const [skill, count] of Object.entries(skillFrequencies)) {
      if (count > maxCount) {
        maxCount = count;
        topSkill = skill;
      }
    }

    return { avgMatch, fraudCount, topSkill };
  };

  const { avgMatch, fraudCount, topSkill } = generateAnalytics();

  // ==========================================
  // PRIORITY 2: HUMAN OVERRIDE DRAG & DROP
  // ==========================================
  const handleDragStart = (e, candidateId) => {
    e.dataTransfer.setData('candidateId', candidateId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Required to allow dropping
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const candidateId = Number(e.dataTransfer.getData('candidateId'));
    
    setCandidates(prev => prev.map(c => {
      if (c.id === candidateId && c.pipeline_status !== newStatus) {
        return { 
          ...c, 
          pipeline_status: newStatus,
          is_human_overridden: true // Flags that the human overruled the AI
        };
      }
      return c;
    }));
  };

  // ==========================================
  // PRIORITY 1: RECRUITER NOTES
  // ==========================================
  const openDeepDive = (candidate) => {
    setSelectedCandidate(candidate);
    setRecruiterNote(candidate.recruiter_notes || '');
  };

  const handleSaveNote = () => {
    setSavingNote(true);
    // Simulate API delay for realism
    setTimeout(() => {
      setCandidates(prev => prev.map(c => 
        c.id === selectedCandidate.id ? { ...c, recruiter_notes: recruiterNote } : c
      ));
      setSavingNote(false);
    }, 600);
  };

  // Pipeline Filtering
  const topMatches = candidates.filter(c => c.pipeline_status === 'shortlisted');
  const reviewNeeded = candidates.filter(c => c.pipeline_status === 'review');
  const archived = candidates.filter(c => c.pipeline_status === 'archived');

  const getScoreBadge = (score) => {
    if (score >= 75) return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black">{score.toFixed(1)}%</span>;
    if (score >= 50) return <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-black">{score.toFixed(1)}%</span>;
    return <span className="px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-black">{score.toFixed(1)}%</span>;
  };

  // ==========================================
  // XAI REASONING GENERATOR (HR TRANSLATION)
  // Translates raw vectors into human-readable HR insights
  // ==========================================
  const generateXAIReasons = (candidate) => {
    if (!candidate) return [];
    const reasons = [];
    
    // Parse floats to guarantee safe math evaluation
    const semantic = parseFloat(candidate.semantic_score);
    const lexical = parseFloat(candidate.lexical_score);
    const skills = parseFloat(candidate.skill_overlap_score);

    // 1. The Fraud Check (White-texting)
    if (lexical > (semantic + 0.3)) {
      reasons.push({ type: 'danger', text: "Lexical Anomaly: Exact keyword match is unusually high compared to actual contextual experience. Potential Keyword Stuffing." });
    } else if (lexical < 0.2 && semantic > 0.5) {
      reasons.push({ type: 'positive', text: "Excellent vocabulary variance. Candidate explains concepts well without blindly copying the Job Description." });
    }

    // 2. The Hard Skills Check
    if (skills >= 0.8) {
      reasons.push({ type: 'positive', text: "Candidate possesses the vast majority of required technical tools." });
    } else if (skills < 0.4) {
      reasons.push({ type: 'negative', text: "Severe skill gap detected. Missing core technical requirements." });
    }

    // 3. The Context Check
    if (semantic >= 0.6) {
      reasons.push({ type: 'positive', text: "High semantic alignment. Past experience contextually matches the job role." });
    } else if (semantic < 0.3 && skills > 0.5) {
      reasons.push({ type: 'warning', text: "Domain Mismatch Risk: Has the technical skills, but applied them in a different context." });
    }

    return reasons;
  };

  const CandidateCard = ({ candidate }) => (
    <div 
      draggable 
      onDragStart={(e) => handleDragStart(e, candidate.id)}
      onClick={() => openDeepDive(candidate)} 
      className={`bg-white p-5 rounded-2xl shadow-sm border hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-grab active:cursor-grabbing relative overflow-hidden ${candidate.is_human_overridden ? 'border-blue-300 ring-2 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50/50 rounded-bl-full -mr-4 -mt-4 z-0 group-hover:scale-125 transition-transform duration-500"></div>
      
      <div className="relative z-10 flex justify-between items-start mb-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner ${candidate.filename.includes('🔒') ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-50 text-slate-500'}`}>
            {candidate.filename.includes('🔒') ? '🛡️' : '📄'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-bold text-slate-800 truncate" title={candidate.filename}>
              {candidate.filename.replace('🔒 Anonymous_Candidate_', 'Candidate_')}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Job #{candidate.job_id}</p>
              {candidate.is_human_overridden && (
                <span className="text-[9px] uppercase font-black tracking-wider text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-sm">✋ Override</span>
              )}
            </div>
          </div>
        </div>
        {getScoreBadge(candidate.final_score)}
      </div>

      <div className="relative z-10 grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Experience</p>
          <p className="text-xs font-black text-slate-700">{candidate.total_yoe || 0} Yrs</p>
        </div>
        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Education</p>
          <p className="text-xs font-black text-slate-700 truncate" title={candidate.highest_education}>{candidate.highest_education || 'Unknown'}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pt-6 pb-20 relative overflow-hidden">
      
      <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>

      <div className="max-w-7xl mx-auto px-6">
        
        {/* Dashboard Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/50 text-blue-700 text-xs font-bold tracking-widest uppercase mb-3 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span> Human-in-the-Loop Pipeline
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Recruitment ATS</h2>
            <p className="text-slate-500 font-medium mt-2 max-w-xl">AI automates the triage. Humans retain the executive override.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setViewMode('board')} 
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'board' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              Kanban
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              List
            </button>
          </div>
        </div>

        {/* RECRUITER ANALYTICS DASHBOARD */}
        {!loading && candidates.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xl shadow-inner">👥</div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Scans</p>
                <p className="text-2xl font-black text-slate-800">{candidates.length}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shadow-inner">📊</div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Avg Match</p>
                <p className="text-2xl font-black text-emerald-600">{avgMatch}%</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-red-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-xl shadow-inner relative z-10">🚨</div>
              <div className="relative z-10">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fraud Alerts</p>
                <p className="text-2xl font-black text-red-600">{fraudCount}</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center text-xl shadow-inner">🎯</div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Top Missing Skill</p>
                <p className="text-lg font-black text-slate-800 truncate" title={topSkill}>{topSkill}</p>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
             <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
             <p className="text-slate-500 font-bold tracking-widest uppercase text-sm animate-pulse">Syncing Enterprise Database...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-200 p-20 text-center animate-in fade-in zoom-in-95">
            <div className="text-6xl mb-6">📭</div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">No Candidates Found</h3>
            <p className="text-slate-500 mb-8 font-medium">Your ATS database is currently empty.</p>
            <button onClick={() => navigate('/candidate')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all active:scale-95">
              Go to Scanner Portal
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700">
            {viewMode === 'board' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                
                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'shortlisted')}
                  className="bg-slate-100/60 backdrop-blur-sm rounded-3xl p-4 border border-slate-200 shadow-inner min-h-[500px]"
                >
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span> Shortlisted
                    </h3>
                    <span className="bg-white text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{topMatches.length}</span>
                  </div>
                  <div className="space-y-4">
                    {topMatches.map(c => <CandidateCard key={c.id} candidate={c} />)}
                  </div>
                </div>

                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'review')}
                  className="bg-slate-100/60 backdrop-blur-sm rounded-3xl p-4 border border-slate-200 shadow-inner min-h-[500px]"
                >
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span> Review Needed
                    </h3>
                    <span className="bg-white text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{reviewNeeded.length}</span>
                  </div>
                  <div className="space-y-4">
                    {reviewNeeded.map(c => <CandidateCard key={c.id} candidate={c} />)}
                  </div>
                </div>

                <div 
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'archived')}
                  className="bg-slate-100/60 backdrop-blur-sm rounded-3xl p-4 border border-slate-200 shadow-inner min-h-[500px] opacity-80 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-400 shadow-sm shadow-slate-400/50"></span> Archived
                    </h3>
                    <span className="bg-white text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{archived.length}</span>
                  </div>
                  <div className="space-y-4">
                    {archived.map(c => <CandidateCard key={c.id} candidate={c} />)}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================
          THE DEEP DIVE MODAL (Explainable AI & HITL Actions)
          ========================================= */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-900 text-white">
              <div>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 inline-flex items-center gap-2">
                  Intelligence Report • Job #{selectedCandidate.job_id}
                  {selectedCandidate.is_human_overridden && <span className="bg-blue-600 text-white px-2 py-0.5 rounded-md">✋ Human Override Active</span>}
                </span>
                <h2 className="text-3xl font-black leading-tight flex items-center gap-3">
                  {selectedCandidate.filename.includes('🔒') ? '🛡️' : '📄'} 
                  {selectedCandidate.filename.replace('🔒 Anonymous_Candidate_', 'Candidate_')}
                </h2>
              </div>
              
              <div className="flex items-center gap-4">
                <a 
                  href={`mailto:candidate@example.com?subject=Interview Invitation: Application Review&body=Hi there,%0D%0A%0D%0AWe have reviewed your application and our AI-assisted platform flagged an impressive ${selectedCandidate.final_score.toFixed(0)}% skill overlap for this role.%0D%0A%0D%0AWe would love to schedule a technical interview.%0D%0A%0D%0ABest regards,%0D%0AHR Team`}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  <span>✉️</span> Draft Outreach
                </a>
                <button 
                  onClick={() => setSelectedCandidate(null)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 custom-scrollbar bg-slate-50 flex flex-col md:flex-row">
              
              {/* LEFT SIDE: AI Analytics */}
              <div className="p-8 flex-1 border-r border-slate-200">
                
                {/* --- HR TRANSLATION: "Semantic" is now "Contextual Exp." --- */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Match</p>
                    <p className={`text-3xl font-black ${selectedCandidate.final_score >= 75 ? 'text-emerald-500' : selectedCandidate.final_score >= 50 ? 'text-amber-500' : 'text-slate-500'}`}>
                      {selectedCandidate.final_score.toFixed(1)}%
                    </p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Contextual Exp. (Semantic)</p>
                    <p className="text-xl font-bold text-slate-700">{(selectedCandidate.semantic_score * 100).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center mb-8">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Explainable AI Vectors</h3>
                  <XAIDial featureBreakdown={{
                    skill_overlap_score: selectedCandidate.skill_overlap_score,
                    semantic_score: selectedCandidate.semantic_score,
                    lexical_score: selectedCandidate.lexical_score
                  }} />
                </div>

                {/* --- NEW: HR AI SCREENING INSIGHTS PANEL --- */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner mb-8">
                  <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-4 flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">🧠</span> 
                    AI Screening Insights
                  </h4>
                  
                  <ul className="space-y-3">
                    {generateXAIReasons(selectedCandidate).map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm font-medium p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
                        {reason.type === 'positive' && <span className="text-emerald-500 text-lg mt-0.5">✓</span>}
                        {reason.type === 'negative' && <span className="text-red-500 text-lg mt-0.5">✕</span>}
                        {reason.type === 'warning' && <span className="text-amber-500 text-lg mt-0.5">⚠️</span>}
                        {reason.type === 'danger' && <span className="text-red-600 text-lg mt-0.5 animate-pulse">🚨</span>}
                        
                        <span className={
                          reason.type === 'positive' ? 'text-emerald-800' :
                          reason.type === 'negative' ? 'text-slate-700' :
                          reason.type === 'warning' ? 'text-amber-800' : 'text-red-700 font-bold'
                        }>
                          {reason.text}
                        </span>
                      </li>
                    ))}
                    
                    {generateXAIReasons(selectedCandidate).length === 0 && (
                      <li className="text-sm text-slate-500 italic p-3 bg-white rounded-xl border border-slate-100">
                        Average profile alignment. No significant positive or negative anomalies detected.
                      </li>
                    )}
                  </ul>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    {/* Updated Label below */}
                    <h4 className="font-black text-emerald-600 uppercase text-[10px] tracking-widest mb-3">Matched Tools & Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.matched_skills ? selectedCandidate.matched_skills.split(',').map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md text-[10px] font-bold">{skill.trim()}</span>
                      )) : <span className="text-xs text-slate-400">None</span>}
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <h4 className="font-black text-red-500 uppercase text-[10px] tracking-widest mb-3">Missing Requirements</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCandidate.missing_skills ? selectedCandidate.missing_skills.split(',').map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 bg-red-50 text-red-600 border border-red-100 rounded-md text-[10px] font-bold">{skill.trim()}</span>
                      )) : <span className="text-xs text-slate-400">Perfect match.</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: Human Collaboration Layer */}
              <div className="w-full md:w-96 bg-white p-8 flex flex-col">
                <div className="mb-6">
                  <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                    <span>✍️</span> Human Evaluation
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wider">Recruiter Notes & Oversight</p>
                </div>

                <div className="flex-1 flex flex-col">
                  <textarea 
                    value={recruiterNote}
                    onChange={(e) => setRecruiterNote(e.target.value)}
                    placeholder="E.g., AI flagged a missing AWS skill, but candidate has GCP experience. Proceeding to technical round..."
                    className="flex-1 w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none custom-scrollbar"
                  />
                  <button 
                    onClick={handleSaveNote}
                    disabled={savingNote || recruiterNote === (selectedCandidate.recruiter_notes || '')}
                    className="mt-4 w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {savingNote ? "Saving..." : "Save Collaboration Notes"}
                  </button>
                </div>
                
                <div className="mt-6 border-t border-slate-200 pt-6">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <span>🕒</span> System Activity Timeline
                  </h4>
                  
                  <div className="relative border-l-2 border-slate-200 ml-3 space-y-6 pb-2">
                    <div className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-200 border-2 border-white"></span>
                      <p className="text-xs font-bold text-slate-800">Document Ingested</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Parsed via PyMuPDF Layout-Aware Engine.</p>
                      {selectedCandidate.filename.includes('🔒') && (
                        <p className="text-[10px] text-indigo-600 font-bold mt-1 bg-indigo-50 inline-block px-2 py-0.5 rounded">🛡️ PII scrubbed. Blind hiring enforced.</p>
                      )}
                    </div>

                    <div className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-sm"></span>
                      <p className="text-xs font-bold text-slate-800">AI Ensemble Analysis</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">Scored {selectedCandidate.final_score.toFixed(1)}% via Random Forest Model.</p>
                    </div>

                    <div className="relative pl-6">
                      <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-400 border-2 border-white shadow-sm"></span>
                      <p className="text-xs font-bold text-slate-800">Automated Pipeline Placement</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Categorized based on AI multi-vector threshold.
                      </p>
                    </div>

                    {selectedCandidate.is_human_overridden && (
                      <div className="relative pl-6 animate-in fade-in slide-in-from-left-2">
                        <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-sm shadow-amber-500/30"></span>
                        <p className="text-xs font-black text-amber-600">Human Override Executed</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                          Manually moved to <span className="uppercase font-bold text-amber-600">{selectedCandidate.pipeline_status}</span> by Recruiter.
                        </p>
                      </div>
                    )}

                    {selectedCandidate.recruiter_notes && (
                       <div className="relative pl-6 animate-in fade-in slide-in-from-left-2">
                        <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-slate-800 border-2 border-white shadow-sm"></span>
                        <p className="text-xs font-bold text-slate-800">Collaboration Note Appended</p>
                        <div className="text-[10px] text-slate-600 font-medium mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100 line-clamp-2 italic">
                          "{selectedCandidate.recruiter_notes}"
                        </div>
                      </div>
                    )}
                    
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HrDashboard;