import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useReactToPrint } from 'react-to-print';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { useDropzone } from 'react-dropzone';
import { useLocation } from 'react-router-dom';
import 'react-circular-progressbar/dist/styles.css';
import XAIDial from '../components/XAIDial';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function CandidateDashboard() {
  const location = useLocation(); 
  
  // Dynamic Role State for Viva Demo
  const [userRole, setUserRole] = useState(localStorage.getItem('userRole') || 'recruiter');

  const toggleRole = () => {
    const newRole = userRole === 'recruiter' ? 'candidate' : 'recruiter';
    setUserRole(newRole);
    localStorage.setItem('userRole', newRole);
    setResultTab('overview'); 
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

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (location.state?.selectedJobId && dbJobs.length > 0) {
      setSelectedSavedJobId(location.state.selectedJobId);
      setJdMode('saved');
    }
  }, [location.state, dbJobs]);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jobs`);
      setDbJobs(response.data.data);
      if (response.data.data.length > 0 && !selectedSavedJobId && !location.state?.selectedJobId) {
        setSelectedSavedJobId(response.data.data[0].id);
      }
    } catch (err) { console.error("Failed to fetch jobs", err); }
  };

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) setFile(acceptedFiles[0]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: uploadMode === 'single' ? { 'application/pdf': ['.pdf'] } : { 'application/zip': ['.zip', 'application/x-zip-compressed'] }, multiple: false
  });

  const onJdDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) setJdFile(acceptedFiles[0]);
  }, []);
  const { getRootProps: getJdRootProps, getInputProps: getJdInputProps, isDragActive: isJdDragActive } = useDropzone({
    onDrop: onJdDrop, accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] }, multiple: false
  });

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please provide a Candidate file.");
    if (jdMode === 'text' && !jd) return setError("Please paste a Job Description.");
    if (jdMode === 'file' && !jdFile) return setError("Please upload a Job Description file.");

    setLoading(true); setError(''); setSingleResults(null);
    setBulkResults(null); setTailorData(null); setCoverLetterText(''); 
    setChatHistory([]); setResultTab('overview');

    const formData = new FormData();
    formData.append(uploadMode === 'single' ? 'resume_file' : 'resume_zip', file);
    formData.append('blind_mode', blindMode);
    
   if (jdMode === 'saved') {
      const selectedJob = dbJobs.find(j => j.id === Number(selectedSavedJobId));
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
      if (uploadMode === 'single') setSingleResults(response.data.data);
      else setBulkResults(response.data.data);
    } catch (err) {
      let errorMsg = "An error occurred during analysis.";
      if (err.response?.data?.detail) errorMsg = typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail);
      else if (err.message) errorMsg = err.message;
      setError(errorMsg);
    } finally { setLoading(false); }
  };

  const handleTailor = async () => { 
    setTailorLoading(true); 
    setTailorData(null); 
    const formData = new FormData(); 
    formData.append('resume_file', file); 
    formData.append('job_description', singleResults?.cleaned_jd || jd); 
    try { 
      const response = await axios.post(`${API_BASE_URL}/tailor`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); 
      setTailorData({
        text: response.data.tailored_resume,
        newScore: response.data.new_score,
        oldScore: singleResults.final_match_score_percentage
      });
    } catch (err) { 
      alert("Failed to optimize resume"); 
    } finally { 
      setTailorLoading(false); 
    } 
  };

  const handleGenerateCoverLetter = async () => { 
    setCoverLetterLoading(true); setCoverLetterText(''); 
    const formData = new FormData(); formData.append('resume_file', file); 
    formData.append('job_description', singleResults?.cleaned_jd || jd); 
    try { 
      const response = await axios.post(`${API_BASE_URL}/generate-cover-letter`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); 
      setCoverLetterText(response.data.cover_letter); 
    } catch (err) { 
      alert("Failed to write letter"); 
    } finally { 
      setCoverLetterLoading(false); 
    } 
  };
  
  const handleChat = async (e) => { 
    e.preventDefault(); 
    if (!chatQuestion.trim()) return; 

    const newQuestion = chatQuestion; 
    setChatHistory(prev => [...prev, { role: 'user', content: newQuestion }]); 
    setChatQuestion(''); 
    setChatLoading(true); 

    const formData = new FormData(); 
    formData.append('resume_file', file); 
    formData.append('question', newQuestion); 

    try { 
      const response = await axios.post(`${API_BASE_URL}/chat-resume`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); 
      const aiAnswer = response?.data?.answer || "Sorry, I received an empty response from the database.";
      setChatHistory(prev => [...prev, { role: 'ai', content: String(aiAnswer) }]); 
    } catch (err) { 
      setChatHistory(prev => [...prev, { role: 'ai', content: "⚠️ Failed to reach AI backend. Please check your terminal for errors." }]); 
    } finally { 
      setChatLoading(false); 
    } 
  };
  
  const generateXAIReasons = (results) => {
    if (!results) return [];
    const reasons = [];
    const semantic = results.feature_breakdown.semantic_score;
    const lexical = results.feature_breakdown.lexical_score;
    const skills = results.feature_breakdown.skill_overlap_score;

    if (lexical > (semantic + 0.3)) {
      reasons.push({ type: 'danger', text: "Lexical Anomaly: Exact keyword matches are unusually high compared to semantic meaning. (Potential Keyword Stuffing)." });
    } else if (lexical < 0.2 && semantic > 0.5) {
      reasons.push({ type: 'positive', text: "Excellent vocabulary variance. Candidate explains concepts well without copying the JD wording." });
    }

    if (skills >= 0.8) reasons.push({ type: 'positive', text: "Candidate possesses the vast majority of required hard skills." });
    else if (skills < 0.4) reasons.push({ type: 'negative', text: "Severe skill gap detected. Missing core technical requirements." });

    if (semantic >= 0.6) reasons.push({ type: 'positive', text: "High semantic alignment. Past experience contextually matches the job role." });
    else if (semantic < 0.3 && skills > 0.5) reasons.push({ type: 'warning', text: "Domain Mismatch Risk: Has the hard skills, but applied in a different context." });

    return reasons;
  };

  const handleDownloadReport = useReactToPrint({
    contentRef: reportRef,
    documentTitle: singleResults ? `${singleResults.processed_filename.replace('.pdf', '')}_AI_Report` : 'AI_Report'
  });

  const missingSkills = singleResults?.skill_analysis?.jd_skills_detected ? singleResults.skill_analysis.jd_skills_detected.filter(skill => !singleResults.skill_analysis.common_skills?.includes(skill)) : [];
  
  const innerTabStyle = (isActive) => `flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all whitespace-nowrap text-center ${isActive ? 'bg-[#1E293B] text-blue-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`;
  
  return (
    <div className="min-h-screen bg-[#0B1121] text-slate-300 pt-6 pb-20 relative overflow-x-hidden font-sans selection:bg-blue-500/30">
      
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
       {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black tracking-widest uppercase mb-4 shadow-sm">
              🔍 Intelligence Scanner
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight">Analysis Portal</h2>
            <p className="text-slate-400 font-medium mt-2">Upload candidate documents to run multi-vector contextual analysis.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-[#0F172A] p-1.5 rounded-xl border border-slate-800 shadow-lg">
            <button 
              onClick={toggleRole}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${userRole === 'candidate' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              🎓 Candidate View
            </button>
            <button 
              onClick={toggleRole}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${userRole === 'recruiter' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
            >
              🏢 HR View
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
          
          {/* LEFT PANEL */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0F172A]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 p-8 sticky top-24">
              <form onSubmit={handleAnalyze}>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Candidate File</label>
                    <div className="inline-flex bg-[#1E293B] p-1 rounded-lg border border-slate-700">
                      <button type="button" onClick={() => {setUploadMode('single'); setFile(null);}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${uploadMode === 'single' ? 'bg-[#0B1121] text-blue-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>PDF</button>
                      <button type="button" onClick={() => {setUploadMode('bulk'); setFile(null);}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${uploadMode === 'bulk' ? 'bg-[#0B1121] text-blue-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>ZIP</button>
                    </div>
                  </div>

                  <div {...getRootProps()} className={`relative group flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-[#1E293B] hover:border-blue-500/50 hover:bg-blue-500/5'}`}>
                    <input {...getInputProps()} />
                    {file ? (
                      <div className="flex items-center gap-4 w-full animate-in fade-in zoom-in duration-300">
                        <span className="text-3xl drop-shadow-md">📄</span>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-bold text-white truncate">{file.name}</p>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 mt-1">Ready for scan</p>
                        </div>
                        <button type="button" className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 rounded-full text-red-400 transition-colors border border-red-500/20" onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-4xl mb-4 group-hover:scale-110 transition-transform drop-shadow-lg">📂</div>
                        <p className="text-xs font-bold text-slate-400">{isDragActive ? "Drop file here!" : `Drag & drop ${uploadMode === 'single' ? '.pdf' : '.zip'}`}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Target Role</label>
                    <div className="inline-flex bg-[#1E293B] p-1 rounded-lg border border-slate-700">
                      <button type="button" onClick={() => setJdMode('saved')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jdMode === 'saved' ? 'bg-[#0B1121] text-blue-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>DB</button>
                      <button type="button" onClick={() => {setJdMode('text'); setJdFile(null);}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jdMode === 'text' ? 'bg-[#0B1121] text-blue-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>Text</button>
                      <button type="button" onClick={() => {setJdMode('file'); setJd('');}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jdMode === 'file' ? 'bg-[#0B1121] text-blue-400 shadow-sm border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>File</button>
                    </div>
                  </div>

                  {jdMode === 'saved' ? (
                    <select value={selectedSavedJobId} onChange={(e) => setSelectedSavedJobId(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-[#0B1121] text-slate-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-sm font-medium shadow-inner">
                      {dbJobs.length === 0 ? <option value="">No roles saved.</option> : null}
                      {dbJobs.map(job => (<option key={job.id} value={job.id}>{job.title}</option>))}
                    </select>
                  ) : jdMode === 'text' ? (
                    <textarea rows="4" placeholder="Paste the target JD..." value={jd} onChange={(e) => setJd(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-[#0B1121] text-slate-300 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-sm custom-scrollbar shadow-inner" />
                  ) : (
                    <div {...getJdRootProps()} className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isJdDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-[#1E293B] hover:border-blue-500/50 hover:bg-blue-500/5'}`}>
                      <input {...getJdInputProps()} />
                      {jdFile ? (
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-2xl drop-shadow-md">🏢</span>
                          <p className="text-sm font-bold text-white truncate flex-1">{jdFile.name}</p>
                          <button type="button" className="text-red-400 hover:text-red-300 font-bold p-1 bg-red-500/10 hover:bg-red-500/20 rounded-full w-6 h-6 flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setJdFile(null); }}>✕</button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-3xl mb-3 block group-hover:scale-110 transition-transform drop-shadow-lg">🏢</span>
                          <p className="text-xs font-bold text-slate-400">Drop JD (.pdf, .png, .jpg)</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {userRole === 'recruiter' && (
                  <div 
                    onClick={() => setBlindMode(!blindMode)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all mb-8 ${blindMode ? 'bg-emerald-500/10 border-emerald-500/50 ring-4 ring-emerald-500/20 shadow-lg' : 'bg-[#1E293B] border-slate-700 hover:border-slate-600'}`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors shadow-sm border ${blindMode ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-[#0B1121] border-slate-600'}`}>
                      {blindMode && "✓"}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-bold ${blindMode ? 'text-emerald-400' : 'text-slate-300'}`}>🛡️ Blind Hiring Mode</h4>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-0.5">Strip Identifiable Info</p>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 tracking-wide">
                  {loading ? (
                    <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> ANALYZING...</>
                  ) : "INITIATE SCAN"}
                </button>
              </form>
              
              {error && (
                <div className={`mt-6 p-4 rounded-xl text-sm font-bold animate-in zoom-in-95 border ${error.includes('FRAUD') ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'}`}>
                  {error.includes('FRAUD') ? '🛑 ' : '⚠️ '} {error}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: RESULTS */}
          <div className="lg:col-span-8">
            {singleResults ? (
              <div className="bg-[#0F172A]/90 backdrop-blur-md rounded-3xl shadow-2xl border border-slate-800 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                <div className="bg-[#1E293B] p-8 text-white flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden border-b border-slate-800">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                  <div className="relative z-10">
                    <span className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest inline-block shadow-sm">Intelligence Report</span>
                    <h2 className="text-3xl font-black mt-4 leading-tight text-white">Analysis Complete</h2>
                    <p className="text-slate-400 font-medium text-sm mt-2 flex items-center gap-2">
                      <span className="text-lg">📄</span> {singleResults.processed_filename}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <button 
                      onClick={handleDownloadReport}
                      className="flex items-center gap-2 bg-[#0B1121] hover:bg-slate-800 text-slate-300 border border-slate-700 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95"
                    >
                      <span className="text-lg">📥</span> Export
                    </button>

                    <div className="w-28 h-28 bg-[#0B1121] p-2 rounded-full border border-slate-700 shadow-inner">
                      <CircularProgressbar 
                        value={singleResults.final_match_score_percentage} 
                        text={`${singleResults.final_match_score_percentage}%`} 
                        styles={buildStyles({
                          textSize: '24px', 
                          pathColor: singleResults.final_match_score_percentage >= 75 ? '#10b981' : singleResults.final_match_score_percentage >= 50 ? '#f59e0b' : '#ef4444', 
                          textColor: '#fff', 
                          trailColor: 'rgba(255,255,255,0.05)'
                        })} 
                      />
                    </div>
                  </div>
                </div>

                <div className="flex bg-[#0B1121] border-b border-slate-800 overflow-x-auto hide-scrollbar p-2 gap-2">
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
                  {resultTab === 'overview' && (
                    <div ref={reportRef} id="candidate-report-content" className="space-y-10 bg-transparent p-2 print-color-adjust-exact">
                      <div className="hidden print:block mb-8 border-b-2 border-slate-700 pb-6">
                        <div className="flex justify-between items-end">
                          <div>
                            <h1 className="text-2xl font-black text-white tracking-tight">AI Candidate Intelligence Report</h1>
                            <p className="text-sm font-bold text-slate-400 mt-1">Generated for Job #{singleResults.job_id || 'Custom'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Generated By</p>
                            <p className="text-sm font-bold text-slate-300">IntelligenceATS</p>
                          </div>
                        </div>
                      </div>

                      {singleResults?.smart_alerts && singleResults.smart_alerts.length > 0 && (
                        <div className="space-y-4 animate-in fade-in duration-500">
                          {singleResults.smart_alerts.map((alert, index) => (
                            <div 
                              key={index} 
                              className={`p-5 rounded-2xl border flex items-start gap-4 shadow-sm ${
                                alert.type === 'warning' 
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                                  : 'bg-red-500/10 border-red-500/20 text-red-400'
                              }`}
                            >
                              <div className="mt-0.5 text-2xl drop-shadow-md">
                                {alert.type === 'warning' ? '⚠️' : '🚨'}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm tracking-wide uppercase">
                                  {alert.title}
                                </h4>
                                <p className="text-sm font-medium mt-1 opacity-90 leading-relaxed">
                                  {alert.message}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                          { label: 'Skill Overlap', value: `${(singleResults.feature_breakdown.skill_overlap_score * 100).toFixed(1)}%` },
                          { label: 'Semantic', value: `${(singleResults.feature_breakdown.semantic_score * 100).toFixed(1)}%` },
                          { label: 'Lexical', value: `${(singleResults.feature_breakdown.lexical_score * 100).toFixed(1)}%` },
                          { label: 'Experience', value: `${singleResults.yoe || 0} Yrs`, highlight: true },
                          { label: 'Education', value: singleResults.education || "Unknown", highlight: true, truncate: true },
                        ].map((item, idx) => (
                          <div key={idx} className={`p-5 rounded-2xl border text-center transition-transform hover:scale-105 shadow-sm ${item.highlight ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[#1E293B] border-slate-700'}`}>
                            <h4 className={`text-[10px] font-black uppercase mb-2 tracking-widest ${item.highlight ? 'text-emerald-400' : 'text-slate-500'}`}>{item.label}</h4>
                            <p className={`font-black ${item.truncate ? 'truncate text-sm text-slate-300' : 'text-2xl text-white'}`} title={item.value}>{item.value}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col items-center p-8 bg-[#0F172A] rounded-3xl border border-slate-800 shadow-inner">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8">Explainable AI Radar</h3>
                        <div className="bg-[#1E293B] p-6 rounded-full border border-slate-700 shadow-lg">
                           <XAIDial featureBreakdown={singleResults.feature_breakdown} />
                        </div>
                      </div>
                    </div>
                  )}

                  {resultTab === 'logic' && (
                    <div className="bg-[#0F172A] p-8 rounded-3xl border border-slate-800 shadow-inner space-y-8">
                      <div>
                        <h3 className="text-xl font-black text-white mb-3 flex items-center gap-3">
                          <span className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shadow-sm">🧠</span> 
                          Random Forest Decision Engine
                        </h3>
                        <p className="text-slate-400 font-medium leading-relaxed max-w-3xl">The system evaluates the candidate using an ensemble of decision trees to weigh deep semantic context over simple keyword frequency.</p>
                      </div>

                      <div className="bg-[#1E293B] p-8 rounded-2xl border border-slate-700 shadow-lg">
                         <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest mb-6 flex items-center gap-2">
                           <span>👁️‍🗨️</span> Live AI Decision Reasoning
                         </h4>
                         <ul className="space-y-4">
                           {generateXAIReasons(singleResults).map((reason, idx) => (
                             <li key={idx} className="flex items-start gap-4 text-sm font-medium p-5 rounded-xl bg-[#0B1121] border border-slate-800 shadow-inner">
                               {reason.type === 'positive' && <span className="text-emerald-400 text-xl mt-0.5 shadow-[0_0_10px_rgba(16,185,129,0.3)] rounded-full">✓</span>}
                               {reason.type === 'negative' && <span className="text-red-400 text-xl mt-0.5">✕</span>}
                               {reason.type === 'warning' && <span className="text-amber-400 text-xl mt-0.5">⚠️</span>}
                               {reason.type === 'danger' && <span className="text-red-500 text-xl mt-0.5 animate-pulse drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">🚨</span>}
                               
                               <span className={
                                 reason.type === 'positive' ? 'text-emerald-300 leading-relaxed' :
                                 reason.type === 'negative' ? 'text-slate-300 leading-relaxed' :
                                 reason.type === 'warning' ? 'text-amber-300 leading-relaxed' : 'text-red-400 font-bold leading-relaxed'
                               }>
                                 {reason.text}
                               </span>
                             </li>
                           ))}
                           {generateXAIReasons(singleResults).length === 0 && (
                             <li className="text-sm text-slate-500 italic p-4 bg-[#0B1121] rounded-xl border border-slate-800">Average candidate profile. No significant anomalies detected.</li>
                           )}
                         </ul>
                      </div>
                    </div>
                  )}

                  {resultTab === 'skills' && (
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="bg-[#0F172A] p-8 rounded-3xl border border-slate-800 shadow-inner">
                        <h4 className="font-black text-emerald-400 uppercase text-xs tracking-widest flex items-center gap-3 mb-6">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span> Verified Matches
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {singleResults.skill_analysis.common_skills?.map(skill => (
                            <span key={skill} className="px-4 py-2 bg-[#1E293B] text-emerald-300 border border-emerald-500/20 rounded-xl text-xs font-bold shadow-sm">{skill}</span>
                          ))}
                          {(!singleResults.skill_analysis.common_skills || singleResults.skill_analysis.common_skills.length === 0) && <span className="text-sm font-medium text-slate-500">No matching skills found.</span>}
                        </div>
                      </div>
                      
                      <div className="bg-[#0F172A] p-8 rounded-3xl border border-slate-800 shadow-inner">
                        <h4 className="font-black text-red-400 uppercase text-xs tracking-widest flex items-center gap-3 mb-6">
                          <span className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></span> Missing Requirements
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {missingSkills.map(skill => (
                            <span key={skill} className="px-4 py-2 bg-[#1E293B] text-red-300 border border-red-500/20 rounded-xl text-xs font-bold shadow-sm">{skill}</span>
                          ))}
                          {missingSkills.length === 0 && <span className="text-sm font-medium text-slate-500">Perfect match. No missing skills.</span>}
                        </div>
                      </div>
                    </div>
                  )}

                 {resultTab === 'coach' && (
                    <div className="bg-transparent p-2">
                      <div 
                        className="prose prose-invert max-w-none prose-h3:text-white prose-strong:text-blue-400 prose-a:text-blue-400 prose-p:font-medium prose-p:text-slate-300"
                        dangerouslySetInnerHTML={{ __html: singleResults.ai_feedback }} 
                      />
                    </div>
                  )}

                  {resultTab === 'tailor' && (
                    <div className="py-4">
                      {!tailorData ? (
                        <div className="text-center bg-[#0F172A] rounded-3xl border border-slate-800 p-16 shadow-inner">
                          <div className="text-6xl mb-6 drop-shadow-md">🪄</div>
                          <h3 className="text-2xl font-black text-white mb-3">AI Resume Optimization</h3>
                          <p className="text-base font-medium text-slate-400 mb-10 max-w-lg mx-auto">Generate an ATS-friendly, keyword-optimized version of this candidate's resume and re-evaluate it through our Random Forest model.</p>
                          <button onClick={handleTailor} disabled={tailorLoading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 disabled:opacity-70 disabled:shadow-none tracking-wide">
                            {tailorLoading ? 'GENERATING & RE-SCORING...' : 'OPTIMIZE & RE-SCORE'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                          <div className="flex flex-col md:flex-row items-center justify-between bg-[#1E293B] p-8 rounded-3xl border border-slate-700 shadow-xl overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
                            
                            <div className="relative z-10 mb-6 md:mb-0 text-center md:text-left">
                              <span className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-black uppercase tracking-widest mb-4 inline-block shadow-sm">Optimization Success</span>
                              <h3 className="text-2xl font-black text-white">Feedback Loop Complete</h3>
                              <p className="text-slate-400 text-sm font-medium mt-2">Generated text re-processed through the Random Forest ensemble.</p>
                            </div>
                            
                            <div className="flex items-center gap-8 relative z-10 bg-[#0B1121] px-8 py-5 rounded-2xl border border-slate-700 shadow-inner">
                              <div className="text-center">
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mb-1.5">Original Match</p>
                                <p className="text-3xl font-black text-slate-300">{tailorData.oldScore.toFixed(1)}%</p>
                              </div>
                              <div className="text-slate-600 text-3xl font-light">→</div>
                              <div className="text-center">
                                <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-widest mb-1.5">Optimized Match</p>
                                <p className="text-3xl font-black text-emerald-400 animate-pulse drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">{tailorData.newScore.toFixed(1)}%</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-left bg-[#1E293B] p-10 rounded-3xl border border-slate-700 shadow-lg prose prose-invert max-w-none prose-headings:text-white prose-p:font-medium prose-p:text-slate-300 prose-strong:text-white">
                            <ReactMarkdown>{tailorData.text}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {resultTab === 'coverLetter' && (
                    <div className="py-4">
                      {!coverLetterText ? (
                        <div className="text-center bg-[#0F172A] rounded-3xl border border-slate-800 p-16 shadow-inner">
                          <div className="text-6xl mb-6 drop-shadow-md">✉️</div>
                          <h3 className="text-2xl font-black text-white mb-3">Automated Cover Letter</h3>
                          <p className="text-base font-medium text-slate-400 mb-10 max-w-lg mx-auto">Draft a highly professional, compelling cover letter for this candidate based on their extracted skills and the target job requirements.</p>
                          <button onClick={handleGenerateCoverLetter} disabled={coverLetterLoading} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 disabled:opacity-70 disabled:shadow-none tracking-wide">
                            {coverLetterLoading ? 'DRAFTING LETTER...' : 'GENERATE COVER LETTER'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-left bg-[#1E293B] p-10 rounded-3xl border border-slate-700 shadow-lg prose prose-invert max-w-none prose-p:font-medium prose-p:text-slate-300">
                          <ReactMarkdown>{coverLetterText}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🛡️ THE FIXED RAG COPILOT UI (DARK MODE) */}
                  {resultTab === 'chat' && (
                    <div className="flex flex-col h-[600px] rounded-3xl border border-slate-800 bg-[#0F172A] overflow-hidden shadow-2xl">
                      <div className="bg-[#1E293B] border-b border-slate-700 p-5 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-xl shadow-inner">🤖</div>
                        <div>
                          <h4 className="text-base font-black text-white leading-tight">RAG-Fusion Copilot</h4>
                          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-0.5">Secure Vector Memory Active</p>
                        </div>
                      </div>

                      <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar bg-[#0B1121]">
                        {chatHistory.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8">
                            <div className="w-20 h-20 bg-[#1E293B] border border-slate-700 rounded-full flex items-center justify-center text-4xl mb-6 shadow-lg">💬</div>
                            <p className="font-medium text-sm text-center max-w-xs">Ask questions about this candidate's background, technical projects, or skills.</p>
                          </div>
                        ) : (
                          chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                              <div className={`max-w-[85%] px-5 py-4 rounded-2xl text-sm shadow-md prose prose-sm prose-invert prose-p:leading-relaxed prose-li:my-0 ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm font-medium' : 'bg-[#1E293B] text-slate-300 border border-slate-700 rounded-bl-sm'}`}>
                                {msg.role === 'ai' ? (
                                  <ReactMarkdown>{String(msg.content || "")}</ReactMarkdown>
                                ) : (
                                  String(msg.content || "")
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        {chatLoading && (
                          <div className="flex justify-start">
                             <div className="px-5 py-4 rounded-2xl bg-[#1E293B] border border-slate-700 text-slate-400 flex items-center gap-2 rounded-bl-sm shadow-sm">
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                                <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                             </div>
                          </div>
                        )}
                      </div>
                      
                      <form onSubmit={handleChat} className="p-5 bg-[#1E293B] border-t border-slate-700 flex gap-3">
                        <input 
                          type="text" 
                          value={chatQuestion} 
                          onChange={(e) => setChatQuestion(e.target.value)} 
                          placeholder="E.g., How many years of React experience do they have?" 
                          className="flex-1 bg-[#0B1121] px-5 py-3.5 rounded-xl border border-slate-700 text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm font-medium shadow-inner" 
                          disabled={chatLoading} 
                        />
                        <button 
                          type="submit" 
                          disabled={chatLoading || !chatQuestion.trim()} 
                          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-bold transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 disabled:shadow-none"
                        >
                          ➤
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#0F172A]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 p-20 flex flex-col items-center justify-center h-full text-center space-y-8 min-h-[600px]">
                <div className="w-32 h-32 bg-[#1E293B] border border-slate-700 text-slate-500 rounded-full flex items-center justify-center text-5xl shadow-inner relative">
                  <span className="absolute top-0 right-0 w-5 h-5 bg-blue-500 rounded-full animate-ping"></span>
                  <span className="absolute top-0 right-0 w-5 h-5 bg-blue-500/80 border border-blue-400 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.8)]"></span>
                  📡
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tight mb-3">Scanner Standby</h3>
                  <p className="text-slate-400 max-w-sm font-medium leading-relaxed mx-auto text-lg">Upload a candidate document and select a target role to initiate the multi-vector AI analysis.</p>
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