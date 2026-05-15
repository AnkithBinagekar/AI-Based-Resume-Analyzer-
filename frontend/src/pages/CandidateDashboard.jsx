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
  const [tailoredResume, setTailoredResume] = useState('');
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
    setBulkResults(null); setTailoredResume(''); setCoverLetterText(''); 
    setChatHistory([]); setResultTab('overview');

    const formData = new FormData();
    formData.append(uploadMode === 'single' ? 'resume_file' : 'resume_zip', file);
    formData.append('blind_mode', blindMode);
    
    if (jdMode === 'saved') {
      const selectedJob = dbJobs.find(j => j.id === Number(selectedSavedJobId));
      formData.append('job_description_text', selectedJob ? selectedJob.description_text : '');
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

  const handleTailor = async () => { setTailorLoading(true); setTailoredResume(''); const formData = new FormData(); formData.append('resume_file', file); formData.append('job_description', singleResults?.cleaned_jd || jd); try { const response = await axios.post(`${API_BASE_URL}/tailor`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); setTailoredResume(response.data.tailored_resume); } catch (err) { alert("Failed to tailor"); } finally { setTailorLoading(false); } };
  const handleGenerateCoverLetter = async () => { setCoverLetterLoading(true); setCoverLetterText(''); const formData = new FormData(); formData.append('resume_file', file); formData.append('job_description', singleResults?.cleaned_jd || jd); try { const response = await axios.post(`${API_BASE_URL}/generate-cover-letter`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); setCoverLetterText(response.data.cover_letter); } catch (err) { alert("Failed to write letter"); } finally { setCoverLetterLoading(false); } };
  const handleChat = async (e) => { e.preventDefault(); if (!chatQuestion.trim()) return; const newQuestion = chatQuestion; setChatHistory(prev => [...prev, { role: 'user', content: newQuestion }]); setChatQuestion(''); setChatLoading(true); const formData = new FormData(); formData.append('resume_file', file); formData.append('question', newQuestion); try { const response = await axios.post(`${API_BASE_URL}/chat-resume`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }); setChatHistory(prev => [...prev, { role: 'ai', content: response.data.answer }]); } catch (err) { setChatHistory(prev => [...prev, { role: 'ai', content: "⚠️ Failed to reach AI backend." }]); } finally { setChatLoading(false); } };
  
  // Robust Native PDF Export using react-to-print v3 API
  const handleDownloadReport = useReactToPrint({
    contentRef: reportRef,
    documentTitle: singleResults ? `${singleResults.processed_filename.replace('.pdf', '')}_AI_Report` : 'AI_Report'
  });

  const missingSkills = singleResults?.skill_analysis?.jd_skills_detected ? singleResults.skill_analysis.jd_skills_detected.filter(skill => !singleResults.skill_analysis.common_skills?.includes(skill)) : [];
  
  // NEW: Modern Pill-Tab Styling
  const innerTabStyle = (isActive) => `flex-1 py-2.5 px-4 text-sm font-bold rounded-xl transition-all whitespace-nowrap text-center ${isActive ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/50'}`;
  
  return (
    <div className="min-h-screen bg-slate-50 pt-6 pb-20 relative overflow-hidden">
      
      {/* SaaS Background Pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>

      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/50 text-emerald-700 text-xs font-bold tracking-widest uppercase mb-3 border border-emerald-200">
            🔍 Intelligence Scanner
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Analysis Portal</h2>
          <p className="text-slate-500 font-medium mt-2">Upload candidate documents to run multi-vector contextual analysis.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
          
          {/* LEFT PANEL: UPLOAD FORM (Now Sticky!) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-8 sticky top-24">
              <form onSubmit={handleAnalyze}>
                
                {/* Candidate Resume Section */}
                <div className="space-y-3 mb-8">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate File</label>
                    <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                      <button type="button" onClick={() => {setUploadMode('single'); setFile(null);}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${uploadMode === 'single' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>PDF</button>
                      <button type="button" onClick={() => {setUploadMode('bulk'); setFile(null);}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${uploadMode === 'bulk' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>ZIP</button>
                    </div>
                  </div>

                  <div {...getRootProps()} className={`relative group flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                    <input {...getInputProps()} />
                    {file ? (
                      <div className="flex items-center gap-3 w-full animate-in fade-in zoom-in duration-300">
                        <span className="text-3xl">📄</span>
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-600 mt-0.5">Ready for scan</p>
                        </div>
                        <button type="button" className="w-8 h-8 flex items-center justify-center hover:bg-red-100 rounded-full text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">📂</div>
                        <p className="text-xs font-bold text-slate-600">{isDragActive ? "Drop file here!" : `Drag & drop ${uploadMode === 'single' ? '.pdf' : '.zip'}`}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Description Section */}
                <div className="space-y-3 mb-8">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target Role</label>
                    <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                      <button type="button" onClick={() => setJdMode('saved')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jdMode === 'saved' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>DB</button>
                      <button type="button" onClick={() => {setJdMode('text'); setJdFile(null);}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jdMode === 'text' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Text</button>
                      <button type="button" onClick={() => {setJdMode('file'); setJd('');}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jdMode === 'file' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>File</button>
                    </div>
                  </div>

                  {jdMode === 'saved' ? (
                    <select value={selectedSavedJobId} onChange={(e) => setSelectedSavedJobId(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium">
                      {dbJobs.length === 0 ? <option value="">No roles saved.</option> : null}
                      {dbJobs.map(job => (<option key={job.id} value={job.id}>{job.title}</option>))}
                    </select>
                  ) : jdMode === 'text' ? (
                    <textarea rows="4" placeholder="Paste the target JD..." value={jd} onChange={(e) => setJd(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm custom-scrollbar" />
                  ) : (
                    <div {...getJdRootProps()} className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isJdDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/30'}`}>
                      <input {...getJdInputProps()} />
                      {jdFile ? (
                        <div className="flex items-center gap-3 w-full">
                          <span className="text-2xl">🏢</span>
                          <p className="text-sm font-bold text-slate-800 truncate flex-1">{jdFile.name}</p>
                          <button type="button" className="text-red-500 hover:text-red-700 font-bold p-1" onClick={(e) => { e.stopPropagation(); setJdFile(null); }}>✕</button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">🏢</span>
                          <p className="text-xs font-bold text-slate-600">Drop JD (.pdf, .png, .jpg)</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Blind Mode Toggle */}
                <div 
                  onClick={() => setBlindMode(!blindMode)}
                  className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all mb-8 ${blindMode ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-100 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors shadow-sm ${blindMode ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-300'}`}>
                    {blindMode && "✓"}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold ${blindMode ? 'text-emerald-800' : 'text-slate-700'}`}>🛡️ Blind Hiring Mode</h4>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-0.5">Strip Identifiable Info</p>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> ANALYZING...</>
                  ) : "INITIATE SCAN"}
                </button>
              </form>
              
              {error && (
                <div className={`mt-6 p-4 rounded-xl text-sm font-bold animate-in zoom-in-95 ${error.includes('FRAUD') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                  {error.includes('FRAUD') ? '🛑 ' : '⚠️ '} {error}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: RESULTS */}
          <div className="lg:col-span-8">
            {singleResults ? (
              <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
                
                {/* Results Header */}
                <div className="bg-slate-900 p-8 text-white flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                  <div className="relative z-10">
                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-500/30">Intelligence Report</span>
                    <h2 className="text-3xl font-black mt-3 leading-tight">Analysis Complete</h2>
                    <p className="text-slate-400 font-medium text-sm mt-1 flex items-center gap-2">
                      <span>📄</span> {singleResults.processed_filename}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <button 
                      onClick={handleDownloadReport}
                      className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-5 py-2.5 rounded-xl font-bold transition-all backdrop-blur-sm active:scale-95"
                    >
                      <span className="text-lg">📥</span> Export
                    </button>

                    <div className="w-28 h-28 bg-white/5 p-2 rounded-full backdrop-blur-sm border border-white/10 shadow-inner">
                      <CircularProgressbar 
                        value={singleResults.final_match_score_percentage} 
                        text={`${singleResults.final_match_score_percentage}%`} 
                        styles={buildStyles({
                          textSize: '24px', 
                          pathColor: singleResults.final_match_score_percentage >= 75 ? '#10b981' : singleResults.final_match_score_percentage >= 50 ? '#f59e0b' : '#ef4444', 
                          textColor: '#fff', 
                          trailColor: 'rgba(255,255,255,0.1)'
                        })} 
                      />
                    </div>
                  </div>
                </div>

                {/* NEW: Modern Pill-Tabs */}
                <div className="p-4 border-b border-slate-100 bg-white">
                  <div className="flex bg-slate-100/80 p-1.5 rounded-2xl overflow-x-auto hide-scrollbar gap-1">
                    <button onClick={() => setResultTab('overview')} className={innerTabStyle(resultTab === 'overview')}>📊 Overview</button>
                    <button onClick={() => setResultTab('logic')} className={innerTabStyle(resultTab === 'logic')}>⚙️ AI Logic</button>
                    <button onClick={() => setResultTab('skills')} className={innerTabStyle(resultTab === 'skills')}>🎯 Skills</button>
                    <button onClick={() => setResultTab('coach')} className={innerTabStyle(resultTab === 'coach')}>✨ Coach</button>
                    <button onClick={() => setResultTab('tailor')} className={innerTabStyle(resultTab === 'tailor')}>🪄 Tailor</button>
                    <button onClick={() => setResultTab('coverLetter')} className={innerTabStyle(resultTab === 'coverLetter')}>✉️ Letter</button>
                    <button onClick={() => setResultTab('chat')} className={innerTabStyle(resultTab === 'chat')}>🤖 Chat</button>
                  </div>
                </div>

                <div className="p-8">
                  {/* OVERVIEW TAB (Printable) */}
                  {resultTab === 'overview' && (
                    <div ref={reportRef} id="candidate-report-content" className="space-y-10 bg-white p-2 print-color-adjust-exact">
                      
                      {/* --- PRINT ONLY HEADER --- */}
                      <div className="hidden print:block mb-8 border-b-2 border-slate-200 pb-6">
                        <div className="flex justify-between items-end">
                          <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">AI Candidate Intelligence Report</h1>
                            <p className="text-sm font-bold text-slate-500 mt-1">Generated for Job #{singleResults.job_id || 'Custom'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Generated By</p>
                            <p className="text-sm font-bold text-slate-700">AI - Based Resume Analyzer</p>
                          </div>
                        </div>
                      </div>

                      {/* --- SMART ALERTS --- */}
                      {singleResults?.smart_alerts && singleResults.smart_alerts.length > 0 && (
                        <div className="space-y-3 animate-in fade-in duration-500">
                          {singleResults.smart_alerts.map((alert, index) => (
                            <div 
                              key={index} 
                              className={`p-4 rounded-2xl border flex items-start gap-4 ${
                                alert.type === 'warning' 
                                  ? 'bg-amber-50 border-amber-200 text-amber-800' 
                                  : 'bg-red-50 border-red-200 text-red-800'
                              }`}
                            >
                              <div className="mt-0.5 text-xl">
                                {alert.type === 'warning' ? '⚠️' : '🚨'}
                              </div>
                              <div>
                                <h4 className="font-bold text-sm tracking-wide uppercase">
                                  {alert.title}
                                </h4>
                                <p className="text-sm font-medium mt-1 opacity-90">
                                  {alert.message}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* --- METRICS GRID --- */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                          { label: 'Skill Overlap', value: `${(singleResults.feature_breakdown.skill_overlap_score * 100).toFixed(1)}%` },
                          { label: 'Semantic', value: `${(singleResults.feature_breakdown.semantic_score * 100).toFixed(1)}%` },
                          { label: 'Lexical', value: `${(singleResults.feature_breakdown.lexical_score * 100).toFixed(1)}%` },
                          { label: 'Experience', value: `${singleResults.yoe || 0} Yrs`, highlight: true },
                          { label: 'Education', value: singleResults.education || "Unknown", highlight: true, truncate: true },
                        ].map((item, idx) => (
                          <div key={idx} className={`p-5 rounded-2xl border text-center transition-transform hover:scale-105 shadow-sm ${item.highlight ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-800'}`}>
                            <h4 className={`text-[10px] font-black uppercase mb-1 ${item.highlight ? 'text-emerald-600' : 'text-slate-400'}`}>{item.label}</h4>
                            <p className={`font-black ${item.truncate ? 'truncate text-sm' : 'text-xl'}`} title={item.value}>{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* --- XAI DIAL --- */}
                      <div className="flex flex-col items-center p-8 bg-slate-50 rounded-3xl border border-slate-200 shadow-inner">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Explainable AI Radar</h3>
                        <XAIDial featureBreakdown={singleResults.feature_breakdown} />
                      </div>
                    </div>
                  )}

                  {/* AI LOGIC TAB */}
                  {resultTab === 'logic' && (
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200 shadow-inner">
                      <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                        <span className="p-2 bg-indigo-100 rounded-xl text-indigo-600 shadow-sm">🧠</span> 
                        Random Forest Decision Engine
                      </h3>
                      <p className="text-slate-500 mb-8 font-medium leading-relaxed max-w-2xl">The system evaluates the candidate using an ensemble of decision trees to weigh deep semantic context over simple keyword frequency.</p>
                      <div className="grid gap-5">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-8 border-l-blue-500 shadow-sm hover:shadow-md transition-shadow">
                          <h4 className="font-black text-blue-700 text-lg">1. Multimodal Extraction</h4>
                          <p className="text-sm text-slate-600 mt-2 font-medium">Text vectors are mathematically analyzed for Skill Density, SBERT Semantic Distance, and TF-IDF Lexical Overlap.</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 border-l-8 border-l-amber-500 shadow-sm hover:shadow-md transition-shadow">
                          <h4 className="font-black text-amber-700 text-lg">2. Ensemble Validation</h4>
                          <p className="text-sm text-slate-600 mt-2 font-medium">The Random Forest model cross-references these specific features to successfully ignore "AI keyword stuffing" and isolate true technical proficiency.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SKILLS TAB */}
                  {resultTab === 'skills' && (
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                        <h4 className="font-black text-emerald-600 uppercase text-xs tracking-widest flex items-center gap-2 mb-5">
                          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-sm shadow-emerald-500/50"></span> Verified Matches
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {singleResults.skill_analysis.common_skills?.map(skill => (
                            <span key={skill} className="px-3 py-1.5 bg-white text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold shadow-sm">{skill}</span>
                          ))}
                          {(!singleResults.skill_analysis.common_skills || singleResults.skill_analysis.common_skills.length === 0) && <span className="text-sm font-medium text-slate-400">No matching skills found.</span>}
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                        <h4 className="font-black text-red-500 uppercase text-xs tracking-widest flex items-center gap-2 mb-5">
                          <span className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm shadow-red-500/50 animate-pulse"></span> Missing Requirements
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {missingSkills.map(skill => (
                            <span key={skill} className="px-3 py-1.5 bg-white text-red-600 border border-red-200 rounded-lg text-xs font-bold shadow-sm">{skill}</span>
                          ))}
                          {missingSkills.length === 0 && <span className="text-sm font-medium text-slate-400">Perfect match. No missing skills.</span>}
                        </div>
                      </div>
                    </div>
                  )}

                 {/* COACH TAB */}
                 {resultTab === 'coach' && (
                    <div className="bg-white p-2">
                      <div 
                        className="prose prose-slate max-w-none prose-h3:text-slate-800 prose-strong:text-blue-600 prose-a:text-blue-600 prose-p:font-medium"
                        dangerouslySetInnerHTML={{ __html: singleResults.ai_feedback }} 
                      />
                    </div>
                  )}

                  {/* TAILOR TAB */}
                  {resultTab === 'tailor' && (
                    <div className="py-6">
                      {!tailoredResume ? (
                        <div className="text-center bg-slate-50 rounded-3xl border border-slate-200 p-12">
                          <div className="text-5xl mb-6">🪄</div>
                          <h3 className="text-xl font-black text-slate-800 mb-2">AI Resume Optimization</h3>
                          <p className="text-sm font-medium text-slate-500 mb-8 max-w-md mx-auto">Generate an ATS-friendly, keyword-optimized version of this candidate's resume specifically tailored to the target Job Description.</p>
                          <button onClick={handleTailor} disabled={tailorLoading} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-70">
                            {tailorLoading ? 'GENERATING ENHANCEMENTS...' : 'OPTIMIZE RESUME'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-left bg-white p-8 rounded-3xl border border-slate-200 shadow-sm prose prose-slate max-w-none prose-headings:text-slate-800 prose-p:font-medium">
                          <ReactMarkdown>{tailoredResume}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}

                  {/* COVER LETTER TAB */}
                  {resultTab === 'coverLetter' && (
                    <div className="py-6">
                      {!coverLetterText ? (
                        <div className="text-center bg-slate-50 rounded-3xl border border-slate-200 p-12">
                          <div className="text-5xl mb-6">✉️</div>
                          <h3 className="text-xl font-black text-slate-800 mb-2">Automated Cover Letter</h3>
                          <p className="text-sm font-medium text-slate-500 mb-8 max-w-md mx-auto">Draft a highly professional, compelling cover letter for this candidate based on their extracted skills and the target job requirements.</p>
                          <button onClick={handleGenerateCoverLetter} disabled={coverLetterLoading} className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-10 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-70">
                            {coverLetterLoading ? 'DRAFTING LETTER...' : 'GENERATE COVER LETTER'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-left bg-white p-10 rounded-3xl border border-slate-200 shadow-sm prose prose-slate max-w-none prose-p:font-medium">
                          <ReactMarkdown>{coverLetterText}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}

                  {/* CHAT TAB (RAG Copilot) */}
                  {resultTab === 'chat' && (
                    <div className="flex flex-col h-[550px] rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden shadow-inner">
                      
                      <div className="bg-white border-b border-slate-200 p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">🤖</div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800">RAG-Fusion Copilot</h4>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Secure Vector Memory Active</p>
                        </div>
                      </div>

                      <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar">
                        {chatHistory.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <span className="text-5xl mb-4">💬</span>
                            <p className="font-medium text-sm text-center max-w-xs">Ask specific questions about this candidate's history, projects, or technical proficiency.</p>
                          </div>
                        ) : (
                          chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] px-5 py-3.5 rounded-2xl text-sm font-medium shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'}`}>
                                {msg.content}
                              </div>
                            </div>
                          ))
                        )}
                        {chatLoading && (
                          <div className="flex justify-start">
                             <div className="px-5 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-400 text-xs font-black uppercase tracking-widest flex items-center gap-2 rounded-tl-sm shadow-sm">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></span>
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></span>
                             </div>
                          </div>
                        )}
                      </div>
                      
                      <form onSubmit={handleChat} className="p-4 bg-white border-t border-slate-200 flex gap-3">
                        <input 
                          type="text" 
                          value={chatQuestion} 
                          onChange={(e) => setChatQuestion(e.target.value)} 
                          placeholder="E.g., How many years of React experience does they have?" 
                          className="flex-1 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium" 
                          disabled={chatLoading} 
                        />
                        <button 
                          type="submit" 
                          disabled={chatLoading || !chatQuestion.trim()} 
                          className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-md active:scale-95"
                        >
                          Send
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // --- EMPTY STATE ---
              <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-20 flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-28 h-28 bg-slate-50 border border-slate-100 text-slate-400 rounded-full flex items-center justify-center text-5xl shadow-inner relative">
                  <span className="absolute top-0 right-0 w-4 h-4 bg-blue-500 rounded-full animate-ping"></span>
                  <span className="absolute top-0 right-0 w-4 h-4 bg-blue-500 rounded-full"></span>
                  📡
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Scanner Standby</h3>
                  <p className="text-slate-500 max-w-sm mt-2 font-medium leading-relaxed mx-auto">Upload a candidate document and select a target role to initiate the multi-vector AI analysis.</p>
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