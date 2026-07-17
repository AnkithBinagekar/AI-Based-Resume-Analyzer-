import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import XAIDial from '../components/XAIDial';
import ReactMarkdown from 'react-markdown';
import { 
  Users, BarChart2, AlertTriangle, Target, Search, X, ShieldCheck, 
  FileText, ArrowRight, Bot, ChevronDown, CheckCircle, Calendar,
  Inbox, Mail, PenTool, Hand
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function CustomDropdown({ value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options?.find(opt => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className="relative w-full">
      <div onClick={() => setIsOpen(!isOpen)} className="w-full px-4 py-3.5 rounded-xl border border-white/5 bg-[#1A1F2E]/60 backdrop-blur-md text-[#F7F9FC] hover:bg-[#1A1F2E]/80 transition-all text-sm font-medium shadow-inner flex justify-between items-center cursor-pointer">
        <span className="truncate">{displayLabel}</span>
        <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-50 w-full mt-2 bg-[#242B3D]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
            {(!options || options.length === 0) ? (
              <div className="px-4 py-3 text-sm text-[#94A3B8]">No options available.</div>
            ) : (
              options.map(opt => (
                <div key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`px-4 py-3 text-sm cursor-pointer transition-colors ${String(value) === String(opt.value) ? 'bg-[#2F6FED]/20 text-[#2F6FED] font-bold' : 'text-[#F7F9FC] hover:bg-white/10'}`}>
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function HrDashboard() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('board'); 
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  
  const [globalChatOpen, setGlobalChatOpen] = useState(false);
  const [globalChatHistory, setGlobalChatHistory] = useState([]);
  const [globalChatInput, setGlobalChatInput] = useState('');
  const [globalChatLoading, setGlobalChatLoading] = useState(false);
  const globalChatEndRef = useRef(null);

  useEffect(() => {
    globalChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [globalChatHistory]);
  
  const [dbJobs, setDbJobs] = useState([]);
  const [chatJobId, setChatJobId] = useState(''); 
  
  const [recruiterNote, setRecruiterNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  
  const [interviewGuide, setInterviewGuide] = useState('');
  const [generatingInterview, setGeneratingInterview] = useState(false);

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
        return { ...c, pipeline_status: c.pipeline_status || aiStatus, is_human_overridden: c.is_human_overridden || false, recruiter_notes: c.recruiter_notes || '' };
      });
      setCandidates(initializedCandidates);
    } catch (err) { console.error("Failed to fetch candidates", err); } finally { setLoading(false); }
  };

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jobs`);
      setDbJobs(response.data.data || []);
    } catch (err) { console.error("Failed to fetch jobs", err); }
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
  
  const openDeepDive = (candidate) => { 
    setSelectedCandidate(candidate); 
    setRecruiterNote(candidate.recruiter_notes || ''); 
    setInterviewGuide(''); 
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    const candidateId = Number(e.dataTransfer.getData('candidateId'));
    setCandidates(prev => prev.map(c => c.id === candidateId && c.pipeline_status !== newStatus ? { ...c, pipeline_status: newStatus, is_human_overridden: true } : c));
    try { await axios.put(`${API_BASE_URL}/api/candidates/${candidateId}/status`, { status: newStatus }); } catch (error) { console.error("Failed to sync drag and drop status", error); }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await axios.put(`${API_BASE_URL}/api/candidates/${selectedCandidate.id}/notes`, { notes: recruiterNote });
      setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? { ...c, recruiter_notes: recruiterNote } : c));
    } catch (error) { console.error("Failed to save note:", error); alert("Failed to save notes to the database."); } finally { setSavingNote(false); }
  };

  const handleStatusChange = async (candidateId, newStatus) => {
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, pipeline_status: newStatus, is_human_overridden: true, recruiter_notes: recruiterNote } : c));
    setSelectedCandidate(null); 
    try { await axios.put(`${API_BASE_URL}/api/candidates/${candidateId}/status`, { status: newStatus }); } catch (error) { console.error("Failed to update status:", error); }
  };

  const handleGenerateInterview = async () => {
    setGeneratingInterview(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/candidates/${selectedCandidate.id}/interview-guide`);
      setInterviewGuide(response.data.guide);
    } catch (error) {
      console.error("Failed to generate interview:", error);
      alert("Failed to generate interview questions. Check backend logs.");
    } finally {
      setGeneratingInterview(false);
    }
  };

  const handleOutreach = (type) => {
    if (!selectedCandidate) return;
    const rawName = selectedCandidate.filename.replace('🔒 Anonymous_Candidate_', '').replace('Candidate_', '').replace('.pdf', '');
    const candidateName = rawName.includes('_') ? rawName.split('_')[0] : rawName;
    const topSkill = selectedCandidate.matched_skills ? selectedCandidate.matched_skills.split(',')[0].trim() : "your technical background";
    const job = dbJobs.find(j => String(j.id) === String(selectedCandidate.job_id));
    const jobName = job ? job.title : `Job #${selectedCandidate.job_id}`;

    let subject = "";
    let body = "";

    if (type === 'invite') {
      subject = `Interview Invitation: ${jobName}`;
      body = `Hi ${candidateName},\n\nThank you for applying for the ${jobName} position. Our team was very impressed by your background, particularly your strong experience with ${topSkill}.\n\nWe would love to invite you to an initial interview to discuss your experience and the role in more detail.\n\nPlease let us know your availability over the next few days.\n\nBest regards,\nTalent Acquisition Team`;
    } else if (type === 'reject') {
      subject = `Update on your application: ${jobName}`;
      body = `Hi ${candidateName},\n\nThank you for taking the time to apply for the ${jobName} position and for sharing your background with us.\n\nWhile we appreciated learning about your experience, we have decided to move forward with other candidates whose profiles more closely align with our current needs for this specific role.\n\nWe wish you the best of luck in your job search and future professional endeavors.\n\nBest regards,\nTalent Acquisition Team`;
    }

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
      const response = await axios.post(`${API_BASE_URL}/api/global-chat`, formData, { timeout: 15000 });
      const aiResponse = response.data?.answer || "Sorry, I received an empty response from the database.";
      setGlobalChatHistory(prev => [...prev, { role: 'ai', content: String(aiResponse) }]);
    } catch (err) { 
      const errorMsg = err.code === 'ECONNABORTED' ? "AI request timed out. Please try again." : (err.response?.status === 429 ? "AI rate limit reached. Please wait about one minute before trying again." : "Failed to reach AI backend.");
      setGlobalChatHistory(prev => [...prev, { role: 'ai', content: errorMsg }]); 
    } finally { setGlobalChatLoading(false); }
  };

  const reviewNeeded = candidates.filter(c => c.pipeline_status === 'review');
  const topMatches = candidates.filter(c => c.pipeline_status === 'shortlisted');
  const interviewing = candidates.filter(c => c.pipeline_status === 'interview');
  const archived = candidates.filter(c => c.pipeline_status === 'archived');

  const getCandidateInsights = (candidate) => {
    if (!candidate) return { strengths: [], concerns: [] };
    const strengths = [];
    const concerns = [];
    const semantic = parseFloat(candidate.semantic_score || 0);
    const lexical = parseFloat(candidate.lexical_score || 0);
    const skills = parseFloat(candidate.skill_overlap_score || 0);

    if (skills >= 0.7) strengths.push("Strong technical tool and skill alignment.");
    if (semantic >= 0.6) strengths.push("High contextual experience for this role.");
    if (lexical < 0.2 && semantic > 0.5) strengths.push("Authentic phrasing (Excellent vocabulary variance).");
    if (candidate.total_yoe >= 3) strengths.push(`${candidate.total_yoe} years experience aligns well.`);
    
    if (candidate.missing_skills) concerns.push(`Missing key requirements: ${candidate.missing_skills.split(',').slice(0,3).join(', ')}`);
    if (skills < 0.4) concerns.push("Severe gap in required technical skills.");
    if (semantic < 0.3 && skills > 0.5) concerns.push("Domain mismatch: Has skills, but applied in a different context.");
    if (lexical > (semantic + 0.3)) concerns.push("ATS Manipulation Risk: High exact keyword match suggests resume stuffing.");

    if (strengths.length === 0) strengths.push("Meets baseline ATS requirements.");
    return { strengths, concerns };
  };

  const CandidateCard = ({ candidate }) => {
    const score = candidate.final_score || 0;
    const barColor = score >= 75 ? 'bg-[#2FBF71]' : score >= 50 ? 'bg-[#F59E0B]' : 'bg-[#94A3B8]';
    const badgeColor = score >= 75 ? 'text-[#2FBF71] bg-[#2FBF71]/10 border-[#2FBF71]/30' : score >= 50 ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30' : 'text-[#94A3B8] bg-[#1A1F2E]/80 border-white/5';
    
    let fraudAlert = null;
    let fraudColor = "text-[#E85D75] border-[#E85D75]/30 bg-[#E85D75]/10";
    if (candidate.filename.includes('[FRAUD]') || candidate.filename.includes('🔒')) {
      fraudAlert = "MANUAL REVIEW REQ";
      fraudColor = "text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10"; 
    } else if (parseFloat(candidate.lexical_score || 0) > parseFloat(candidate.semantic_score || 0) + 0.3) {
      fraudAlert = "ATS MANIPULATION RISK"; 
    }

    const topSkill = candidate.matched_skills 
      ? candidate.matched_skills.split(',')[0].trim() 
      : (parseFloat(candidate.skill_overlap_score || 0) >= 0.5 ? 'Tech Verified' : 'Review Skills');

    return (
      <div draggable onDragStart={(e) => handleDragStart(e, candidate.id)} onClick={() => openDeepDive(candidate)} className={`bg-[#242B3D]/60 backdrop-blur-xl p-5 rounded-2xl shadow-lg border hover:-translate-y-1 transition-all duration-300 ease-out cursor-grab active:cursor-grabbing relative overflow-hidden group ${candidate.is_human_overridden ? 'border-[#2F6FED] ring-2 ring-[#2F6FED]/30' : 'border-white/10 hover:border-[#2F6FED]/60 hover:shadow-[0_0_20px_rgba(47,111,237,0.25)]'}`}>
        <div className="absolute top-0 right-0 w-20 h-20 bg-[#2F6FED]/10 rounded-bl-full -mr-4 -mt-4 z-0 group-hover:scale-125 transition-transform duration-500"></div>
        <div className="relative z-10 flex justify-between items-start mb-3">
          <div className="flex-1 overflow-hidden pr-3">
            <h4 className="text-sm font-black text-[#F7F9FC] truncate drop-shadow-sm flex items-center gap-1.5" title={candidate.filename}>
              {candidate.filename.includes('🔒') ? <ShieldCheck className="w-4 h-4 text-[#2F6FED]"/> : <FileText className="w-4 h-4 text-[#94A3B8]"/>}
              {candidate.filename.replace('🔒 Anonymous_Candidate_', 'Candidate_').replace('.pdf', '')}
            </h4>
            <div className="flex items-center gap-2 mt-1"><p className="text-[10px] uppercase tracking-widest font-bold text-[#94A3B8]">Job #{candidate.job_id}</p></div>
          </div>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-black shadow-sm border backdrop-blur-md ${badgeColor}`}>{score.toFixed(1)}%</span>
        </div>
        {fraudAlert && (<div className={`relative z-10 mb-3 w-full border py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 shadow-inner ${fraudColor}`}><AlertTriangle className="w-3 h-3 animate-pulse shrink-0"/> <span className="text-xs font-black uppercase tracking-widest animate-pulse drop-shadow-sm">{fraudAlert}</span></div>)}
        <div className="relative z-10 mb-4">
           <div className="flex justify-between items-center mb-1.5"><span className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Match Strength</span></div>
           <div className="w-full h-1.5 bg-[#1A1F2E]/80 rounded-full overflow-hidden shadow-inner border border-white/5"><div className={`h-full rounded-full ${barColor} shadow-[0_0_8px_currentColor]`} style={{ width: `${score}%` }}></div></div>
        </div>
        <div className="relative z-10 flex gap-2">
          <div className="flex-1 bg-[#1A1F2E]/60 backdrop-blur-md p-2 rounded-lg border border-white/5 shadow-inner"><p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-0.5">Experience</p><p className="text-xs font-black text-[#F7F9FC]">{candidate.total_yoe || 0} Yrs</p></div>
          <div className="flex-1 bg-[#1A1F2E]/60 backdrop-blur-md p-2 rounded-lg border border-white/5 shadow-inner overflow-hidden"><p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-0.5">Top Skill</p><p className="text-xs font-black text-[#2F6FED] truncate drop-shadow-sm" title={topSkill}>{topSkill}</p></div>
          {candidate.is_human_overridden && (<div className="flex items-center justify-center bg-[#2F6FED]/20 border border-[#2F6FED]/30 px-2.5 rounded-lg shadow-sm" title="Human Overridden"><Hand className="w-4 h-4 text-[#2F6FED]"/></div>)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#1A1F2E] text-[#F7F9FC] pt-6 pb-20 relative overflow-x-hidden font-sans selection:bg-[#2F6FED]/30">
      
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#242B3D_1px,transparent_1px),linear-gradient(to_bottom,#242B3D_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>
        <div className="absolute top-[10%] left-[20%] w-[600px] h-[600px] bg-[#2F6FED]/15 blur-[150px] rounded-full pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-[#2FBF71]/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="mb-10 flex flex-col md:flex-row justify-between items-end gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2F6FED]/10 backdrop-blur-md border border-[#2F6FED]/30 text-[#2F6FED] text-[10px] font-black tracking-widest uppercase mb-4 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#2F6FED] animate-pulse"></span> Human-in-the-Loop Pipeline
            </div>
            <h2 className="text-4xl font-black text-[#F7F9FC] tracking-tight drop-shadow-sm">Recruiter Intelligence</h2>
            <p className="text-[#94A3B8] font-medium mt-2 max-w-xl">AI automates candidate triage. Recruiters retain final decision authority.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-[#242B3D]/60 backdrop-blur-xl p-1.5 rounded-xl border border-white/10 shadow-lg">
            <button onClick={() => setViewMode('board')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'board' ? 'bg-[#2F6FED]/90 border border-white/10 text-white shadow-[0_0_20px_rgba(47,111,237,0.4)] backdrop-blur-md' : 'text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#1A1F2E]/50 border border-transparent'}`}>Candidate Flow</button>
            <button onClick={() => setViewMode('list')} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-[#2F6FED]/90 border border-white/10 text-white shadow-[0_0_20px_rgba(47,111,237,0.4)] backdrop-blur-md' : 'text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#1A1F2E]/50 border border-transparent'}`}>List</button>
          </div>
        </div>

        {!loading && candidates.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="bg-[#242B3D]/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex items-center gap-5 relative overflow-hidden">
              <div className="w-14 h-14 rounded-xl bg-[#2F6FED]/20 backdrop-blur-md text-[#2F6FED] border border-[#2F6FED]/30 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(47,111,237,0.2)] relative z-10"><Users className="w-6 h-6"/></div>
              <div className="relative z-10"><p className="text-[10px] font-black uppercase text-[#94A3B8] tracking-widest mb-1">Total Scans</p><p className="text-3xl font-black text-[#F7F9FC] drop-shadow-sm">{candidates.length}</p></div>
            </div>
            
            <div className="bg-[#242B3D]/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex items-center gap-5 relative overflow-hidden">
              <div className="w-14 h-14 rounded-xl bg-[#2FBF71]/20 backdrop-blur-md text-[#2FBF71] border border-[#2FBF71]/30 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(47,191,113,0.2)] relative z-10"><BarChart2 className="w-6 h-6"/></div>
              <div className="relative z-10"><p className="text-[10px] font-black uppercase text-[#94A3B8] tracking-widest mb-1">Avg Match</p><p className="text-3xl font-black text-[#F7F9FC] drop-shadow-sm">{avgMatch}%</p></div>
            </div>
            
            <div className="bg-[#242B3D]/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex items-center gap-5 relative overflow-hidden">
              <div className="w-14 h-14 rounded-xl bg-[#E85D75]/20 backdrop-blur-md text-[#E85D75] border border-[#E85D75]/30 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(232,93,117,0.2)] relative z-10 animate-pulse"><AlertTriangle className="w-6 h-6"/></div>
              <div className="relative z-10"><p className="text-[10px] font-black uppercase text-[#94A3B8] tracking-widest mb-1">Fraud Alerts</p><p className="text-3xl font-black text-[#F7F9FC] drop-shadow-sm">{fraudCount}</p></div>
            </div>
            
            <div className="bg-[#242B3D]/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] flex items-center gap-5 relative overflow-hidden">
              <div className="w-14 h-14 rounded-xl bg-[#F59E0B]/20 backdrop-blur-md text-[#F59E0B] border border-[#F59E0B]/30 flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(245,158,11,0.2)] relative z-10"><Target className="w-6 h-6"/></div>
              <div className="overflow-hidden relative z-10"><p className="text-[10px] font-black uppercase text-[#94A3B8] tracking-widest mb-1">Top Missing Skill</p><p className="text-lg font-black text-[#F7F9FC] truncate drop-shadow-sm" title={topSkill}>{topSkill}</p></div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
             <div className="w-12 h-12 border-4 border-[#2F6FED]/20 border-t-[#2F6FED] rounded-full animate-spin mb-6"></div>
             <p className="text-[#94A3B8] font-bold tracking-widest uppercase text-xs animate-pulse">Syncing Enterprise Database...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="bg-[#242B3D]/40 backdrop-blur-3xl rounded-3xl shadow-2xl border border-white/10 p-24 text-center animate-in fade-in zoom-in-95">
            <Inbox className="w-20 h-20 mx-auto mb-8 text-[#94A3B8]" />
            <h3 className="text-3xl font-black text-[#F7F9FC] mb-3">No Candidates Found</h3>
            <p className="text-[#94A3B8] mb-10 font-medium text-lg">Your ATS database is currently empty.</p>
            <button onClick={() => navigate('/candidate')} className="bg-[#2F6FED]/90 backdrop-blur-md border border-white/10 hover:bg-[#2563EB] text-white font-bold py-4 px-10 rounded-xl shadow-[0_0_30px_rgba(47,111,237,0.4)] transition-all active:scale-95">Go to Scanner Portal</button>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700">
            {viewMode === 'board' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                
                <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'review')} className="bg-[#242B3D]/30 backdrop-blur-2xl rounded-3xl p-5 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] min-h-[600px]">
                  <div className="flex items-center justify-between mb-6 px-2 border-b border-white/5 pb-4">
                    <h3 className="font-black text-[#F7F9FC] flex items-center gap-3 drop-shadow-sm">
                      <span className="w-3 h-3 rounded-full bg-[#F59E0B] shadow-[0_0_12px_rgba(245,158,11,0.9)]"></span> Review
                    </h3>
                    <span className="bg-[#1A1F2E]/80 backdrop-blur-md text-[#94A3B8] text-xs font-black px-3 py-1 rounded-full border border-white/5">{reviewNeeded.length}</span>
                  </div>
                  <div className="space-y-4">{reviewNeeded.map(c => <CandidateCard key={c.id} candidate={c} />)}</div>
                </div>

                <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'shortlisted')} className="bg-[#242B3D]/30 backdrop-blur-2xl rounded-3xl p-5 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] min-h-[600px]">
                  <div className="flex items-center justify-between mb-6 px-2 border-b border-white/5 pb-4">
                    <h3 className="font-black text-[#F7F9FC] flex items-center gap-3 drop-shadow-sm">
                      <span className="w-3 h-3 rounded-full bg-[#2FBF71] shadow-[0_0_12px_rgba(47,191,113,0.9)]"></span> Shortlist
                    </h3>
                    <span className="bg-[#1A1F2E]/80 backdrop-blur-md text-[#94A3B8] text-xs font-black px-3 py-1 rounded-full border border-white/5">{topMatches.length}</span>
                  </div>
                  <div className="space-y-4">{topMatches.map(c => <CandidateCard key={c.id} candidate={c} />)}</div>
                </div>

                <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'interview')} className="bg-[#242B3D]/30 backdrop-blur-2xl rounded-3xl p-5 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] min-h-[600px]">
                  <div className="flex items-center justify-between mb-6 px-2 border-b border-white/5 pb-4">
                    <h3 className="font-black text-[#F7F9FC] flex items-center gap-3 drop-shadow-sm">
                      <span className="w-3 h-3 rounded-full bg-[#8B5CF6] shadow-[0_0_12px_rgba(139,92,246,0.9)]"></span> Interview
                    </h3>
                    <span className="bg-[#1A1F2E]/80 backdrop-blur-md text-[#94A3B8] text-xs font-black px-3 py-1 rounded-full border border-white/5">{interviewing.length}</span>
                  </div>
                  <div className="space-y-4">{interviewing.map(c => <CandidateCard key={c.id} candidate={c} />)}</div>
                </div>

                <div onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'archived')} className="bg-[#242B3D]/20 backdrop-blur-xl rounded-3xl p-5 border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.2)] min-h-[600px] opacity-70 hover:opacity-100 transition-opacity">
                  <div className="flex items-center justify-between mb-6 px-2 border-b border-white/5 pb-4">
                    <h3 className="font-black text-[#94A3B8] flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-[#94A3B8] shadow-[0_0_10px_rgba(148,163,184,0.5)]"></span> Archive
                    </h3>
                    <span className="bg-[#1A1F2E]/80 backdrop-blur-md text-[#94A3B8] text-xs font-black px-3 py-1 rounded-full border border-white/5">{archived.length}</span>
                  </div>
                  <div className="space-y-4">{archived.map(c => <CandidateCard key={c.id} candidate={c} />)}</div>
                </div>

              </div>
            )}

            {viewMode === 'list' && (
              <div className="bg-[#242B3D]/30 backdrop-blur-2xl rounded-3xl border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col">
                <div className="grid grid-cols-12 gap-4 p-5 border-b border-white/5 bg-[#1A1F2E]/80 text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">
                  <div className="col-span-5 md:col-span-4">Candidate File</div>
                  <div className="col-span-3 md:col-span-2">Pipeline Status</div>
                  <div className="col-span-4 md:col-span-2">Match Score</div>
                  <div className="hidden md:block md:col-span-3">Key Metrics</div>
                  <div className="hidden md:block md:col-span-1 text-right">Action</div>
                </div>
                
                <div className="divide-y divide-white/5 max-h-[800px] overflow-y-auto custom-scrollbar">
                  {candidates.sort((a, b) => b.final_score - a.final_score).map(candidate => {
                    const score = candidate.final_score || 0;
                    const barColor = score >= 75 ? 'bg-[#2FBF71]' : score >= 50 ? 'bg-[#F59E0B]' : 'bg-[#94A3B8]';
                    const statusColor = candidate.pipeline_status === 'shortlisted' ? 'text-[#2FBF71] bg-[#2FBF71]/10 border-[#2FBF71]/30' : candidate.pipeline_status === 'interview' ? 'text-[#8B5CF6] bg-[#8B5CF6]/10 border-[#8B5CF6]/30' : candidate.pipeline_status === 'review' ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30' : 'text-[#94A3B8] bg-[#1A1F2E]/80 border-white/5';
                    const statusText = candidate.pipeline_status === 'shortlisted' ? 'SHORTLISTED' : candidate.pipeline_status === 'interview' ? 'INTERVIEW' : candidate.pipeline_status === 'review' ? 'REVIEW NEEDED' : 'ARCHIVED';
                    
                    let fraudAlert = null;
                    if (candidate.filename.includes('[FRAUD]') || candidate.filename.includes('🔒')) fraudAlert = "MANUAL REVIEW";
                    else if (parseFloat(candidate.lexical_score || 0) > parseFloat(candidate.semantic_score || 0) + 0.3) fraudAlert = "MANIPULATION RISK";

                    const topSkill = candidate.matched_skills ? candidate.matched_skills.split(',')[0].trim() : (parseFloat(candidate.skill_overlap_score || 0) >= 0.5 ? 'Tech Verified' : 'Review Skills');

                    return (
                      <div key={candidate.id} onClick={() => openDeepDive(candidate)} className="grid grid-cols-12 gap-4 p-5 items-center hover:bg-[#2F6FED]/10 transition-colors cursor-pointer group">
                        
                        <div className="col-span-5 md:col-span-4 flex items-center gap-4 overflow-hidden">
                          <div className={`w-10 h-10 rounded-xl flex shrink-0 items-center justify-center shadow-inner border backdrop-blur-md ${candidate.filename.includes('🔒') ? 'bg-[#2F6FED]/20 text-[#2F6FED] border-[#2F6FED]/30' : 'bg-[#1A1F2E]/80 text-[#94A3B8] border-white/5'}`}>
                            {candidate.filename.includes('🔒') ? <ShieldCheck className="w-5 h-5"/> : <FileText className="w-5 h-5"/>}
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-sm font-bold text-[#F7F9FC] truncate group-hover:text-[#2F6FED] transition-colors">{candidate.filename.replace('🔒 Anonymous_Candidate_', 'Candidate_').replace('.pdf', '')}</h4>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-[#94A3B8] mt-0.5">Job #{candidate.job_id}</p>
                          </div>
                        </div>

                        <div className="col-span-3 md:col-span-2 flex items-center">
                          <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black shadow-sm border backdrop-blur-md flex items-center gap-1 ${statusColor}`}>
                            {statusText} {candidate.is_human_overridden && <Hand className="w-3 h-3 ml-1"/>}
                          </span>
                        </div>

                        <div className="col-span-4 md:col-span-2 flex flex-col justify-center pr-4">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className={`text-xs font-black ${score >= 75 ? 'text-[#2FBF71]' : score >= 50 ? 'text-[#F59E0B]' : 'text-[#94A3B8]'}`}>{score.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#1A1F2E]/80 rounded-full overflow-hidden shadow-inner border border-white/5">
                            <div className={`h-full rounded-full ${barColor} shadow-[0_0_8px_currentColor]`} style={{ width: `${score}%` }}></div>
                          </div>
                        </div>

                        <div className="hidden md:flex md:col-span-3 gap-2">
                          <div className="flex-1 bg-[#1A1F2E]/60 p-2 rounded-lg border border-white/5 shadow-inner">
                            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-0.5">Experience</p>
                            <p className="text-xs font-black text-[#F7F9FC]">{candidate.total_yoe || 0} Yrs</p>
                          </div>
                          <div className="flex-1 bg-[#1A1F2E]/60 p-2 rounded-lg border border-white/5 shadow-inner overflow-hidden">
                            <p className="text-[10px] text-[#94A3B8] font-bold uppercase tracking-wider mb-0.5">Top Skill</p>
                            <p className="text-xs font-black text-[#2F6FED] truncate">{topSkill}</p>
                          </div>
                        </div>

                        <div className="hidden md:flex md:col-span-1 justify-end items-center gap-3">
                          {fraudAlert && <AlertTriangle className="w-5 h-5 text-[#E85D75] animate-pulse" title={fraudAlert}/>}
                          <button className="w-8 h-8 rounded-full bg-[#1A1F2E] border border-white/5 text-[#94A3B8] group-hover:bg-[#2F6FED]/20 group-hover:text-[#2F6FED] group-hover:border-[#2F6FED]/30 transition-all flex items-center justify-center shadow-sm">
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/70 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#242B3D]/80 backdrop-blur-3xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.6)] border border-white/10 w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-start bg-[#1A1F2E]/40 backdrop-blur-md">
              <div>
                <span className="px-3 py-1.5 bg-[#2F6FED]/20 backdrop-blur-md text-[#2F6FED] border border-[#2F6FED]/30 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 inline-flex items-center gap-2 shadow-sm">
                  Intelligence Report • Job #{selectedCandidate.job_id}
                  {selectedCandidate.is_human_overridden && <span className="bg-[#2F6FED] text-white px-2 py-0.5 rounded-md ml-2 flex items-center gap-1"><Hand className="w-3 h-3"/> Override Active</span>}
                </span>
                <h2 className="text-3xl font-black text-[#F7F9FC] leading-tight flex items-center gap-3 drop-shadow-sm">
                  {selectedCandidate.filename.includes('🔒') ? <ShieldCheck className="w-8 h-8 text-[#2F6FED]" /> : <FileText className="w-8 h-8 text-[#94A3B8]" />} 
                  {selectedCandidate.filename.replace('🔒 Anonymous_Candidate_', 'Candidate_')}
                </h2>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="w-10 h-10 bg-[#1A1F2E]/50 hover:bg-white/10 text-[#94A3B8] hover:text-[#F7F9FC] rounded-full flex items-center justify-center transition-colors font-bold border border-white/5 backdrop-blur-md"><X className="w-5 h-5"/></button>
            </div>

            <div className="flex-1 bg-transparent flex flex-col md:flex-row overflow-hidden">
              <div className="p-8 flex-1 border-r border-white/5 overflow-y-auto custom-scrollbar">
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-[#242B3D]/50 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-lg text-center">
                    <p className="text-[10px] font-black uppercase text-[#94A3B8] tracking-widest mb-2">Total Match</p>
                    <p className={`text-4xl font-black drop-shadow-md ${selectedCandidate.final_score >= 75 ? 'text-[#2FBF71]' : selectedCandidate.final_score >= 50 ? 'text-[#F59E0B]' : 'text-[#94A3B8]'}`}>{selectedCandidate.final_score.toFixed(1)}%</p>
                  </div>
                  <div className="bg-[#242B3D]/50 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-lg text-center">
                    <p className="text-[10px] font-black uppercase text-[#94A3B8] tracking-widest mb-2">Contextual Exp. (Semantic)</p>
                    <p className="text-3xl font-black text-[#2F6FED] drop-shadow-md">{(selectedCandidate.semantic_score * 100).toFixed(1)}%</p>
                  </div>
                </div>

                <div className="bg-[#242B3D]/50 backdrop-blur-md p-8 rounded-3xl border border-white/5 shadow-lg flex flex-col items-center justify-center mb-8">
                  <h3 className="text-sm font-black text-[#F7F9FC] uppercase tracking-widest mb-8 drop-shadow-sm">Explainable AI Vectors</h3>
                  <div className="bg-[#1A1F2E]/60 backdrop-blur-md p-6 md:p-8 w-full max-w-lg rounded-3xl border border-white/5 shadow-inner">
                    <XAIDial featureBreakdown={{ skill_overlap_score: selectedCandidate.skill_overlap_score, semantic_score: selectedCandidate.semantic_score, lexical_score: selectedCandidate.lexical_score }} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-[#2FBF71]/5 backdrop-blur-md p-6 rounded-3xl border border-[#2FBF71]/20 shadow-inner">
                    <h4 className="text-xs font-black uppercase text-[#2FBF71] tracking-widest mb-4 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Key Strengths
                    </h4>
                    <ul className="space-y-3">
                      {getCandidateInsights(selectedCandidate).strengths.map((str, idx) => (
                        <li key={idx} className="text-sm text-[#F7F9FC] flex items-start gap-2">
                          <span className="text-[#2FBF71] mt-0.5 shrink-0">•</span> <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="bg-[#E85D75]/5 backdrop-blur-md p-6 rounded-3xl border border-[#E85D75]/20 shadow-inner">
                    <h4 className="text-xs font-black uppercase text-[#E85D75] tracking-widest mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Areas of Concern
                    </h4>
                    <ul className="space-y-3">
                      {getCandidateInsights(selectedCandidate).concerns.map((con, idx) => (
                        <li key={idx} className="text-sm text-[#F7F9FC] flex items-start gap-2">
                          <span className="text-[#E85D75] mt-0.5 shrink-0">•</span> <span>{con}</span>
                        </li>
                      ))}
                      {getCandidateInsights(selectedCandidate).concerns.length === 0 && (
                        <li className="text-sm text-[#94A3B8] italic">No major red flags detected.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {interviewGuide && (
                  <div className="bg-[#242B3D]/80 backdrop-blur-xl p-8 rounded-3xl border border-[#8B5CF6]/30 shadow-[0_8px_30px_rgba(139,92,246,0.15)] animate-in slide-in-from-bottom-4 mt-8">
                    <h4 className="text-sm font-black uppercase text-[#8B5CF6] tracking-widest mb-6 flex items-center gap-2 drop-shadow-sm">
                      <Bot className="w-5 h-5"/> AI Generated Interview Guide
                    </h4>
                    <div className="prose prose-sm prose-invert max-w-none prose-headings:text-[#F7F9FC] prose-strong:text-[#F7F9FC] prose-li:text-[#94A3B8] prose-p:leading-relaxed prose-p:text-[#94A3B8] prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-li:marker:text-[#2F6FED]">
                      <ReactMarkdown>{interviewGuide}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full md:w-96 bg-[#242B3D]/30 backdrop-blur-md p-8 flex flex-col border-l border-white/5 overflow-y-auto custom-scrollbar">
                <div className="mb-6">
                  <h3 className="text-xl font-black text-[#F7F9FC] flex items-center gap-3 drop-shadow-sm"><PenTool className="w-5 h-5"/> Human Evaluation</h3>
                  <p className="text-[#94A3B8] text-xs font-bold uppercase tracking-widest mt-2 border-l-2 border-[#2F6FED] pl-3">AI recommends. Recruiters decide.</p>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <textarea 
                    value={recruiterNote} 
                    onChange={(e) => setRecruiterNote(e.target.value)} 
                    placeholder="Enter manual recruiter notes here..." 
                    className="flex-1 w-full p-5 rounded-2xl border border-white/5 bg-[#1A1F2E]/50 backdrop-blur-md text-[#F7F9FC] placeholder:text-[#94A3B8] focus:bg-[#1A1F2E]/80 focus:ring-2 focus:ring-[#2F6FED]/50 outline-none transition-all text-sm resize-none shadow-inner mb-3 min-h-[120px]" 
                  />
                  
                  <button 
                    onClick={handleSaveNote} 
                    disabled={savingNote || recruiterNote === (selectedCandidate.recruiter_notes || '')} 
                    className="mb-6 w-full bg-[#2F6FED]/90 backdrop-blur-md border border-white/10 hover:bg-[#2563EB] text-white font-black tracking-widest py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(47,111,237,0.3)] active:scale-95 disabled:opacity-50 disabled:shadow-none text-xs"
                  >
                    {savingNote ? "SAVING..." : "SAVE NOTES"}
                  </button>
                  
                  <div className="space-y-3 border-b border-white/10 pb-6 mb-6">
                    <button onClick={() => handleStatusChange(selectedCandidate.id, 'shortlisted')} className="w-full bg-[#2FBF71]/10 hover:bg-[#2FBF71] text-[#2FBF71] hover:text-white border border-[#2FBF71]/30 font-black tracking-wide py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(47,191,113,0.15)] active:scale-95 flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4"/> Move to Shortlist
                    </button>

                    <button onClick={() => handleStatusChange(selectedCandidate.id, 'interview')} className="w-full bg-[#8B5CF6]/10 hover:bg-[#8B5CF6] text-[#8B5CF6] hover:text-white border border-[#8B5CF6]/30 font-black tracking-wide py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(139,92,246,0.15)] active:scale-95 flex items-center justify-center gap-2">
                      <Calendar className="w-4 h-4"/> Move to Interview
                    </button>
                    
                    <button onClick={() => handleStatusChange(selectedCandidate.id, 'review')} className="w-full bg-[#F59E0B]/10 hover:bg-[#F59E0B] text-[#F59E0B] hover:text-white border border-[#F59E0B]/30 font-black tracking-wide py-3.5 rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.15)] active:scale-95 flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4"/> Mark for Review
                    </button>
                    
                    <button onClick={() => handleStatusChange(selectedCandidate.id, 'archived')} className="w-full bg-[#1A1F2E]/80 hover:bg-white/10 text-[#94A3B8] hover:text-[#F7F9FC] border border-white/10 font-black tracking-wide py-3.5 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
                      <Inbox className="w-4 h-4"/> Move to Archive
                    </button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase text-[#94A3B8] tracking-widest flex items-center gap-2 mb-2">
                      <Mail className="w-3 h-3"/> Outreach Actions
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => handleOutreach('invite')} className="w-full bg-[#2FBF71]/10 hover:bg-[#2FBF71]/20 text-[#2FBF71] border border-[#2FBF71]/30 font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-[11px]">
                        Draft Invite
                      </button>
                      <button onClick={() => handleOutreach('reject')} className="w-full bg-[#E85D75]/10 hover:bg-[#E85D75]/20 text-[#E85D75] border border-[#E85D75]/30 font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-95 text-[11px]">
                        Draft Rejection
                      </button>
                    </div>

                    <button onClick={handleGenerateInterview} disabled={generatingInterview} className="w-full mt-2 bg-[#242B3D]/80 hover:bg-[#8B5CF6]/20 text-[#F7F9FC] hover:text-[#8B5CF6] border border-[#8B5CF6]/30 font-black tracking-wide py-4 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 text-[11px]">
                      {generatingInterview ? "GENERATING QUESTIONS..." : <><Bot className="w-4 h-4"/> GENERATE INTERVIEW GUIDE</>}
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => setGlobalChatOpen(!globalChatOpen)} className="fixed bottom-8 right-8 w-16 h-16 bg-[#2F6FED]/90 backdrop-blur-md border border-white/20 hover:bg-[#2563EB] text-white rounded-full shadow-[0_10px_30px_rgba(47,111,237,0.6)] hover:shadow-[0_15px_40px_rgba(47,111,237,0.8)] flex items-center justify-center transition-all duration-300 ease-out hover:scale-110 active:scale-95 z-40">
        <Bot className="w-8 h-8" />
      </button>

      {globalChatOpen && (
        <div className="fixed bottom-32 right-8 w-[400px] bg-[#242B3D]/70 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden z-50 flex flex-col h-[600px] animate-in slide-in-from-bottom-8 duration-300">
          
          <div className="bg-[#1A1F2E]/60 backdrop-blur-md p-5 text-white flex flex-col border-b border-white/5 shadow-md z-30 relative">
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-t-3xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#2F6FED]/20 rounded-full blur-2xl"></div>
            </div>
            <div className="flex justify-between items-center mb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#2F6FED]/30 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(47,111,237,0.3)]"><Bot className="w-6 h-6 text-[#2F6FED]"/></div>
                <div>
                  <h3 className="font-black text-base text-[#F7F9FC] leading-tight drop-shadow-sm">Global ATS Copilot</h3>
                  <p className="text-[10px] text-[#2F6FED] font-black uppercase tracking-widest mt-0.5 drop-shadow-sm">Bulk Filtering Mode</p>
                </div>
              </div>
              <button onClick={() => setGlobalChatOpen(false)} className="text-[#94A3B8] hover:text-[#F7F9FC] transition-colors w-8 h-8 flex items-center justify-center bg-[#242B3D]/80 backdrop-blur-md rounded-full hover:bg-white/10 border border-white/5"><X className="w-4 h-4"/></button>
            </div>
            
            <div className="relative z-20">
              <CustomDropdown value={chatJobId} onChange={setChatJobId} options={[{ value: "", label: "Search Entire Company Database" }, ...dbJobs.map(job => ({ value: job.id, label: `Role: ${job.title} (Job #${job.id})` }))]} placeholder="Search Entire Company Database" />
            </div>
          </div>

          <div className="flex-1 p-6 overflow-y-auto bg-transparent space-y-5 custom-scrollbar">
            {globalChatHistory.length === 0 ? (
              <div className="text-center text-[#94A3B8] mt-6 px-2 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-[#242B3D]/80 backdrop-blur-md rounded-full shadow-lg border border-white/5 flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8"/></div>
                <p className="font-black text-[#F7F9FC] text-lg mb-2 drop-shadow-sm">Query your Talent Pool</p>
                <p className="text-sm font-medium leading-relaxed mb-6">Select a job role above to filter, then click a prompt or ask me to shortlist candidates.</p>
                
                <div className="text-left border-t border-white/10 pt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-[#94A3B8] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#2F6FED]"></span> Quick Actions
                  </p>
                  <div className="flex flex-col gap-2">
                    {["Show me the top 3 candidates", "Who has the highest experience?", "Find candidates with AWS skills", "Show candidates flagged for fraud"].map((prompt, i) => (
                      <button key={i} onClick={() => { setGlobalChatInput(prompt); }} className="text-xs font-bold text-left bg-[#1A1F2E]/60 hover:bg-[#2F6FED]/20 hover:text-[#2F6FED] border border-white/5 hover:border-[#2F6FED]/30 transition-all px-4 py-2.5 rounded-xl text-[#F7F9FC] shadow-sm backdrop-blur-md">
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              globalChatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-sm shadow-md prose prose-sm prose-li:my-0 prose-strong:text-[#F7F9FC] prose-p:leading-relaxed prose-p:my-2 prose-li:my-1 prose-ul:my-2 prose-li:marker:text-[#2F6FED] backdrop-blur-md border border-white/5 ${msg.role === 'user' ? 'bg-[#2F6FED]/90 text-white rounded-br-sm font-medium' : 'bg-[#242B3D]/80 text-[#F7F9FC] rounded-bl-sm prose-p:text-[#F7F9FC]'}`}>
                    {msg.role === 'ai' ? <ReactMarkdown>{String(msg.content)}</ReactMarkdown> : msg.content}
                  </div>
                </div>
              ))
            )}
            {globalChatLoading && (
              <div className="flex justify-start">
                 <div className="px-5 py-4 rounded-2xl bg-[#242B3D]/80 backdrop-blur-md border border-white/5 text-[#94A3B8] flex items-center gap-2 rounded-bl-sm shadow-md">
                    <span className="w-2 h-2 bg-[#2F6FED] rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-[#2F6FED] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                    <span className="w-2 h-2 bg-[#2F6FED] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                 </div>
              </div>
            )}
            <div ref={globalChatEndRef} />
          </div>

          <form onSubmit={handleGlobalChat} className="p-5 bg-[#1A1F2E]/60 backdrop-blur-md border-t border-white/5 flex gap-3">
            <input type="text" value={globalChatInput} onChange={(e) => setGlobalChatInput(e.target.value)} placeholder="Filter candidates..." className="flex-1 px-4 py-3 bg-[#242B3D]/50 backdrop-blur-md text-[#F7F9FC] border border-white/5 rounded-xl text-sm font-medium focus:outline-none focus:bg-[#242B3D]/80 focus:ring-2 focus:ring-[#2F6FED]/50 transition-all placeholder:text-[#94A3B8]" disabled={globalChatLoading} />
            <button type="submit" disabled={globalChatLoading || !globalChatInput.trim()} className="bg-[#2F6FED]/90 backdrop-blur-md border border-white/10 text-white w-12 h-12 flex items-center justify-center rounded-xl font-bold hover:bg-[#2563EB] disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(47,111,237,0.3)] active:scale-95 disabled:shadow-none"><ArrowRight className="w-5 h-5"/></button>
          </form>
        </div>
      )}
    </div>
  );
}

export default HrDashboard;