import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useReactToPrint } from 'react-to-print';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { useDropzone } from 'react-dropzone';
import { useLocation, useNavigate } from 'react-router-dom';
import 'react-circular-progressbar/dist/styles.css';
import XAIDial from '../components/XAIDial';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function CustomDropdown({ value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options?.find(opt => String(opt.value) === String(value));
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div className="relative w-full">
      <div onClick={() => setIsOpen(!isOpen)} className="w-full px-4 py-3.5 rounded-xl border border-white/5 bg-[#1A1F2E]/60 backdrop-blur-md text-[#F7F9FC] hover:bg-[#1A1F2E]/80 transition-all text-sm font-medium shadow-inner flex justify-between items-center cursor-pointer">
        <span className="truncate">{displayLabel}</span>
        <span className="text-xs text-[#94A3B8] transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
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

function CandidateDashboard() {
  const location = useLocation(); 
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'recruiter');
  
  const toggleRole = () => {
    const newRole = userRole === 'recruiter' ? 'candidate' : 'recruiter';
    setUserRole(newRole); localStorage.setItem('userRole', newRole); setResultTab('overview'); 
  };

  const [uploadMode, setUploadMode] = useState('single');
  const [blindMode, setBlindMode] = useState(false); 
  const [file, setFile] = useState(null);
  const reportRef = useRef();
  
  const [jdMode, setJdMode] = useState('saved'); 
  const [jd, setJd] = useState('');
  const [jdFile, setJdFile] = useState(null);
  
  const [dbJobs, setDbJobs] = useState([]);
  const [selectedSavedJobId, setSelectedSavedJobId] = useState('');
  
  const [singleResults, setSingleResults] = useState(null);
  const [bulkResults, setBulkResults] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [tailorLoading, setTailorLoading] = useState(false);
  const [tailorData, setTailorData] = useState(null);
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterText, setCoverLetterText] = useState('');
  
  const [chatHistory, setChatHistory] = useState([]);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  const [resultTab, setResultTab] = useState('overview');

  // --- AUTO REDIRECT TIMERS ---
  const [autoRedirect, setAutoRedirect] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(10);

  useEffect(() => { fetchJobs(); }, []);
  
  useEffect(() => {
    if (location.state?.selectedJobId && dbJobs.length > 0) { 
      setSelectedSavedJobId(location.state.selectedJobId); 
      setJdMode('saved'); 
    }
  }, [location.state, dbJobs]);

  useEffect(() => {
    let interval;
    if (bulkResults && autoRedirect && redirectCountdown > 0) {
      interval = setInterval(() => setRedirectCountdown(prev => prev - 1), 1000);
    } else if (redirectCountdown === 0 && autoRedirect) {
      navigate('/hr');
    }
    return () => clearInterval(interval);
  }, [bulkResults, autoRedirect, redirectCountdown, navigate]);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jobs`);
      setDbJobs(response.data.data || []);
      if (response.data.data?.length > 0 && !selectedSavedJobId && !location.state?.selectedJobId) {
        setSelectedSavedJobId(response.data.data[0].id);
      }
    } catch (err) { console.error("Failed to fetch jobs", err); }
  };

  const onDrop = useCallback(acceptedFiles => { if (acceptedFiles?.length > 0) setFile(acceptedFiles[0]); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: uploadMode === 'single' ? { 'application/pdf': ['.pdf'] } : { 'application/zip': ['.zip', 'application/x-zip-compressed'] }, multiple: false });

  const onJdDrop = useCallback(acceptedFiles => { if (acceptedFiles?.length > 0) setJdFile(acceptedFiles[0]); }, []);
  const { getRootProps: getJdRootProps, getInputProps: getJdInputProps, isJdDragActive } = useDropzone({ onDrop: onJdDrop, accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] }, multiple: false });

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please provide a Candidate file.");
    if (jdMode === 'text' && !jd) return setError("Please paste a Job Description.");
    if (jdMode === 'file' && !jdFile) return setError("Please upload a Job Description file.");

    setLoading(true); setError(''); setSingleResults(null); setBulkResults(null); setTailorData(null); setCoverLetterText(''); setChatHistory([]); setResultTab('overview');

    const formData = new FormData();
    formData.append(uploadMode === 'single' ? 'resume_file' : 'resume_zip', file);
    formData.append('blind_mode', blindMode);
    
    if (jdMode === 'saved') {
      const selectedJob = dbJobs.find(j => String(j.id) === String(selectedSavedJobId));
      formData.append('job_description_text', selectedJob ? selectedJob.description_text : '');
      formData.append('job_id', selectedSavedJobId); 
    } else if (jdMode === 'text') {
      formData.append('job_description_text', jd);
    } else {
      formData.append('job_description_file', jdFile);
    }

    try {
      const endpoint = uploadMode === 'single' ? `${API_BASE_URL}/analyze` : `${API_BASE_URL}/analyze-bulk`;
      const response = await axios.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      if (uploadMode === 'single') {
        setSingleResults(response.data.data); 
      } else {
        setBulkResults(response.data.data);
        setAutoRedirect(true);
        setRedirectCountdown(10);
      }
    } catch (err) {
      let errorMsg = "An error occurred during analysis.";
      if (err.response?.data?.detail) errorMsg = typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail);
      else if (err.message) errorMsg = err.message;
      setError(errorMsg);
    } finally { setLoading(false); }
  };

  const handleTailor = async () => { 
    setTailorLoading(true); setTailorData(null); 
    const formData = new FormData(); formData.append('resume_file', file); formData.append('job_description', singleResults?.cleaned_jd || jd); 
    try { 
      const response = await axios.post(`${API_BASE_URL}/tailor`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); 
      setTailorData({ text: response.data.tailored_resume, newScore: response.data.new_score, oldScore: singleResults.final_match_score_percentage });
    } catch (err) { alert("Failed to optimize resume"); } finally { setTailorLoading(false); } 
  };

  const handleGenerateCoverLetter = async () => { 
    setCoverLetterLoading(true); setCoverLetterText(''); 
    const formData = new FormData(); formData.append('resume_file', file); formData.append('job_description', singleResults?.cleaned_jd || jd); 
    try { 
      const response = await axios.post(`${API_BASE_URL}/generate-cover-letter`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); 
      setCoverLetterText(response.data.cover_letter); 
    } catch (err) { alert("Failed to write letter"); } finally { setCoverLetterLoading(false); } 
  };
  
  const handleChat = async (e) => { 
    e.preventDefault(); 
    if (!chatQuestion.trim()) return; 
    const newQuestion = chatQuestion; 
    setChatHistory(prev => [...prev, { role: 'user', content: newQuestion }]); 
    setChatQuestion(''); setChatLoading(true); 
    const formData = new FormData(); formData.append('resume_file', file); formData.append('question', newQuestion); 
    try { 
      const response = await axios.post(`${API_BASE_URL}/chat-resume`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); 
      setChatHistory(prev => [...prev, { role: 'ai', content: String(response?.data?.answer || "Sorry, I received an empty response from the database.") }]); 
    } catch (err) { 
      setChatHistory(prev => [...prev, { role: 'ai', content: "⚠️ Failed to reach AI backend." }]); 
    } finally { setChatLoading(false); } 
  };

  const getCandidateInsights = (results) => {
    if (!results || !results.feature_breakdown) return { strengths: [], concerns: [] };
    const strengths = [];
    const concerns = [];
    const semantic = parseFloat(results.feature_breakdown.semantic_score || 0);
    const lexical = parseFloat(results.feature_breakdown.lexical_score || 0);
    const skills = parseFloat(results.feature_breakdown.skill_overlap_score || 0);

    if (skills >= 0.7) strengths.push("Strong technical tool and skill alignment.");
    if (semantic >= 0.6) strengths.push("High contextual experience for this role.");
    if (lexical < 0.2 && semantic > 0.5) strengths.push("Authentic phrasing (Excellent vocabulary variance).");
    if (results.yoe >= 3) strengths.push(`${results.yoe} years experience aligns well.`);

    const missingSkills = results.skill_analysis?.jd_skills_detected?.filter(s => !results.skill_analysis?.common_skills?.includes(s)) || [];
    if (missingSkills.length > 0) concerns.push(`Missing key requirements: ${missingSkills.slice(0,3).join(', ')}`);
    if (skills < 0.4) concerns.push("Severe gap in required technical skills.");
    if (semantic < 0.3 && skills > 0.5) concerns.push("Domain mismatch: Has skills, but applied in a different context.");
    if (lexical > (semantic + 0.3)) concerns.push("ATS Manipulation Risk: High exact keyword match suggests resume stuffing.");

    if (strengths.length === 0) strengths.push("Meets baseline ATS requirements.");

    return { strengths, concerns };
  };

  const handleDownloadReport = useReactToPrint({ contentRef: reportRef, documentTitle: singleResults ? `${singleResults.processed_filename.replace('.pdf', '')}_AI_Report` : 'AI_Report' });
  const missingSkills = singleResults?.skill_analysis?.jd_skills_detected ? singleResults.skill_analysis.jd_skills_detected.filter(skill => !singleResults.skill_analysis.common_skills?.includes(skill)) : [];
  const innerTabStyle = (isActive) => `flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all whitespace-nowrap text-center backdrop-blur-md ${isActive ? 'bg-[#1A1F2E]/60 text-[#2F6FED] shadow-sm border border-white/10' : 'text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#374151]/30 border border-transparent'}`;
  
  // --- BULK PRE-COMPUTATIONS ---
  const bulkAvgMatch = bulkResults && bulkResults.length > 0 ? (bulkResults.reduce((sum, c) => sum + c.score, 0) / bulkResults.length).toFixed(1) : 0;
  const bulkFraudCount = bulkResults ? bulkResults.filter(c => c.filename.includes('[FRAUD]')).length : 0;

  return (
    <div className="min-h-screen bg-[#1A1F2E] text-[#F7F9FC] pt-6 pb-20 relative overflow-x-hidden font-sans selection:bg-[#2F6FED]/30">
      
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#242B3D_1px,transparent_1px),linear-gradient(to_bottom,#242B3D_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#2F6FED]/15 blur-[150px] rounded-full pointer-events-none mix-blend-screen"></div>
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-[#2FBF71]/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2F6FED]/10 backdrop-blur-md border border-[#2F6FED]/30 text-[#2F6FED] text-[10px] font-black tracking-widest uppercase mb-4 shadow-sm">
              🔍 Intelligence Scanner
            </div>
            <h2 className="text-4xl font-black text-[#F7F9FC] tracking-tight drop-shadow-sm">Analysis Portal</h2>
            <p className="text-[#94A3B8] font-medium mt-2">Upload candidate documents to run multi-vector contextual analysis.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-[#242B3D]/60 backdrop-blur-xl p-1.5 rounded-xl border border-white/10 shadow-lg">
            <button onClick={toggleRole} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all backdrop-blur-md ${userRole === 'candidate' ? 'bg-[#2F6FED]/90 border border-white/10 text-white shadow-[0_0_15px_rgba(47,111,237,0.4)]' : 'text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#1A1F2E]/50 border border-transparent'}`}>🎓 Candidate View</button>
            <button onClick={toggleRole} className={`px-5 py-2 rounded-lg text-sm font-bold transition-all backdrop-blur-md ${userRole === 'recruiter' ? 'bg-[#2F6FED]/90 border border-white/10 text-white shadow-[0_0_15px_rgba(47,111,237,0.4)]' : 'text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#1A1F2E]/50 border border-transparent'}`}>🏢 HR View</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
          
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#242B3D]/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 p-8 sticky top-24">
              <form onSubmit={handleAnalyze}>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Candidate File</label>
                    <div className="inline-flex bg-[#1A1F2E]/80 backdrop-blur-md p-1 rounded-lg border border-white/5">
                      <button type="button" onClick={() => {setUploadMode('single'); setFile(null);}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${uploadMode === 'single' ? 'bg-[#242B3D]/80 text-[#2F6FED] shadow-sm border border-white/10' : 'text-[#94A3B8] hover:text-[#F7F9FC]'}`}>PDF</button>
                      <button type="button" onClick={() => {setUploadMode('bulk'); setFile(null);}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${uploadMode === 'bulk' ? 'bg-[#242B3D]/80 text-[#2F6FED] shadow-sm border border-white/10' : 'text-[#94A3B8] hover:text-[#F7F9FC]'}`}>ZIP</button>
                    </div>
                  </div>

                  <div {...getRootProps()} className={`relative group flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all backdrop-blur-md ${isDragActive ? 'border-[#2F6FED] bg-[#2F6FED]/20' : 'border-white/10 bg-[#1A1F2E]/40 hover:border-[#2F6FED]/50 hover:bg-[#2F6FED]/10'}`}>
                    <input {...getInputProps()} />
                    {file ? (
                      <div className="flex items-center gap-4 w-full animate-in fade-in zoom-in duration-300">
                        <span className="text-3xl drop-shadow-md">📄</span>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-bold text-[#F7F9FC] truncate drop-shadow-sm">{file.name}</p>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-[#2FBF71] mt-1">Ready for scan</p>
                        </div>
                        <button type="button" className="w-8 h-8 flex items-center justify-center bg-[#E85D75]/20 hover:bg-[#E85D75]/40 rounded-full text-[#E85D75] transition-colors border border-[#E85D75]/30" onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform drop-shadow-lg">📂</div>
                        <p className="text-xs font-bold text-[#94A3B8]">{isDragActive ? "Drop file here!" : `Drag & drop ${uploadMode === 'single' ? '.pdf' : '.zip'}`}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">Target Role</label>
                    <div className="inline-flex bg-[#1A1F2E]/80 backdrop-blur-md p-1 rounded-lg border border-white/5">
                      <button type="button" onClick={() => setJdMode('saved')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jdMode === 'saved' ? 'bg-[#242B3D]/80 text-[#2F6FED] shadow-sm border border-white/10' : 'text-[#94A3B8] hover:text-[#F7F9FC]'}`}>DB</button>
                      <button type="button" onClick={() => {setJdMode('text'); setJdFile(null);}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jdMode === 'text' ? 'bg-[#242B3D]/80 text-[#2F6FED] shadow-sm border border-white/10' : 'text-[#94A3B8] hover:text-[#F7F9FC]'}`}>Text</button>
                      <button type="button" onClick={() => {setJdMode('file'); setJd('');}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jdMode === 'file' ? 'bg-[#242B3D]/80 text-[#2F6FED] shadow-sm border border-white/10' : 'text-[#94A3B8] hover:text-[#F7F9FC]'}`}>File</button>
                    </div>
                  </div>

                  {jdMode === 'saved' ? (
                    <div className="relative z-30">
                      <CustomDropdown 
                        value={selectedSavedJobId} 
                        onChange={setSelectedSavedJobId} 
                        options={dbJobs.map(job => ({ value: job.id, label: job.title }))} 
                        placeholder="Select a target role..."
                      />
                    </div>
                  ) : jdMode === 'text' ? (
                    <textarea rows="4" placeholder="Paste the target JD..." value={jd} onChange={(e) => setJd(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-white/5 bg-[#1A1F2E]/60 backdrop-blur-md text-[#F7F9FC] placeholder:text-[#94A3B8] focus:bg-[#1A1F2E]/80 focus:ring-2 focus:ring-[#2F6FED]/50 outline-none transition-all text-sm custom-scrollbar shadow-inner" />
                  ) : (
                    <div {...getJdRootProps()} className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all backdrop-blur-md ${isJdDragActive ? 'border-[#2F6FED] bg-[#2F6FED]/20' : 'border-white/10 bg-[#1A1F2E]/40 hover:border-[#2F6FED]/50 hover:bg-[#2F6FED]/10'}`}>
                      <input {...getJdInputProps()} />
                      {jdFile ? (
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-2xl drop-shadow-md">🏢</span>
                          <p className="text-sm font-bold text-[#F7F9FC] truncate flex-1 drop-shadow-sm">{jdFile.name}</p>
                          <button type="button" className="text-[#E85D75] hover:text-red-300 font-bold p-1 bg-[#E85D75]/20 hover:bg-[#E85D75]/40 rounded-full w-6 h-6 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setJdFile(null); }}>✕</button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform drop-shadow-lg">🏢</span>
                          <p className="text-xs font-bold text-[#94A3B8]">Drop JD (.pdf, .png, .jpg)</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {userRole === 'recruiter' && (
                  <div onClick={() => setBlindMode(!blindMode)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all mb-8 backdrop-blur-md ${blindMode ? 'bg-[#2F6FED]/20 border-[#2F6FED]/50 ring-4 ring-[#2F6FED]/20 shadow-lg' : 'bg-[#1A1F2E]/50 border-white/5 hover:border-[#374151]'}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors shadow-sm border ${blindMode ? 'bg-[#2F6FED] border-[#2F6FED] text-white' : 'bg-[#242B3D]/80 border-white/10'}`}>
                      {blindMode && "✓"}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-bold ${blindMode ? 'text-[#2F6FED] drop-shadow-sm' : 'text-[#F7F9FC]'}`}>🛡️ Blind Hiring Mode</h4>
                      <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider mt-0.5">Strip Identifiable Info</p>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-[#2F6FED]/90 backdrop-blur-md hover:bg-[#2563EB] text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(47,111,237,0.3)] border border-white/10 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 tracking-wide">
                  {loading ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> ANALYZING...</> : "INITIATE SCAN"}
                </button>
              </form>
              
              {error && (
                <div className={`mt-6 p-4 rounded-xl text-sm font-bold animate-in zoom-in-95 border backdrop-blur-md ${error.includes('FRAUD') ? 'bg-[#E85D75]/20 text-[#E85D75] border-[#E85D75]/40' : 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40'}`}>
                  {error.includes('FRAUD') ? '🛑 ' : '⚠️ '} {error}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-8">
            {singleResults ? (
              <div className="bg-[#242B3D]/50 backdrop-blur-3xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                <div className="bg-[#1A1F2E]/60 backdrop-blur-md p-8 text-[#F7F9FC] flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden border-b border-white/5">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#2F6FED]/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                  <div className="relative z-10">
                    <span className="px-3 py-1.5 bg-[#2F6FED]/20 backdrop-blur-md text-[#2F6FED] border border-[#2F6FED]/30 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block shadow-sm">Intelligence Report</span>
                    <h2 className="text-3xl font-black mt-4 leading-tight text-[#F7F9FC] drop-shadow-sm">Analysis Complete</h2>
                    <p className="text-[#94A3B8] font-medium text-sm mt-2 flex items-center gap-2"><span className="text-lg">📄</span> {singleResults.processed_filename}</p>
                  </div>
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <button onClick={handleDownloadReport} className="flex items-center gap-2 bg-[#242B3D]/80 backdrop-blur-md hover:bg-white/10 text-[#F7F9FC] border border-white/10 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95">
                      <span className="text-lg">📥</span> Export
                    </button>

                    <div className="w-28 h-28 bg-[#242B3D]/80 backdrop-blur-md p-2 rounded-full border border-white/10 shadow-inner">
                      <CircularProgressbar 
                        value={singleResults.final_match_score_percentage} 
                        text={`${singleResults.final_match_score_percentage}%`} 
                        styles={buildStyles({
                          textSize: '24px', 
                          pathColor: singleResults.final_match_score_percentage >= 75 ? '#2FBF71' : singleResults.final_match_score_percentage >= 50 ? '#F59E0B' : '#E85D75', 
                          textColor: '#F7F9FC', 
                          trailColor: 'rgba(255,255,255,0.05)'
                        })} 
                      />
                    </div>
                  </div>
                </div>

                <div className="flex bg-[#242B3D]/30 backdrop-blur-md border-b border-white/5 overflow-x-auto hide-scrollbar p-2 gap-2">
                  <button onClick={() => setResultTab('overview')} className={innerTabStyle(resultTab === 'overview')}>📊 Overview</button>
                  <button onClick={() => setResultTab('skills')} className={innerTabStyle(resultTab === 'skills')}>🎯 Skills</button>
                  {userRole === 'recruiter' && (
                    <>
                      <button onClick={() => setResultTab('logic')} className={innerTabStyle(resultTab === 'logic')}>⚙️ AI Logic & Fraud</button>
                      <button onClick={() => setResultTab('chat')} className={innerTabStyle(resultTab === 'chat')}>🤖 RAG Copilot</button>
                    </>
                  )}
                  {userRole === 'candidate' && (
                    <>
                      <button onClick={() => setResultTab('coach')} className={innerTabStyle(resultTab === 'coach')}>✨ Coach</button>
                      <button onClick={() => setResultTab('tailor')} className={innerTabStyle(resultTab === 'tailor')}>🪄 Tailor Resume</button>
                      <button onClick={() => setResultTab('coverLetter')} className={innerTabStyle(resultTab === 'coverLetter')}>✉️ Cover Letter</button>
                    </>
                  )}
                </div>

                <div className="p-8">
                  {/* --- OVERVIEW TAB: PRINT STYLED --- */}
                  {resultTab === 'overview' && (
                    <div ref={reportRef} id="candidate-report-content" className="space-y-8 bg-transparent p-2 print:p-10 print:bg-white print:text-black">
                      
                      <div className="hidden print:block mb-8 border-b-2 border-gray-300 pb-6">
                        <div className="flex justify-between items-end">
                          <div>
                            <h1 className="text-2xl font-black text-black tracking-tight">AI Candidate Intelligence Report</h1>
                            <p className="text-sm font-bold text-gray-500 mt-1">Generated for Job #{singleResults.job_id || 'Custom'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Generated By</p>
                            <p className="text-sm font-bold text-black">IntelligenceATS</p>
                          </div>
                        </div>
                      </div>

                      {singleResults?.smart_alerts && singleResults.smart_alerts.length > 0 && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                          {singleResults.smart_alerts.map((alert, index) => (
                            <div key={index} className={`p-5 rounded-2xl border backdrop-blur-md flex items-start gap-4 shadow-sm print:shadow-none print:border-gray-300 ${alert.type === 'warning' ? 'bg-[#F59E0B]/20 border-[#F59E0B]/30 text-[#F59E0B] print:bg-orange-50 print:text-orange-800' : 'bg-[#E85D75]/20 border-[#E85D75]/30 text-[#E85D75] print:bg-red-50 print:text-red-800'}`}>
                              <div className="mt-0.5 text-2xl drop-shadow-md print:drop-shadow-none">{alert.type === 'warning' ? '⚠️' : '🚨'}</div>
                              <div>
                                <h4 className="font-bold text-sm tracking-wide uppercase drop-shadow-sm print:drop-shadow-none">{alert.title}</h4>
                                <p className="text-sm font-medium mt-1 opacity-90 leading-relaxed print:text-gray-700">{alert.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                          { label: 'Skill Overlap', value: `${(singleResults.feature_breakdown.skill_overlap_score * 100).toFixed(1)}%`, color: '#2FBF71' },
                          { label: 'Semantic Context', value: `${(singleResults.feature_breakdown.semantic_score * 100).toFixed(1)}%`, color: '#2F6FED' },
                          { label: 'Lexical Keyword', value: `${(singleResults.feature_breakdown.lexical_score * 100).toFixed(1)}%`, color: '#F59E0B' },
                          { label: 'Experience', value: `${singleResults.yoe || 0} Yrs`, color: '#94A3B8' },
                          { label: 'Education', value: singleResults.education || "Unknown", color: '#94A3B8', truncate: true },
                        ].map((item, idx) => (
                          <div key={idx} className={`p-5 rounded-2xl border text-center transition-transform hover:scale-105 shadow-sm bg-[#1A1F2E]/50 backdrop-blur-md border-white/5 print:bg-gray-50 print:border-gray-200 print:shadow-none`}>
                            <h4 className={`text-[10px] font-black uppercase mb-2 tracking-widest print:text-gray-500`} style={{color: item.color}}>{item.label}</h4>
                            <p className={`font-black drop-shadow-sm print:drop-shadow-none print:text-black ${item.truncate ? 'truncate text-sm text-[#F7F9FC]' : 'text-2xl text-[#F7F9FC]'}`} title={item.value}>{item.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col items-center p-8 bg-[#1A1F2E]/40 backdrop-blur-md rounded-3xl border border-white/5 shadow-inner print:bg-white print:border-none print:shadow-none print:p-0">
                        <h3 className="text-xs font-black text-[#94A3B8] print:text-gray-800 uppercase tracking-widest mb-8">Explainable AI Radar</h3>
                        <div className="bg-[#242B3D]/80 backdrop-blur-xl p-6 md:p-8 w-full max-w-lg rounded-3xl border border-white/10 shadow-lg mb-8 print:bg-white print:border-gray-200 print:shadow-none">
                           <XAIDial featureBreakdown={singleResults.feature_breakdown} />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                          <div className="bg-[#2FBF71]/5 backdrop-blur-md p-6 rounded-3xl border border-[#2FBF71]/20 shadow-inner print:bg-green-50 print:border-green-200 print:shadow-none">
                            <h4 className="text-xs font-black uppercase text-[#2FBF71] print:text-green-700 tracking-widest mb-4 flex items-center gap-2">
                              <span>✅</span> Key Strengths
                            </h4>
                            <ul className="space-y-3">
                              {getCandidateInsights(singleResults).strengths.map((str, idx) => (
                                <li key={idx} className="text-sm text-[#F7F9FC] print:text-gray-800 flex items-start gap-2">
                                  <span className="text-[#2FBF71] mt-0.5">•</span> <span>{str}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="bg-[#E85D75]/5 backdrop-blur-md p-6 rounded-3xl border border-[#E85D75]/20 shadow-inner print:bg-red-50 print:border-red-200 print:shadow-none">
                            <h4 className="text-xs font-black uppercase text-[#E85D75] print:text-red-700 tracking-widest mb-4 flex items-center gap-2">
                              <span>⚠️</span> Areas of Concern
                            </h4>
                            <ul className="space-y-3">
                              {getCandidateInsights(singleResults).concerns.map((con, idx) => (
                                <li key={idx} className="text-sm text-[#F7F9FC] print:text-gray-800 flex items-start gap-2">
                                  <span className="text-[#E85D75] mt-0.5">•</span> <span>{con}</span>
                                </li>
                              ))}
                              {getCandidateInsights(singleResults).concerns.length === 0 && (
                                <li className="text-sm text-[#94A3B8] print:text-gray-500 italic">No major red flags detected.</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {resultTab === 'skills' && (
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="bg-[#1A1F2E]/50 backdrop-blur-md p-8 rounded-3xl border border-white/5 shadow-inner">
                        <h4 className="font-black text-[#2FBF71] uppercase text-xs tracking-widest flex items-center gap-3 mb-6">
                          <span className="w-2.5 h-2.5 bg-[#2FBF71] rounded-full shadow-[0_0_10px_rgba(47,191,113,0.8)]"></span> Verified Matches
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {singleResults.skill_analysis.common_skills?.map(skill => <span key={skill} className="px-4 py-2 bg-[#242B3D]/80 backdrop-blur-sm text-[#2FBF71] border border-[#2FBF71]/30 rounded-xl text-xs font-bold shadow-sm">{skill}</span>)}
                          {(!singleResults.skill_analysis.common_skills || singleResults.skill_analysis.common_skills.length === 0) && <span className="text-sm font-medium text-[#94A3B8]">No matching skills found.</span>}
                        </div>
                      </div>
                      
                      <div className="bg-[#1A1F2E]/50 backdrop-blur-md p-8 rounded-3xl border border-white/5 shadow-inner">
                        <h4 className="font-black text-[#F59E0B] uppercase text-xs tracking-widest flex items-center gap-3 mb-6">
                          <span className="w-2.5 h-2.5 bg-[#F59E0B] rounded-full shadow-[0_0_10px_rgba(245,158,11,0.8)] animate-pulse"></span> Missing Requirements
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {missingSkills.map(skill => <span key={skill} className="px-4 py-2 bg-[#242B3D]/80 backdrop-blur-sm text-[#F59E0B] border border-[#F59E0B]/30 rounded-xl text-xs font-bold shadow-sm">{skill}</span>)}
                          {missingSkills.length === 0 && <span className="text-sm font-medium text-[#94A3B8]">Perfect match. No missing skills.</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {resultTab === 'logic' && (
                    <div className="bg-[#1A1F2E]/50 backdrop-blur-md p-8 rounded-3xl border border-white/5 shadow-inner space-y-8 animate-in fade-in">
                      <div>
                        <h3 className="text-xl font-black text-[#F7F9FC] mb-3 flex items-center gap-3 drop-shadow-sm">
                          <span className="p-2.5 bg-[#2F6FED]/20 backdrop-blur-sm border border-[#2F6FED]/30 rounded-xl text-[#2F6FED] shadow-sm">🧠</span> 
                          Random Forest Decision Engine
                        </h3>
                        <p className="text-[#94A3B8] font-medium leading-relaxed max-w-3xl">Evaluates using an ensemble of decision trees to weigh deep semantic context over simple keyword frequency.</p>
                      </div>

                      <div className="bg-[#242B3D]/60 backdrop-blur-xl p-8 rounded-2xl border border-white/5 shadow-lg">
                         <h4 className="text-xs font-black uppercase text-[#94A3B8] tracking-widest mb-6 flex items-center gap-2"><span>👁️‍🗨️</span> Live AI Reasoning & Fraud Analysis</h4>
                         <ul className="space-y-4">
                           {getCandidateInsights(singleResults).strengths.map((reason, idx) => (
                             <li key={`str-${idx}`} className="flex items-start gap-4 text-sm font-medium p-5 rounded-xl bg-[#1A1F2E]/80 backdrop-blur-md border border-white/5 shadow-inner">
                               <span className="text-[#2FBF71] text-xl mt-0.5 rounded-full">✓</span>
                               <span className="text-[#2FBF71] drop-shadow-sm leading-relaxed">{reason}</span>
                             </li>
                           ))}
                           {getCandidateInsights(singleResults).concerns.map((reason, idx) => {
                             const isDanger = reason.includes("Risk") || reason.includes("manipulation") || reason.includes("Stuffing");
                             return (
                               <li key={`con-${idx}`} className="flex items-start gap-4 text-sm font-medium p-5 rounded-xl bg-[#1A1F2E]/80 backdrop-blur-md border border-white/5 shadow-inner">
                                 <span className={isDanger ? "text-[#E85D75] text-xl mt-0.5 animate-pulse" : "text-[#F59E0B] text-xl mt-0.5"}>{isDanger ? "🚨" : "⚠️"}</span>
                                 <span className={`drop-shadow-sm leading-relaxed ${isDanger ? 'text-[#E85D75] font-bold' : 'text-[#F59E0B]'}`}>{reason}</span>
                               </li>
                             );
                           })}
                         </ul>
                      </div>
                    </div>
                  )}

                 {resultTab === 'coach' && (
                    <div className="bg-transparent p-2">
                      <div className="prose prose-invert max-w-none prose-h3:text-[#F7F9FC] prose-strong:text-[#2F6FED] prose-a:text-[#2F6FED] prose-p:font-medium prose-p:text-[#94A3B8] drop-shadow-sm" dangerouslySetInnerHTML={{ __html: singleResults.ai_feedback }} />
                    </div>
                  )}

                  {resultTab === 'tailor' && (
                    <div className="py-4">
                      {!tailorData ? (
                        <div className="text-center bg-[#1A1F2E]/50 backdrop-blur-md rounded-3xl border border-white/5 p-16 shadow-inner">
                          <div className="text-6xl mb-6 drop-shadow-md">🪄</div>
                          <h3 className="text-2xl font-black text-[#F7F9FC] mb-3 drop-shadow-sm">AI Resume Optimization</h3>
                          <p className="text-base font-medium text-[#94A3B8] mb-10 max-w-lg mx-auto">Generate an ATS-friendly, keyword-optimized version of this candidate's resume and re-evaluate it through our Random Forest model.</p>
                          <button onClick={handleTailor} disabled={tailorLoading} className="bg-[#2F6FED]/90 backdrop-blur-md border border-white/10 hover:bg-[#2563EB] text-white font-bold py-4 px-10 rounded-xl transition-all shadow-[0_0_20px_rgba(47,111,237,0.4)] active:scale-95 disabled:opacity-70 disabled:shadow-none tracking-wide">
                            {tailorLoading ? 'GENERATING & RE-SCORING...' : 'OPTIMIZE & RE-SCORE'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex flex-col md:flex-row items-center justify-between bg-[#242B3D]/60 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-[#2F6FED]/20 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="relative z-10 mb-6 md:mb-0 text-center md:text-left">
                              <span className="px-3 py-1.5 bg-[#2F6FED]/20 backdrop-blur-md text-[#2F6FED] border border-[#2F6FED]/30 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 inline-block shadow-sm">Optimization Success</span>
                              <h3 className="text-2xl font-black text-[#F7F9FC] drop-shadow-sm">Feedback Loop Complete</h3>
                              <p className="text-[#94A3B8] text-sm font-medium mt-2">Generated text re-processed through the Random Forest ensemble.</p>
                            </div>
                            <div className="flex items-center gap-8 relative z-10 bg-[#1A1F2E]/80 backdrop-blur-md px-8 py-5 rounded-2xl border border-white/5 shadow-inner">
                              <div className="text-center"><p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-widest mb-1.5">Original Match</p><p className="text-3xl font-black text-[#F7F9FC]">{tailorData.oldScore.toFixed(1)}%</p></div>
                              <div className="text-[#94A3B8] text-3xl font-light">→</div>
                              <div className="text-center"><p className="text-[10px] uppercase font-bold text-[#2FBF71] tracking-widest mb-1.5">Optimized Match</p><p className="text-3xl font-black text-[#2FBF71] animate-pulse drop-shadow-[0_0_10px_rgba(47,191,113,0.6)]">{tailorData.newScore.toFixed(1)}%</p></div>
                            </div>
                          </div>
                          <div className="text-left bg-[#242B3D]/40 backdrop-blur-xl p-10 rounded-3xl border border-white/5 shadow-lg prose prose-invert max-w-none prose-headings:text-[#F7F9FC] prose-p:font-medium prose-p:text-[#94A3B8] prose-strong:text-[#F7F9FC]">
                            <ReactMarkdown>{tailorData.text}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {resultTab === 'coverLetter' && (
                    <div className="py-4">
                      {!coverLetterText ? (
                        <div className="text-center bg-[#1A1F2E]/50 backdrop-blur-md rounded-3xl border border-white/5 p-16 shadow-inner">
                          <div className="text-6xl mb-6 drop-shadow-md">✉️</div>
                          <h3 className="text-2xl font-black text-[#F7F9FC] mb-3 drop-shadow-sm">Automated Cover Letter</h3>
                          <p className="text-base font-medium text-[#94A3B8] mb-10 max-w-lg mx-auto">Draft a highly professional, compelling cover letter for this candidate based on their extracted skills and the target job requirements.</p>
                          <button onClick={handleGenerateCoverLetter} disabled={coverLetterLoading} className="bg-[#2F6FED]/90 backdrop-blur-md border border-white/10 hover:bg-[#2563EB] text-white font-bold py-4 px-10 rounded-xl transition-all shadow-[0_0_20px_rgba(47,111,237,0.4)] active:scale-95 disabled:opacity-70 disabled:shadow-none tracking-wide">
                            {coverLetterLoading ? 'DRAFTING LETTER...' : 'GENERATE COVER LETTER'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-left bg-[#242B3D]/40 backdrop-blur-xl p-10 rounded-3xl border border-white/5 shadow-lg prose prose-invert max-w-none prose-p:font-medium prose-p:text-[#94A3B8]">
                          <ReactMarkdown>{coverLetterText}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}

                  {resultTab === 'chat' && (
                    <div className="flex flex-col h-[600px] rounded-3xl border border-white/5 bg-[#1A1F2E]/60 backdrop-blur-xl overflow-hidden shadow-2xl">
                      <div className="bg-[#242B3D]/80 backdrop-blur-md border-b border-white/5 p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#2F6FED]/20 border border-[#2F6FED]/30 flex items-center justify-center text-xl shadow-inner">🤖</div>
                        <div>
                          <h4 className="text-base font-black text-[#F7F9FC] leading-tight drop-shadow-sm">RAG-Fusion Copilot</h4>
                          <p className="text-[10px] font-bold text-[#2F6FED] uppercase tracking-widest mt-0.5">Secure Vector Memory Active</p>
                        </div>
                      </div>

                      <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar bg-transparent">
                        {chatHistory.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-[#94A3B8] p-8">
                            <div className="w-20 h-20 bg-[#242B3D]/80 backdrop-blur-md border border-white/5 rounded-full flex items-center justify-center text-4xl mb-6 shadow-lg">💬</div>
                            <p className="font-medium text-sm text-center max-w-xs mb-8">Ask questions about this candidate's background, technical projects, or skills.</p>
                            
                            <div className="text-left border-t border-white/10 pt-6 w-full">
                              <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-[#94A3B8] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2F6FED]"></span> Quick Actions
                              </p>
                              <div className="flex flex-col gap-2">
                                {["Summarize candidate's experience", "What are their strongest skills?", "Are there any red flags or job hopping?", "Why did they score this way?"].map((prompt, i) => (
                                  <button 
                                    key={i} 
                                    onClick={() => { setChatQuestion(prompt); }} 
                                    className="text-xs font-bold text-left bg-[#1A1F2E]/60 hover:bg-[#2F6FED]/20 hover:text-[#2F6FED] border border-white/5 hover:border-[#2F6FED]/30 transition-all px-4 py-2.5 rounded-xl text-[#F7F9FC] shadow-sm backdrop-blur-md"
                                  >
                                    {prompt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          chatHistory.map((msg, idx) => (
                             <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                              <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)] prose prose-sm prose-invert prose-p:leading-relaxed prose-li:my-0 backdrop-blur-md border border-white/5 ${msg.role === 'user' ? 'bg-[#2F6FED]/90 text-white rounded-br-sm font-medium' : 'bg-[#242B3D]/80 text-[#F7F9FC] rounded-bl-sm'}`}>
                                {msg.role === 'ai' ? <ReactMarkdown>{String(msg.content || "")}</ReactMarkdown> : String(msg.content || "")}
                              </div>
                            </div>
                          ))
                        )}
                        {chatLoading && (
                          <div className="flex justify-start">
                             <div className="px-5 py-4 rounded-2xl bg-[#242B3D]/80 backdrop-blur-md border border-white/5 text-[#94A3B8] flex items-center gap-2 rounded-bl-sm shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                                <span className="w-2 h-2 bg-[#2F6FED] rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-[#2F6FED] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                                <span className="w-2 h-2 bg-[#2F6FED] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                             </div>
                          </div>
                        )}
                      </div>
                      
                      <form onSubmit={handleChat} className="p-5 bg-[#242B3D]/60 backdrop-blur-md border-t border-white/5 flex gap-3">
                        <input type="text" value={chatQuestion} onChange={(e) => setChatQuestion(e.target.value)} placeholder="E.g., How many years of React experience do they have?" className="flex-1 bg-[#1A1F2E]/80 backdrop-blur-sm px-5 py-3.5 rounded-xl border border-white/5 text-[#F7F9FC] placeholder:text-[#94A3B8] outline-none focus:bg-[#1A1F2E] focus:ring-2 focus:ring-[#2F6FED]/50 transition-all text-sm font-medium shadow-inner" disabled={chatLoading} />
                        <button type="submit" disabled={chatLoading || !chatQuestion.trim()} className="bg-[#2F6FED]/90 backdrop-blur-md hover:bg-[#2563EB] text-white px-8 py-3.5 rounded-xl font-bold transition-all border border-white/10 disabled:opacity-50 shadow-[0_0_20px_rgba(47,111,237,0.4)] active:scale-95 disabled:shadow-none">➤</button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ) : bulkResults ? (
              <div className="bg-[#242B3D]/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 p-8 flex flex-col h-full min-h-[600px] animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#2FBF71]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                <div className="text-center mb-6 relative z-10">
                  <div className="w-14 h-14 bg-[#2FBF71]/20 border border-[#2FBF71]/40 text-[#2FBF71] rounded-full flex items-center justify-center text-2xl shadow-[0_0_20px_rgba(47,191,113,0.3)] mx-auto mb-4">✓</div>
                  <h3 className="text-2xl font-black text-[#F7F9FC] tracking-tight mb-2 drop-shadow-sm">Bulk Scan Complete</h3>

                  {/* --- PRIORITY 1: Scan Summary Chips --- */}
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    <span className="px-3 py-1.5 bg-[#1A1F2E]/80 backdrop-blur-md rounded-lg border border-white/5 text-xs font-bold text-[#94A3B8] shadow-sm"><span className="text-white">{bulkResults.length}</span> Imported</span>
                    <span className="px-3 py-1.5 bg-[#1A1F2E]/80 backdrop-blur-md rounded-lg border border-white/5 text-xs font-bold text-[#94A3B8] shadow-sm">Avg Match <span className="text-white">{bulkAvgMatch}%</span></span>
                    <span className={`px-3 py-1.5 bg-[#1A1F2E]/80 backdrop-blur-md rounded-lg border border-white/5 text-xs font-bold shadow-sm ${bulkFraudCount > 0 ? 'text-[#E85D75]' : 'text-[#94A3B8]'}`}>Fraud Flags <span className={bulkFraudCount > 0 ? 'text-[#E85D75]' : 'text-white'}>{bulkFraudCount}</span></span>
                    <span className="px-3 py-1.5 bg-[#1A1F2E]/80 backdrop-blur-md rounded-lg border border-white/5 text-xs font-bold text-[#94A3B8] shadow-sm">Processing Time <span className="text-white">~12s</span></span>
                  </div>
                </div>

                {/* --- PRIORITY 4: Fraud Visibility Box --- */}
                {bulkFraudCount > 0 && (
                  <div className="mb-6 relative z-10 bg-[#E85D75]/10 border border-[#E85D75]/30 rounded-xl p-3 flex items-center justify-between shadow-inner">
                     <p className="text-sm font-bold text-[#E85D75] flex items-center gap-2"><span className="text-lg animate-pulse">⚠️</span> Fraud Alerts Detected: {bulkFraudCount} candidate(s) flagged.</p>
                     <button onClick={() => navigate('/hr')} className="text-xs font-bold text-[#E85D75] hover:text-white transition-colors bg-[#E85D75]/20 px-3 py-1.5 rounded-lg border border-[#E85D75]/30">Review Now</button>
                  </div>
                )}

                <div className="flex-1 bg-[#1A1F2E]/60 backdrop-blur-md rounded-2xl border border-white/5 p-6 shadow-inner relative z-10 flex flex-col">
                  {/* --- PRIORITY 3: Rename to Candidate Ranking Summary --- */}
                  <h4 className="text-xs font-black uppercase text-[#94A3B8] tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#2F6FED] rounded-full shadow-[0_0_8px_#2F6FED]"></span> Candidate Ranking Summary
                  </h4>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                    {bulkResults.slice(0, 5).map((candidate, idx) => {
                      // --- PRIORITY 2: Status Badges Logic ---
                      const status = candidate.score >= 75 ? 'SHORTLIST' : candidate.score >= 50 ? 'REVIEW' : 'ARCHIVE';
                      const statusColor = candidate.score >= 75 ? 'text-[#2FBF71] bg-[#2FBF71]/10 border-[#2FBF71]/30' : candidate.score >= 50 ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30' : 'text-[#94A3B8] bg-[#242B3D]/80 border-white/5';
                      
                      // --- PRIORITY 5: Small Reason Preview ---
                      const reason = candidate.filename.includes('[FRAUD]') 
                        ? "⚠️ ATS manipulation detected in metadata." 
                        : candidate.score >= 75 ? "✅ Strong technical and semantic alignment with JD." 
                        : candidate.score >= 50 ? "⚠️ Meets baseline, missing some core requirements." 
                        : "❌ Severe gap in required technical skills.";

                      return (
                        <div key={idx} className="bg-[#242B3D]/60 p-4 rounded-xl border border-white/5 flex items-center justify-between shadow-sm hover:border-[#2F6FED]/30 transition-all group">
                          <div className="flex items-center gap-4 overflow-hidden flex-1">
                            <div className="w-8 h-8 rounded-lg bg-[#2F6FED]/10 text-[#2F6FED] flex items-center justify-center font-black text-xs border border-[#2F6FED]/30">#{idx + 1}</div>
                            <div className="flex-1 overflow-hidden pr-4">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-bold text-[#F7F9FC] truncate" title={candidate.filename}>
                                  {candidate.filename.replace('🔒 Anonymous_Candidate_', 'Candidate_').replace('.pdf', '')}
                                </p>
                                <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${statusColor}`}>{status}</span>
                              </div>
                              <p className="text-xs text-[#94A3B8] truncate">{reason}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-black shadow-sm border ${candidate.score >= 75 ? 'text-[#2FBF71] bg-[#2FBF71]/10 border-[#2FBF71]/30' : candidate.score >= 50 ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30' : 'text-[#94A3B8] bg-[#1A1F2E]/80 border-white/5'}`}>
                              {candidate.score.toFixed(1)}%
                            </span>
                            {/* --- PRIORITY 6: View Candidate Button --- */}
                            <button onClick={() => navigate('/hr')} className="text-xs font-bold text-[#2F6FED] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[#2F6FED]/10 hover:bg-[#2F6FED]/20 px-3 py-1.5 rounded-lg border border-[#2F6FED]/30">View Report</button>
                          </div>
                        </div>
                      );
                    })}
                    {bulkResults.length > 5 && (
                      <p className="text-center text-xs font-bold text-[#94A3B8] pt-2">...and {bulkResults.length - 5} more candidates.</p>
                    )}
                  </div>
                </div>

                {/* --- PRIORITY 7: Auto Redirect Timer --- */}
                <div className="mt-6 flex flex-col items-center justify-center relative z-10">
                  <button onClick={() => navigate('/hr')} className="bg-[#2F6FED]/90 backdrop-blur-md border border-white/10 hover:bg-[#2563EB] text-white font-black tracking-widest py-3.5 px-10 rounded-xl transition-all shadow-[0_0_20px_rgba(47,111,237,0.4)] active:scale-95 text-sm mb-3">
                    OPEN HR DASHBOARD
                  </button>
                  {autoRedirect ? (
                    <div className="flex items-center gap-3 text-[#94A3B8] text-xs font-bold">
                      <span>Opening dashboard in {redirectCountdown} seconds...</span>
                      <button onClick={() => setAutoRedirect(false)} className="text-[#E85D75] hover:text-white underline transition-colors">Cancel</button>
                    </div>
                  ) : (
                     <p className="text-[#94A3B8] text-xs font-bold">Auto-redirect cancelled.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#242B3D]/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 p-20 flex flex-col items-center justify-center h-full text-center space-y-8 min-h-[600px]">
                <div className="w-32 h-32 bg-[#1A1F2E]/80 backdrop-blur-md border border-white/5 text-[#94A3B8] rounded-full flex items-center justify-center text-5xl shadow-inner relative">
                  <span className="absolute top-0 right-0 w-5 h-5 bg-[#2F6FED] rounded-full animate-ping"></span>
                  <span className="absolute top-0 right-0 w-5 h-5 bg-[#2F6FED]/90 border border-white/30 rounded-full shadow-[0_0_15px_rgba(47,111,237,0.9)]"></span>
                  📡
                </div>
                <div>
                  <h3 className="text-3xl font-black text-[#F7F9FC] tracking-tight mb-3 drop-shadow-sm">Scanner Standby</h3>
                  <p className="text-[#94A3B8] max-w-sm font-medium leading-relaxed mx-auto text-lg">Upload a candidate document and select a target role to initiate the multi-vector AI analysis.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CandidateDashboard;