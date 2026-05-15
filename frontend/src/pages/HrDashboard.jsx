import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import XAIDial from '../components/XAIDial'; // NEW: Importing your XAI Radar Chart

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function HrDashboard() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('board'); 
  
  // NEW: State to control the Deep Dive Modal
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/candidates`);
      setCandidates(response.data.data);
    } catch (err) {
      console.error("Failed to fetch candidates", err);
    } finally {
      setLoading(false);
    }
  };

  const topMatches = candidates.filter(c => c.final_score >= 75);
  const reviewNeeded = candidates.filter(c => c.final_score >= 50 && c.final_score < 75);
  const archived = candidates.filter(c => c.final_score < 50);

  const getScoreBadge = (score) => {
    if (score >= 75) return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black">{score.toFixed(1)}%</span>;
    if (score >= 50) return <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-black">{score.toFixed(1)}%</span>;
    return <span className="px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 rounded-full text-xs font-black">{score.toFixed(1)}%</span>;
  };

  const CandidateCard = ({ candidate }) => (
    <div 
      onClick={() => setSelectedCandidate(candidate)} // NEW: Trigger the modal on click
      className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group cursor-pointer hover:border-blue-300 relative overflow-hidden"
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
            <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mt-0.5">Job #{candidate.job_id}</p>
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

      <div className="relative z-10 flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          View Full AI Report <span className="text-sm">→</span>
        </span>
        <span className="text-xs font-black text-slate-700 group-hover:opacity-0 transition-opacity">{(candidate.skill_overlap_score * 100).toFixed(0)}% Overlap</span>
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
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span> Live Pipeline
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Recruitment ATS</h2>
            <p className="text-slate-500 font-medium mt-2 max-w-xl">Automated candidate triage powered by Explainable AI and Random Forest metrics.</p>
          </div>
          
          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => setViewMode('board')} 
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'board' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              Board View
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              List View
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white/50 backdrop-blur-sm rounded-3xl border border-slate-200">
             <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
             <p className="text-slate-500 font-bold tracking-widest uppercase text-sm animate-pulse">Syncing Enterprise Database...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-200 p-20 text-center animate-in fade-in zoom-in-95">
            <div className="text-6xl mb-6">📭</div>
            <h3 className="text-2xl font-black text-slate-800 mb-2">No Candidates Found</h3>
            <p className="text-slate-500 mb-8 font-medium">Your ATS database is currently empty. Upload resumes to populate the pipeline.</p>
            <button onClick={() => navigate('/candidate')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all active:scale-95">
              Go to Upload Portal
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700">
            
            {/* --- KANBAN BOARD VIEW --- */}
            {viewMode === 'board' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                
                {/* Column 1: Shortlisted */}
                <div className="bg-slate-100/60 backdrop-blur-sm rounded-3xl p-4 border border-slate-200 shadow-inner">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span> Shortlisted
                    </h3>
                    <span className="bg-white text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{topMatches.length}</span>
                  </div>
                  <div className="space-y-4">
                    {topMatches.map(c => <CandidateCard key={c.id} candidate={c} />)}
                    {topMatches.length === 0 && <div className="p-8 text-center text-sm font-medium text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">No top matches yet</div>}
                  </div>
                </div>

                {/* Column 2: Review Needed */}
                <div className="bg-slate-100/60 backdrop-blur-sm rounded-3xl p-4 border border-slate-200 shadow-inner">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span> Review Needed
                    </h3>
                    <span className="bg-white text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{reviewNeeded.length}</span>
                  </div>
                  <div className="space-y-4">
                    {reviewNeeded.map(c => <CandidateCard key={c.id} candidate={c} />)}
                    {reviewNeeded.length === 0 && <div className="p-8 text-center text-sm font-medium text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">No average matches</div>}
                  </div>
                </div>

                {/* Column 3: Archived */}
                <div className="bg-slate-100/60 backdrop-blur-sm rounded-3xl p-4 border border-slate-200 shadow-inner opacity-80 hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h3 className="font-black text-slate-800 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-slate-400 shadow-sm shadow-slate-400/50"></span> Archived
                    </h3>
                    <span className="bg-white text-slate-600 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">{archived.length}</span>
                  </div>
                  <div className="space-y-4">
                    {archived.map(c => <CandidateCard key={c.id} candidate={c} />)}
                    {archived.length === 0 && <div className="p-8 text-center text-sm font-medium text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">Pipeline clean</div>}
                  </div>
                </div>

              </div>
            )}

            {/* --- LIST VIEW (FALLBACK) --- */}
            {viewMode === 'list' && (
              <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Candidate File</th>
                        <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Job ID</th>
                        <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Overall Match</th>
                        <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest hidden md:table-cell">Skill Overlap</th>
                        <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest hidden lg:table-cell">Exp / Edu</th>
                        <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {candidates.map((candidate) => (
                        <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-5">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{candidate.filename.includes('🔒') ? '🕵️‍♂️' : '📄'}</span>
                              <span className={`text-sm font-bold truncate max-w-[200px] ${candidate.filename.includes('🔒') ? 'text-emerald-700' : 'text-slate-800'}`}>
                                {candidate.filename}
                              </span>
                            </div>
                          </td>
                          <td className="p-5 text-sm font-bold text-slate-500">#{candidate.job_id}</td>
                          <td className="p-5">{getScoreBadge(candidate.final_score)}</td>
                          <td className="p-5 hidden md:table-cell text-sm font-semibold text-slate-600">
                            {(candidate.skill_overlap_score * 100).toFixed(1)}%
                          </td>
                          <td className="p-5 hidden lg:table-cell">
                            <div className="text-sm font-bold text-slate-800">{candidate.total_yoe || 0} Yrs</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{candidate.highest_education || 'Unknown'}</div>
                          </td>
                          <td className="p-5">
                            <button 
                              onClick={() => setSelectedCandidate(candidate)}
                              className="text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                            >
                              Deep Dive
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* =========================================
          THE DEEP DIVE MODAL (Explainable AI)
          ========================================= */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-900 text-white">
              <div>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 inline-block">
                  Intelligence Report • Job #{selectedCandidate.job_id}
                </span>
                <h2 className="text-3xl font-black leading-tight flex items-center gap-3">
                  {selectedCandidate.filename.includes('🔒') ? '🛡️' : '📄'} 
                  {selectedCandidate.filename}
                </h2>
              </div>
              <button 
                onClick={() => setSelectedCandidate(null)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar bg-slate-50">
              
              {/* Highlight Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Match</p>
                  <p className={`text-3xl font-black ${selectedCandidate.final_score >= 75 ? 'text-emerald-500' : selectedCandidate.final_score >= 50 ? 'text-amber-500' : 'text-slate-500'}`}>
                    {selectedCandidate.final_score.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
                  <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Semantic Score</p>
                  <p className="text-xl font-bold text-slate-700">{(selectedCandidate.semantic_score * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm text-center bg-emerald-50/30">
                  <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Experience</p>
                  <p className="text-xl font-bold text-emerald-800">{selectedCandidate.total_yoe || 0} Years</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm text-center bg-emerald-50/30 overflow-hidden">
                  <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Education</p>
                  <p className="text-sm font-bold text-emerald-800 truncate px-2" title={selectedCandidate.highest_education}>
                    {selectedCandidate.highest_education || 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                
                {/* Left Side: XAI Radar Chart */}
                <div className="md:col-span-5 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 text-center w-full">Explainable AI Vectors</h3>
                  <div className="w-full flex justify-center">
                    <XAIDial featureBreakdown={{
                      skill_overlap_score: selectedCandidate.skill_overlap_score,
                      semantic_score: selectedCandidate.semantic_score,
                      lexical_score: selectedCandidate.lexical_score
                    }} />
                  </div>
                </div>

                {/* Right Side: Skill Breakdown */}
                <div className="md:col-span-7 grid grid-rows-2 gap-4">
                  
                  {/* Matched Skills */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-black text-emerald-600 uppercase text-xs tracking-widest flex items-center gap-2 mb-4">
                      <span className="w-2 h-2 bg-emerald-600 rounded-full"></span> Matched Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.matched_skills ? selectedCandidate.matched_skills.split(',').map((skill, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold shadow-sm">
                          {skill.trim()}
                        </span>
                      )) : <span className="text-xs text-slate-400">No matched skills recorded.</span>}
                    </div>
                  </div>

                  {/* Missing Skills */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                    <h4 className="font-black text-red-500 uppercase text-xs tracking-widest flex items-center gap-2 mb-4">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Missing Requirements
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedCandidate.missing_skills ? selectedCandidate.missing_skills.split(',').map((skill, idx) => (
                        <span key={idx} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold shadow-sm">
                          {skill.trim()}
                        </span>
                      )) : <span className="text-xs text-slate-400 text-center w-full mt-2">Perfect Skill Match! No missing skills.</span>}
                    </div>
                  </div>

                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 bg-white border-t border-slate-100 flex justify-between items-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                Analyzed by Random Forest Ensemble
              </p>
              <button 
                onClick={() => setSelectedCandidate(null)}
                className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default HrDashboard;