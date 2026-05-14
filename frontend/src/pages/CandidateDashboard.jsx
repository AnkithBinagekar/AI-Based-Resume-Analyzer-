import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { useDropzone } from 'react-dropzone';
import { useLocation } from 'react-router-dom';
import 'react-circular-progressbar/dist/styles.css';
import XAIDial from '../components/XAIDial';

//const API_BASE_URL = 'http://127.0.0.1:8001';
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function CandidateDashboard() {
  const location = useLocation(); 
  
  const [uploadMode, setUploadMode] = useState('single');
  const [blindMode, setBlindMode] = useState(false); 
  const [file, setFile] = useState(null);
  
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

  const missingSkills = singleResults?.skill_analysis?.jd_skills_detected ? singleResults.skill_analysis.jd_skills_detected.filter(skill => !singleResults.skill_analysis.common_skills?.includes(skill)) : [];
  
  const innerTabStyle = (isActive) => `flex-1 py-3 px-4 text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${isActive ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
      
      {/* LEFT PANEL: UPLOAD FORM */}
      <div className="lg:col-span-4 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <form onSubmit={handleAnalyze}>
            
            {/* Candidate Resume Section */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Candidate Resume</label>
                <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                  <button type="button" onClick={() => {setUploadMode('single'); setFile(null);}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${uploadMode === 'single' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>PDF</button>
                  <button type="button" onClick={() => {setUploadMode('bulk'); setFile(null);}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${uploadMode === 'bulk' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>ZIP</button>
                </div>
              </div>

              <div {...getRootProps()} className={`relative group flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'}`}>
                <input {...getInputProps()} />
                {file ? (
                  <div className="flex items-center gap-3 w-full animate-in fade-in zoom-in duration-300">
                    <span className="text-3xl">📄</span>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
                      <p className="text-xs text-slate-500">Ready for scan</p>
                    </div>
                    <button type="button" className="p-1 hover:bg-red-100 rounded-full text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📂</div>
                    <p className="text-xs font-bold text-slate-600">{isDragActive ? "Drop Resume here!" : `Drag & drop ${uploadMode === 'single' ? '.pdf' : '.zip'}`}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Job Description Section */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Job Description</label>
                <div className="inline-flex bg-slate-100 p-1 rounded-lg">
                  <button type="button" onClick={() => setJdMode('saved')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jdMode === 'saved' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>DB Role</button>
                  <button type="button" onClick={() => {setJdMode('text'); setJdFile(null);}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jdMode === 'text' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Text</button>
                  <button type="button" onClick={() => {setJdMode('file'); setJd('');}} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${jdMode === 'file' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>File</button>
                </div>
              </div>

              {jdMode === 'saved' ? (
                <select value={selectedSavedJobId} onChange={(e) => setSelectedSavedJobId(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium">
                  {dbJobs.length === 0 ? <option value="">No jobs saved.</option> : null}
                  {dbJobs.map(job => (<option key={job.id} value={job.id}>{job.title}</option>))}
                </select>
              ) : jdMode === 'text' ? (
                <textarea rows="4" placeholder="Paste the target JD..." value={jd} onChange={(e) => setJd(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
              ) : (
                <div {...getJdRootProps()} className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isJdDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}>
                  <input {...getJdInputProps()} />
                  {jdFile ? (
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-2xl">🏢</span>
                      <p className="text-sm font-bold text-slate-800 truncate flex-1">{jdFile.name}</p>
                      <button type="button" className="text-red-500" onClick={(e) => { e.stopPropagation(); setJdFile(null); }}>✕</button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="text-2xl mb-1 block">🏢</span>
                      <p className="text-xs font-bold text-slate-600">Drop JD (.pdf, .png, .jpg)</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Blind Mode Toggle */}
            <div 
              onClick={() => setBlindMode(!blindMode)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all mb-8 ${blindMode ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-100' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}
            >
              <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${blindMode ? 'bg-emerald-500 text-white' : 'bg-slate-300'}`}>
                {blindMode && "✓"}
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-bold ${blindMode ? 'text-emerald-800' : 'text-slate-700'}`}>🛡️ Enable Blind Hiring Mode</h4>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tighter">Strip Personal Identifiable Info</p>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50">
              {loading ? "AI MODELS PROCESSING..." : "ANALYZE MATCH"}
            </button>
          </form>
          
          {error && (
            <div className={`mt-6 p-4 rounded-xl text-sm font-bold animate-bounce ${error.includes('FRAUD') ? 'bg-red-100 text-red-700 border-2 border-red-200' : 'bg-amber-100 text-amber-700 border-2 border-amber-200'}`}>
              {error.includes('FRAUD') ? '🛑 ' : '⚠️ '} {error}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: RESULTS */}
      <div className="lg:col-span-8">
        {singleResults ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Results Header */}
            <div className="bg-slate-900 p-8 text-white flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/30">Intelligence Report</span>
                <h2 className="text-3xl font-black mt-2">Analysis Complete</h2>
                <p className="text-slate-400 font-medium text-sm mt-1 flex items-center gap-2 italic">
                  <span className="not-italic">📄</span> {singleResults.processed_filename}
                </p>
              </div>
              <div className="w-28 h-28 bg-white/5 p-2 rounded-full backdrop-blur-sm border border-white/10">
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

            {/* Sub-Tabs */}
            <div className="flex bg-slate-50 border-b border-slate-200 overflow-x-auto hide-scrollbar">
              <button onClick={() => setResultTab('overview')} className={innerTabStyle(resultTab === 'overview')}>📊 Overview</button>
              <button onClick={() => setResultTab('logic')} className={innerTabStyle(resultTab === 'logic')}>⚙️ AI Logic</button>
              <button onClick={() => setResultTab('skills')} className={innerTabStyle(resultTab === 'skills')}>🎯 Skills</button>
              <button onClick={() => setResultTab('coach')} className={innerTabStyle(resultTab === 'coach')}>✨ Coach</button>
              <button onClick={() => setResultTab('tailor')} className={innerTabStyle(resultTab === 'tailor')}>🪄 Tailor</button>
              <button onClick={() => setResultTab('coverLetter')} className={innerTabStyle(resultTab === 'coverLetter')}>✉️ Letter</button>
              <button onClick={() => setResultTab('chat')} className={innerTabStyle(resultTab === 'chat')}>🤖 Chat</button>
            </div>

            <div className="p-8">
              {resultTab === 'overview' && (
                <div className="space-y-10">
                  
                  {/* --- SMART ALERTS SECTION --- */}
                  {singleResults?.smart_alerts && singleResults.smart_alerts.length > 0 && (
                    <div className="space-y-3 animate-in fade-in duration-500">
                      {singleResults.smart_alerts.map((alert, index) => (
                        <div 
                          key={index} 
                          className={`p-4 rounded-xl border flex items-start gap-4 ${
                            alert.type === 'warning' 
                              ? 'bg-amber-50 border-amber-200 text-amber-800' 
                              : 'bg-red-50 border-red-200 text-red-800'
                          }`}
                        >
                          <div className="mt-0.5 text-lg">
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
                  {/* --- END SMART ALERTS --- */}

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                      { label: 'Skill Overlap', value: `${(singleResults.feature_breakdown.skill_overlap_score * 100).toFixed(1)}%` },
                      { label: 'Semantic', value: `${(singleResults.feature_breakdown.semantic_score * 100).toFixed(1)}%` },
                      { label: 'Lexical', value: `${(singleResults.feature_breakdown.lexical_score * 100).toFixed(1)}%` },
                      { label: 'Experience', value: `${singleResults.yoe || 0} Yrs`, highlight: true },
                      { label: 'Education', value: singleResults.education || "Unknown", highlight: true, truncate: true },
                    ].map((item, idx) => (
                      <div key={idx} className={`p-4 rounded-xl border text-center transition-transform hover:scale-105 ${item.highlight ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-800'}`}>
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-1">{item.label}</h4>
                        <p className={`font-bold ${item.truncate ? 'truncate text-xs' : 'text-xl'}`} title={item.value}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <XAIDial featureBreakdown={singleResults.feature_breakdown} />
                  </div>
                </div>
              )}

              {resultTab === 'logic' && (
                <div className="bg-slate-50 p-8 rounded-3xl border border-slate-200">
                  <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                    <span className="p-2 bg-blue-100 rounded-lg text-blue-600">🧠</span> 
                    Random Forest Decision Engine
                  </h3>
                  <p className="text-slate-500 mb-8 leading-relaxed">The system evaluates the candidate using 100+ decision trees to weigh context over simple keyword frequency.</p>
                  <div className="grid gap-4">
                    <div className="bg-white p-5 rounded-2xl border-l-8 border-blue-500 shadow-sm">
                      <h4 className="font-black text-blue-700">1. Multimodal Extraction</h4>
                      <p className="text-sm text-slate-600">Vectors analyzed for Skill Density, Semantic Distance, and Lexical Overlap.</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border-l-8 border-amber-500 shadow-sm">
                      <h4 className="font-black text-amber-700">2. Ensemble Validation</h4>
                      <p className="text-sm text-slate-600">Random Forest cross-references features to ignore "AI keyword stuffing".</p>
                    </div>
                  </div>
                </div>
              )}

              {resultTab === 'skills' && (
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-4">
                    <h4 className="font-black text-emerald-600 uppercase text-xs tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 bg-emerald-600 rounded-full"></span> Matched Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {singleResults.skill_analysis.common_skills?.map(skill => (
                        <span key={skill} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg text-xs font-bold">{skill}</span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-black text-red-500 uppercase text-xs tracking-widest flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span> Missing Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {missingSkills.map(skill => (
                        <span key={skill} className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold">{skill}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

             {resultTab === 'coach' && (
                <div 
                  className="prose prose-slate max-w-none prose-h3:text-slate-800 prose-strong:text-blue-600"
                  dangerouslySetInnerHTML={{ __html: singleResults.ai_feedback }} 
                />
              )}

              {resultTab === 'tailor' && (
                <div className="text-center py-10">
                  {!tailoredResume ? (
                    <button onClick={handleTailor} disabled={tailorLoading} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-lg shadow-purple-500/20 active:scale-95">
                      {tailorLoading ? '🪄 GENERATING ENHANCEMENTS...' : '🪄 OPTIMIZE RESUME FOR THIS ROLE'}
                    </button>
                  ) : (
                    <div className="text-left bg-slate-50 p-8 rounded-3xl border border-slate-200 prose prose-slate max-w-none">
                      <ReactMarkdown>{tailoredResume}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {resultTab === 'coverLetter' && (
                <div className="text-center py-10">
                  {!coverLetterText ? (
                    <button onClick={handleGenerateCoverLetter} disabled={coverLetterLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 px-10 rounded-2xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
                      {coverLetterLoading ? '✉️ DRAFTING LETTER...' : '✉️ GENERATE COVER LETTER'}
                    </button>
                  ) : (
                    <div className="text-left bg-slate-50 p-8 rounded-3xl border border-slate-200 prose prose-slate max-w-none">
                      <ReactMarkdown>{coverLetterText}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {resultTab === 'chat' && (
                <div className="flex flex-col h-[500px] rounded-3xl border border-slate-200 bg-slate-50 overflow-hidden">
                  <div className="flex-1 p-6 overflow-y-auto space-y-4">
                    {chatHistory.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 italic">
                        <span className="text-4xl not-italic mb-2">👋</span>
                        <p>Ask anything about this candidate's history.</p>
                      </div>
                    ) : (
                      chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm font-medium shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                            {msg.content}
                          </div>
                        </div>
                      ))
                    )}
                    {chatLoading && <div className="text-xs font-black text-blue-600 animate-pulse uppercase tracking-widest">AI RECRUITER ANALYZING...</div>}
                  </div>
                  <form onSubmit={handleChat} className="p-4 bg-white border-t border-slate-200 flex gap-2">
                    <input type="text" value={chatQuestion} onChange={(e) => setChatQuestion(e.target.value)} placeholder="Type a question..." className="flex-1 bg-slate-100 px-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm" disabled={chatLoading} />
                    <button type="submit" disabled={chatLoading || !chatQuestion.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold transition-all disabled:opacity-50">Send</button>
                  </form>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-20 flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="w-24 h-24 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center text-5xl animate-pulse">✨</div>
            <div>
              <h3 className="text-2xl font-black text-slate-800">Intelligence Engine Standby</h3>
              <p className="text-slate-500 max-w-sm mt-2 font-medium leading-relaxed">Upload a resume and link a job description to trigger the multi-vector AI analysis.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CandidateDashboard;