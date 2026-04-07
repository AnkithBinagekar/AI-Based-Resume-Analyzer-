import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { useDropzone } from 'react-dropzone';
import 'react-circular-progressbar/dist/styles.css';
import XAIDial from './components/XAIDial';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('analyze'); 
  const [uploadMode, setUploadMode] = useState('single');
  const [blindMode, setBlindMode] = useState(false); 
  
  const [file, setFile] = useState(null);
  
  const [jdMode, setJdMode] = useState('saved'); 
  const [jd, setJd] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [selectedSavedJobId, setSelectedSavedJobId] = useState('');
  
  const [singleResults, setSingleResults] = useState(null);
  const [bulkResults, setBulkResults] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [dbCandidates, setDbCandidates] = useState([]);
  const [dbJobs, setDbJobs] = useState([]);
  
  const [tailorLoading, setTailorLoading] = useState(false);
  const [tailoredResume, setTailoredResume] = useState('');
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterText, setCoverLetterText] = useState('');
  
  const [chatHistory, setChatHistory] = useState([]);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  const [resultTab, setResultTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState('all');

  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobDept, setNewJobDept] = useState('');
  const [newJobInputMode, setNewJobInputMode] = useState('text'); 
  const [newJobText, setNewJobText] = useState('');
  const [newJobFile, setNewJobFile] = useState(null);
  const [creatingJob, setCreatingJob] = useState(false);

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

  const onNewJobFileDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) setNewJobFile(acceptedFiles[0]);
  }, []);
  const { getRootProps: getNewJobRootProps, getInputProps: getNewJobInputProps, isDragActive: isNewJobDragActive } = useDropzone({
    onDrop: onNewJobFileDrop, accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] }, multiple: false
  });

  useEffect(() => {
    fetchCandidates();
    fetchJobs();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8001/api/candidates');
      setDbCandidates(response.data.data);
    } catch (err) { console.error("Failed to fetch candidates", err); }
  };

  const fetchJobs = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8001/api/jobs');
      setDbJobs(response.data.data);
      if (response.data.data.length > 0 && !selectedSavedJobId) {
        setSelectedSavedJobId(response.data.data[0].id);
      }
    } catch (err) { console.error("Failed to fetch jobs", err); }
  };

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
      const endpoint = uploadMode === 'single' ? 'http://127.0.0.1:8001/analyze' : 'http://127.0.0.1:8001/analyze-bulk';
      const response = await axios.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (uploadMode === 'single') setSingleResults(response.data.data);
      else setBulkResults(response.data.data);
      fetchCandidates(); 
    } catch (err) {
      let errorMsg = "An error occurred during analysis.";
      if (err.response?.data?.detail) errorMsg = typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail);
      else if (err.message) errorMsg = err.message;
      setError(errorMsg);
    } finally { setLoading(false); }
  };

  const createNewJob = async (e) => {
    e.preventDefault();
    if (!newJobTitle) return alert("Title is required");
    if (newJobInputMode === 'text' && !newJobText) return alert("Job text is required");
    if (newJobInputMode === 'file' && !newJobFile) return alert("Job file is required");

    setCreatingJob(true);
    const formData = new FormData();
    formData.append('title', newJobTitle);
    formData.append('department', newJobDept || 'General');
    
    if (newJobInputMode === 'text') {
      formData.append('job_description_text', newJobText);
    } else {
      formData.append('job_description_file', newJobFile);
    }

    try {
      await axios.post('http://127.0.0.1:8001/api/jobs', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchJobs(); 
      setNewJobTitle(''); setNewJobDept(''); setNewJobText(''); setNewJobFile(null);
      alert("Job Saved to Database successfully!");
    } catch (err) {
      alert("Failed to save Job to Database.");
    } finally {
      setCreatingJob(false);
    }
  };

  const handleTailor = async () => { setTailorLoading(true); setTailoredResume(''); const formData = new FormData(); formData.append('resume_file', file); formData.append('job_description', singleResults?.cleaned_jd || jd); try { const response = await axios.post('http://127.0.0.1:8001/tailor', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); setTailoredResume(response.data.tailored_resume); } catch (err) { alert("Failed to tailor"); } finally { setTailorLoading(false); } };
  const handleGenerateCoverLetter = async () => { setCoverLetterLoading(true); setCoverLetterText(''); const formData = new FormData(); formData.append('resume_file', file); formData.append('job_description', singleResults?.cleaned_jd || jd); try { const response = await axios.post('http://127.0.0.1:8001/generate-cover-letter', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); setCoverLetterText(response.data.cover_letter); } catch (err) { alert("Failed to write letter"); } finally { setCoverLetterLoading(false); } };
  const handleChat = async (e) => { e.preventDefault(); if (!chatQuestion.trim()) return; const newQuestion = chatQuestion; setChatHistory(prev => [...prev, { role: 'user', content: newQuestion }]); setChatQuestion(''); setChatLoading(true); const formData = new FormData(); formData.append('resume_file', file); formData.append('question', newQuestion); try { const response = await axios.post('http://127.0.0.1:8001/chat-resume', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); setChatHistory(prev => [...prev, { role: 'ai', content: response.data.answer }]); } catch (err) { setChatHistory(prev => [...prev, { role: 'ai', content: "⚠️ Failed to reach AI backend." }]); } finally { setChatLoading(false); } };

  const missingSkills = singleResults?.skill_analysis?.jd_skills_detected ? singleResults.skill_analysis.jd_skills_detected.filter(skill => !singleResults.skill_analysis.common_skills?.includes(skill)) : [];
  const innerTabStyle = (isActive) => ({ padding: '12px 18px', cursor: 'pointer', borderBottom: isActive ? '3px solid #3498db' : '3px solid transparent', color: isActive ? '#2c3e50' : '#7f8c8d', fontWeight: isActive ? 'bold' : 'normal', background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', fontSize: '0.9rem', flex: '1', whiteSpace: 'nowrap' });
  
  const filteredCandidates = dbCandidates.filter(c => { const matchesSearch = c.filename.toLowerCase().includes(searchTerm.toLowerCase()); let matchesScore = true; if (scoreFilter === 'high') matchesScore = c.final_score >= 75; else if (scoreFilter === 'medium') matchesScore = c.final_score >= 50 && c.final_score < 75; else if (scoreFilter === 'low') matchesScore = c.final_score < 50; return matchesSearch && matchesScore; });
  const avgScore = dbCandidates.length > 0 ? (dbCandidates.reduce((acc, c) => acc + c.final_score, 0) / dbCandidates.length).toFixed(1) : 0;
  const topCandidatesCount = dbCandidates.filter(c => c.final_score >= 75).length;

  return (
    <div className="container">
      <header className="app-header">
        <h1>AI Resume Analyzer </h1>
      </header>
      
      <div className="nav-tabs">
        <button className={activeTab === 'analyze' ? 'tab active' : 'tab'} onClick={() => setActiveTab('analyze')}>New Analysis</button>
        <button className={activeTab === 'jobs' ? 'tab active' : 'tab'} onClick={() => setActiveTab('jobs')}>Job Board</button>
        <button className={activeTab === 'database' ? 'tab active' : 'tab'} onClick={() => setActiveTab('database')}>HR Dashboard</button>
      </div>

      {activeTab === 'analyze' && (
        <div className="dashboard-layout">
          <div className="left-panel">
            <div className="upload-card">
              <form onSubmit={handleAnalyze}>
                <div className="input-group">
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <label>Candidate Resume</label>
                    <div className="mode-toggle" style={{margin: 0, padding: '2px 4px'}}>
                      <label className={uploadMode === 'single' ? 'radio-btn active' : 'radio-btn'} style={{padding: '4px 8px', fontSize: '0.8rem'}}><input type="radio" checked={uploadMode === 'single'} onChange={() => {setUploadMode('single'); setFile(null);}} /> PDF</label>
                      <label className={uploadMode === 'bulk' ? 'radio-btn active' : 'radio-btn'} style={{padding: '4px 8px', fontSize: '0.8rem'}}><input type="radio" checked={uploadMode === 'bulk'} onChange={() => {setUploadMode('bulk'); setFile(null);}} /> ZIP</label>
                    </div>
                  </div>
                  <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                    <input {...getInputProps()} />
                    {file ? (
                      <div className="file-preview"><span className="file-icon">📄</span><div className="file-info"><span className="file-name">{file.name}</span></div><button type="button" className="remove-file-btn" onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button></div>
                    ) : (
                      <div className="dropzone-text"><span className="drop-icon">📂</span><p>{isDragActive ? "Drop Resume here!" : `Drag & drop ${uploadMode === 'single' ? '.pdf' : '.zip'}`}</p></div>
                    )}
                  </div>
                </div>

                <div className="input-group" style={{marginTop: '2rem'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <label>Job Description</label>
                    <div className="mode-toggle" style={{margin: 0, padding: '2px 4px'}}>
                      <label className={jdMode === 'saved' ? 'radio-btn active' : 'radio-btn'} style={{padding: '4px 8px', fontSize: '0.8rem'}}><input type="radio" checked={jdMode === 'saved'} onChange={() => setJdMode('saved')} /> DB Role</label>
                      <label className={jdMode === 'text' ? 'radio-btn active' : 'radio-btn'} style={{padding: '4px 8px', fontSize: '0.8rem'}}><input type="radio" checked={jdMode === 'text'} onChange={() => {setJdMode('text'); setJdFile(null);}} /> Text</label>
                      <label className={jdMode === 'file' ? 'radio-btn active' : 'radio-btn'} style={{padding: '4px 8px', fontSize: '0.8rem'}}><input type="radio" checked={jdMode === 'file'} onChange={() => {setJdMode('file'); setJd('');}} /> File</label>
                    </div>
                  </div>

                  {jdMode === 'saved' ? (
                    <select value={selectedSavedJobId} onChange={(e) => setSelectedSavedJobId(e.target.value)} style={{width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #bdc3c7', background: 'white'}}>
                      {dbJobs.length === 0 ? <option value="">No jobs saved in database.</option> : null}
                      {dbJobs.map(job => (<option key={job.id} value={job.id}>{job.title}</option>))}
                    </select>
                  ) : jdMode === 'text' ? (
                    <textarea rows="5" placeholder="Paste the target JD..." value={jd} onChange={(e) => setJd(e.target.value)} />
                  ) : (
                    <div {...getJdRootProps()} className={`dropzone ${isJdDragActive ? 'active' : ''}`}>
                      <input {...getJdInputProps()} />
                      {jdFile ? (
                        <div className="file-preview"><span className="file-icon">🏢</span><div className="file-info"><span className="file-name">{jdFile.name}</span></div><button type="button" className="remove-file-btn" onClick={(e) => { e.stopPropagation(); setJdFile(null); }}>✕</button></div>
                      ) : (
                        <div className="dropzone-text"><span className="drop-icon">🏢</span><p>Drag & drop JD (.pdf, .png, .jpg)</p></div>
                      )}
                    </div>
                  )}
                </div>

                <div className="blind-mode-toggle" style={{ background: blindMode ? '#e8f5e9' : '#f8f9fa', borderColor: blindMode ? '#2ecc71' : '#dee2e6' }}>
                  <label><input type="checkbox" checked={blindMode} onChange={(e) => setBlindMode(e.target.checked)} /><div><h4 style={{ color: blindMode ? '#27ae60' : '#2c3e50' }}>🛡️ Enable Blind Hiring Mode</h4></div></label>
                </div>

                <button type="submit" disabled={loading} className="primary-btn">{loading ? "Running AI Models..." : "Analyze Match"}</button>
              </form>
              {error && <div className={`error-banner ${typeof error === 'string' && error.includes('FRAUD') ? 'fraud' : ''}`}>{typeof error === 'string' && error.includes('FRAUD') ? '🛑 ' : '⚠️ '} {error}</div>}
            </div>
          </div>

          <div className="right-panel">
            {singleResults && (
              <div className="results-card">
                <div className="results-header">
                  <div><h2>Analysis Complete</h2><p>{singleResults.processed_filename}</p></div>
                  <div className="progress-container">
                    <CircularProgressbar value={singleResults.final_match_score_percentage} text={`${singleResults.final_match_score_percentage}%`} styles={buildStyles({textSize: '24px', pathColor: singleResults.final_match_score_percentage >= 75 ? '#2ecc71' : singleResults.final_match_score_percentage >= 50 ? '#f39c12' : '#e74c3c', textColor: '#2c3e50', trailColor: '#e0e0e0'})} />
                  </div>
                </div>

                <div className="inner-tabs" style={{display: 'flex', overflowX: 'auto'}}>
                  <button style={innerTabStyle(resultTab === 'overview')} onClick={() => setResultTab('overview')}>📊 Overview</button>
                  <button style={innerTabStyle(resultTab === 'logic')} onClick={() => setResultTab('logic')}>⚙️ AI Logic</button>
                  <button style={innerTabStyle(resultTab === 'skills')} onClick={() => setResultTab('skills')}>🎯 Skills</button>
                  <button style={innerTabStyle(resultTab === 'coach')} onClick={() => setResultTab('coach')}>✨ Coach</button>
                  <button style={innerTabStyle(resultTab === 'tailor')} onClick={() => setResultTab('tailor')}>🪄 Tailor</button>
                  <button style={innerTabStyle(resultTab === 'coverLetter')} onClick={() => setResultTab('coverLetter')}>✉️ Letter</button>
                  <button style={innerTabStyle(resultTab === 'chat')} onClick={() => setResultTab('chat')}>🤖 Chat</button>
                </div>

                <div className="tab-content">
                  {resultTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div className="metrics-grid">
                        <div className="metric-box"><h4>Skill Overlap</h4><p>{(singleResults.feature_breakdown.skill_overlap_score * 100).toFixed(1)}%</p></div>
                        <div className="metric-box"><h4>Semantic</h4><p>{(singleResults.feature_breakdown.semantic_score * 100).toFixed(1)}%</p></div>
                        <div className="metric-box"><h4>Lexical</h4><p>{(singleResults.feature_breakdown.lexical_score * 100).toFixed(1)}%</p></div>
                        
                        {/* THE FIX FOR YOE/EDU DISPLAY IS HERE */}
                        <div className="metric-box" style={{background: '#e8f5e9', borderColor: '#2ecc71'}}>
                          <h4>Experience</h4>
                          <p>{singleResults.yoe !== undefined ? singleResults.yoe : 0} Yrs</p>
                        </div>
                        <div className="metric-box" style={{background: '#e8f5e9', borderColor: '#2ecc71'}}>
                          <h4>Education</h4>
                          <p style={{fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                            {singleResults.education || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '10px' }}><XAIDial featureBreakdown={singleResults.feature_breakdown} /></div>
                    </div>
                  )}

                  {resultTab === 'logic' && (
                    <div className="xai-dashboard" style={{background: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #e0e0e0'}}>
                      <h3 style={{color: '#2c3e50', marginBottom: '15px'}}>🧠 Random Forest Decision Engine</h3>
                      <p style={{fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '20px'}}>Instead of a simple average, our system uses an ensemble of Decision Trees to prevent overfitting.</p>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                        <div style={{background: 'white', padding: '15px', borderRadius: '6px', borderLeft: '4px solid #3498db', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}><h4 style={{margin: '0 0 5px 0', color: '#2980b9'}}>1. Data Extraction</h4><p style={{margin: 0, fontSize: '0.85rem'}}>Extracted Skill, Semantic, and Lexical vectors.</p></div>
                        <div style={{background: 'white', padding: '15px', borderRadius: '6px', borderLeft: '4px solid #f39c12', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}><h4 style={{margin: '0 0 5px 0', color: '#d35400'}}>2. The Forest Ensemble</h4><p style={{margin: 0, fontSize: '0.85rem'}}>100 independent Decision Trees weigh Context over Keyword Stuffing.</p></div>
                      </div>
                    </div>
                  )}

                  {resultTab === 'skills' && (
                    <div className="skills-grid">
                      <div className="skills-section"><h4>Matched Skills</h4><div className="tags">{singleResults.skill_analysis.common_skills?.map(skill => <span key={skill} className="tag match">{skill}</span>)}</div></div>
                      <div className="skills-section"><h4>Missing Skills</h4><div className="tags">{missingSkills.map(skill => <span key={skill} className="tag missing">{skill}</span>)}</div></div>
                    </div>
                  )}
                  {resultTab === 'coach' && <div className="ai-coach-box"><div className="markdown-body"><ReactMarkdown components={{a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" {...props} />}}>{singleResults.ai_feedback}</ReactMarkdown></div></div>}
                  {resultTab === 'tailor' && <div className="tailor-box">{!tailoredResume ? <div className="text-center"><button onClick={handleTailor} disabled={tailorLoading} className="tailor-btn">{tailorLoading ? '🪄 Rewriting...' : '🪄 Auto-Tailor Resume'}</button></div> : <div className="tailored-resume-card"><div className="markdown-body"><ReactMarkdown>{tailoredResume}</ReactMarkdown></div></div>}</div>}
                  {resultTab === 'coverLetter' && <div className="tailor-box">{!coverLetterText ? <div className="text-center"><button onClick={handleGenerateCoverLetter} disabled={coverLetterLoading} className="tailor-btn">{coverLetterLoading ? '✉️ Writing Letter...' : '✉️ Auto-Generate Cover Letter'}</button></div> : <div className="tailored-resume-card"><div className="markdown-body"><ReactMarkdown>{coverLetterText}</ReactMarkdown></div></div>}</div>}
                  {resultTab === 'chat' && (
                    <div className="chat-container" style={{ display: 'flex', flexDirection: 'column', height: '400px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fafafa' }}>
                      <div className="chat-history" style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
                        {chatHistory.length === 0 ? <div className="text-center" style={{ color: '#7f8c8d', marginTop: '2rem' }}><p>Ask the AI Recruiter Copilot questions about this resume.</p></div> : chatHistory.map((msg, idx) => (
                          <div key={idx} style={{ marginBottom: '12px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                            <span style={{ display: 'inline-block', padding: '8px 12px', borderRadius: '16px', background: msg.role === 'user' ? '#3498db' : '#ecf0f1', color: msg.role === 'user' ? 'white' : '#2c3e50', maxWidth: '80%' }}>{msg.content}</span>
                          </div>
                        ))}
                        {chatLoading && <div style={{ textAlign: 'left', color: '#7f8c8d' }}>Typing...</div>}
                      </div>
                      <form onSubmit={handleChat} style={{ display: 'flex', padding: '12px', borderTop: '1px solid #e0e0e0', background: 'white' }}>
                        <input type="text" value={chatQuestion} onChange={(e) => setChatQuestion(e.target.value)} placeholder="Ask a question..." style={{ flex: 1, padding: '10px', border: '1px solid #bdc3c7', borderRadius: '4px', marginRight: '8px' }} disabled={chatLoading} />
                        <button type="submit" disabled={chatLoading || !chatQuestion.trim()} style={{ background: '#2ecc71', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '4px' }}>Send</button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            )}
            {!singleResults && !bulkResults && !loading && (
              <div className="empty-state-card"><h3>Ready for Analysis</h3><p>Upload a resume and select an Open Role to see the AI breakdown here.</p></div>
            )}
          </div>
        </div>
      )}

      {/* JOB BOARD TAB */}
      {activeTab === 'jobs' && (
        <div className="dashboard-layout">
          <div className="left-panel">
            <div className="upload-card">
              <h3>➕ Add Position to Database</h3>
              <form onSubmit={createNewJob} style={{display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px'}}>
                <div><label>Job Title</label><input type="text" required value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} style={{width: '100%', padding: '10px'}} /></div>
                <div><label>Department</label><input type="text" value={newJobDept} onChange={e => setNewJobDept(e.target.value)} style={{width: '100%', padding: '10px'}} /></div>
                
                <div style={{marginTop: '10px'}}>
                  <label>Job Description Source</label>
                  <div className="mode-toggle" style={{margin: '0 0 10px 0'}}>
                    <label className={newJobInputMode === 'text' ? 'radio-btn active' : 'radio-btn'}><input type="radio" checked={newJobInputMode === 'text'} onChange={() => {setNewJobInputMode('text'); setNewJobFile(null);}} /> Text</label>
                    <label className={newJobInputMode === 'file' ? 'radio-btn active' : 'radio-btn'}><input type="radio" checked={newJobInputMode === 'file'} onChange={() => {setNewJobInputMode('file'); setNewJobText('');}} /> File</label>
                  </div>
                  {newJobInputMode === 'text' ? (
                    <textarea required rows="6" value={newJobText} onChange={e => setNewJobText(e.target.value)} style={{width: '100%', padding: '10px'}} />
                  ) : (
                    <div {...getNewJobRootProps()} className={`dropzone ${isNewJobDragActive ? 'active' : ''}`} style={{minHeight: '120px'}}>
                      <input {...getNewJobInputProps()} />
                      {newJobFile ? <div className="file-preview"><span className="file-name">{newJobFile.name}</span><button type="button" onClick={(e) => { e.stopPropagation(); setNewJobFile(null); }}>✕</button></div> : <div className="dropzone-text"><p>Drop PDF or Image here</p></div>}
                    </div>
                  )}
                </div>
                <button type="submit" disabled={creatingJob} className="primary-btn">{creatingJob ? 'Saving...' : 'Save Position'}</button>
              </form>
            </div>
          </div>
          
          <div className="right-panel" style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h2 style={{color: '#2c3e50'}}>Database Job Listings</h2>
              <span style={{background: '#3498db', color: 'white', padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold'}}>{dbJobs.length} Saved</span>
            </div>
            {dbJobs.length === 0 ? (
              <div className="empty-state-card" style={{padding: '40px'}}><h3>No Jobs</h3></div>
            ) : (
              dbJobs.map(job => (
                <div key={job.id} style={{background: 'white', padding: '20px', borderRadius: '8px', borderLeft: '4px solid #3498db', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><h3 style={{margin: '0 0 5px 0'}}>{job.title}</h3></div>
                  <p style={{margin: 0, fontSize: '0.9rem', color: '#34495e', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{job.description_text}</p>
                  <button onClick={() => { setSelectedSavedJobId(job.id); setJdMode('saved'); setActiveTab('analyze'); }} style={{marginTop: '15px', background: '#ecf0f1', color: '#2c3e50', border: '1px solid #bdc3c7', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer'}}>🎯 Analyze Candidates</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* HR DASHBOARD TAB */}
      {activeTab === 'database' && (
        <div className="dashboard-card full-width">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '20px' }}>
            <h2>Enterprise HR Dashboard</h2>
            <div style={{ display: 'flex', gap: '15px' }}>
              <input type="text" placeholder="🔍 Search candidates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #bdc3c7', minWidth: '250px' }} />
              <select value={scoreFilter} onChange={(e) => setScoreFilter(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #bdc3c7', background: 'white' }}>
                <option value="all">All Scores</option><option value="high">High Match (&ge;75%)</option><option value="medium">Medium Match (50-74%)</option><option value="low">Low Match (&lt;50%)</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table className="ats-table">
              <thead><tr><th>ID</th><th>Candidate File</th><th>Match Score</th><th>Experience</th><th>Education</th><th>Date Scanned</th></tr></thead>
              <tbody>
                {filteredCandidates.length > 0 ? filteredCandidates.map((c) => (
                  <tr key={c.id}>
                    <td>#{c.id}</td><td className="file-cell" style={{ fontWeight: 'bold' }}>{c.filename}</td>
                    <td><span className={`score-badge ${c.final_score >= 75 ? 'high' : c.final_score >= 50 ? 'medium' : 'low'}`} style={{background: c.final_score >= 75 ? '#2ecc71' : c.final_score >= 50 ? '#f39c12' : '#e74c3c', color: 'white', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold'}}>{c.final_score}%</span></td>
                    <td style={{ color: '#2c3e50', fontWeight: 'bold' }}>{c.total_yoe ?? 0} Yrs</td>
                    <td style={{ color: '#7f8c8d' }}>{c.highest_education ?? "Unknown"}</td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                )) : <tr><td colSpan="6" className="text-center" style={{ padding: '20px', color: '#7f8c8d' }}>No candidates found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;