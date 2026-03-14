import { useState, useEffect, useCallback } from 'react';
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
  
  // JD Input Modes
  const [jdMode, setJdMode] = useState('text'); // 'text' or 'file'
  const [jd, setJd] = useState('');
  const [jdFile, setJdFile] = useState(null);
  
  const [singleResults, setSingleResults] = useState(null);
  const [bulkResults, setBulkResults] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [dbCandidates, setDbCandidates] = useState([]);
  const [tailorLoading, setTailorLoading] = useState(false);
  const [tailoredResume, setTailoredResume] = useState('');
  const [resultTab, setResultTab] = useState('overview');

  // --- RESUME DRAG & DROP ---
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) setFile(acceptedFiles[0]);
  }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: uploadMode === 'single' ? { 'application/pdf': ['.pdf'] } : { 'application/zip': ['.zip', 'application/x-zip-compressed'] }, multiple: false
  });

  // --- JD DRAG & DROP ---
  const onJdDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) setJdFile(acceptedFiles[0]);
  }, []);
  const { getRootProps: getJdRootProps, getInputProps: getJdInputProps, isDragActive: isJdDragActive } = useDropzone({
    onDrop: onJdDrop, accept: { 'application/pdf': ['.pdf'] }, multiple: false
  });

  useEffect(() => {
    if (activeTab === 'database') fetchCandidates();
  }, [activeTab]);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8001/api/candidates');
      setDbCandidates(response.data.data);
    } catch (err) {
      console.error("Failed to fetch records", err);
    }
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please provide a Candidate file.");
    if (jdMode === 'text' && !jd) return setError("Please paste a Job Description.");
    if (jdMode === 'file' && !jdFile) return setError("Please upload a Job Description PDF.");

    setLoading(true); setError(''); setSingleResults(null);
    setBulkResults(null); setTailoredResume(''); setResultTab('overview');

    const formData = new FormData();
    formData.append(uploadMode === 'single' ? 'resume_file' : 'resume_zip', file);
    formData.append('blind_mode', blindMode);
    
    if (jdMode === 'text') {
      formData.append('job_description_text', jd);
    } else {
      formData.append('job_description_file', jdFile);
    }

    try {
      const endpoint = uploadMode === 'single' ? 'http://127.0.0.1:8001/analyze' : 'http://127.0.0.1:8001/analyze-bulk';
      const response = await axios.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      
      if (uploadMode === 'single') setSingleResults(response.data.data);
      else setBulkResults(response.data.data);
    } catch (err) {
      console.error("Full API Error:", err);
      let errorMsg = "An error occurred during analysis.";
      
      // Bulletproof error parsing to prevent React crashes
      if (err.response?.data?.detail) {
        errorMsg = typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : JSON.stringify(err.response.data.detail);
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleTailor = async () => {
    setTailorLoading(true); setTailoredResume('');
    const formData = new FormData();
    formData.append('resume_file', file);
    formData.append('job_description', singleResults?.cleaned_jd || jd); 

    try {
      const response = await axios.post('http://127.0.0.1:8001/tailor', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTailoredResume(response.data.tailored_resume);
    } catch (err) {
      alert("Failed to generate tailored resume.");
    } finally {
      setTailorLoading(false);
    }
  };

  // Bulletproof skill filtering using Optional Chaining (?.)
  const missingSkills = singleResults?.skill_analysis?.jd_skills_detected 
    ? singleResults.skill_analysis.jd_skills_detected.filter(
        skill => !singleResults.skill_analysis.common_skills?.includes(skill)
      ) 
    : [];

  const innerTabStyle = (isActive) => ({
    padding: '12px 20px', cursor: 'pointer', borderBottom: isActive ? '3px solid #3498db' : '3px solid transparent',
    color: isActive ? '#2c3e50' : '#7f8c8d', fontWeight: isActive ? 'bold' : 'normal',
    background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none', fontSize: '0.95rem', flex: '1'
  });

  return (
    <div className="container">
      <header className="app-header">
        <h1>AI Resume Analyzer <span>Enterprise ATS</span></h1>
      </header>
      
      <div className="nav-tabs">
        <button className={activeTab === 'analyze' ? 'tab active' : 'tab'} onClick={() => setActiveTab('analyze')}>New Analysis</button>
        <button className={activeTab === 'database' ? 'tab active' : 'tab'} onClick={() => setActiveTab('database')}>Candidate Database</button>
      </div>

      {activeTab === 'analyze' && (
        <div className="dashboard-layout">
          {/* LEFT COLUMN: CONTROL PANEL */}
          <div className="left-panel">
            <div className="upload-card">
              
              <form onSubmit={handleAnalyze}>
                {/* 1. RESUME DROPZONE */}
                <div className="input-group">
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <label>Candidate Resume</label>
                    <div className="mode-toggle" style={{margin: 0, padding: '2px 4px'}}>
                      <label className={uploadMode === 'single' ? 'radio-btn active' : 'radio-btn'} style={{padding: '4px 8px', fontSize: '0.8rem'}}>
                        <input type="radio" checked={uploadMode === 'single'} onChange={() => {setUploadMode('single'); setFile(null);}} /> PDF
                      </label>
                      <label className={uploadMode === 'bulk' ? 'radio-btn active' : 'radio-btn'} style={{padding: '4px 8px', fontSize: '0.8rem'}}>
                        <input type="radio" checked={uploadMode === 'bulk'} onChange={() => {setUploadMode('bulk'); setFile(null);}} /> ZIP
                      </label>
                    </div>
                  </div>
                  
                  <div {...getRootProps()} className={`dropzone ${isDragActive ? 'active' : ''}`}>
                    <input {...getInputProps()} />
                    {file ? (
                      <div className="file-preview">
                        <span className="file-icon">📄</span>
                        <div className="file-info">
                          <span className="file-name">{file.name}</span>
                          <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                        </div>
                        <button type="button" className="remove-file-btn" onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
                      </div>
                    ) : (
                      <div className="dropzone-text">
                        <span className="drop-icon">📂</span>
                        <p>{isDragActive ? "Drop Resume here!" : `Drag & drop ${uploadMode === 'single' ? '.pdf' : '.zip'}`}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. JD INPUT / DROPZONE */}
                <div className="input-group" style={{marginTop: '2rem'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                    <label>Job Description</label>
                    <div className="mode-toggle" style={{margin: 0, padding: '2px 4px'}}>
                      <label className={jdMode === 'text' ? 'radio-btn active' : 'radio-btn'} style={{padding: '4px 8px', fontSize: '0.8rem'}}>
                        <input type="radio" checked={jdMode === 'text'} onChange={() => {setJdMode('text'); setJdFile(null);}} /> Text
                      </label>
                      <label className={jdMode === 'file' ? 'radio-btn active' : 'radio-btn'} style={{padding: '4px 8px', fontSize: '0.8rem'}}>
                        <input type="radio" checked={jdMode === 'file'} onChange={() => {setJdMode('file'); setJd('');}} /> PDF
                      </label>
                    </div>
                  </div>

                  {jdMode === 'text' ? (
                    <textarea rows="5" placeholder="Paste the target job description here..." value={jd} onChange={(e) => setJd(e.target.value)} />
                  ) : (
                    <div {...getJdRootProps()} className={`dropzone ${isJdDragActive ? 'active' : ''}`}>
                      <input {...getJdInputProps()} />
                      {jdFile ? (
                        <div className="file-preview">
                          <span className="file-icon">🏢</span>
                          <div className="file-info">
                            <span className="file-name">{jdFile.name}</span>
                            <span className="file-size">{(jdFile.size / 1024).toFixed(1)} KB</span>
                          </div>
                          <button type="button" className="remove-file-btn" onClick={(e) => { e.stopPropagation(); setJdFile(null); }}>✕</button>
                        </div>
                      ) : (
                        <div className="dropzone-text">
                          <span className="drop-icon">🏢</span>
                          <p>{isJdDragActive ? "Drop JD here!" : "Drag & drop JD .pdf"}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="blind-mode-toggle" style={{ background: blindMode ? '#e8f5e9' : '#f8f9fa', borderColor: blindMode ? '#2ecc71' : '#dee2e6' }}>
                  <label>
                    <input type="checkbox" checked={blindMode} onChange={(e) => setBlindMode(e.target.checked)} />
                    <div>
                      <h4 style={{ color: blindMode ? '#27ae60' : '#2c3e50' }}>🛡️ Enable Blind Hiring Mode</h4>
                      <p>Automatically scrub candidate PII to prevent unconscious bias.</p>
                    </div>
                  </label>
                </div>

                <button type="submit" disabled={loading} className="primary-btn">
                  {loading ? "Running AI Models..." : "Analyze Match"}
                </button>
              </form>

              {/* Error Banner Rendering */}
              {error && (
                <div className={`error-banner ${typeof error === 'string' && error.includes('FRAUD') ? 'fraud' : ''}`}>
                  {typeof error === 'string' && error.includes('FRAUD') ? '🛑 ' : '⚠️ '} 
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: RESULTS */}
          <div className="right-panel">
            {singleResults && (
              <div className="results-card">
                <div className="results-header">
                  <div>
                    <h2>Analysis Complete</h2>
                    <p>{singleResults.processed_filename}</p>
                  </div>
                  <div className="progress-container">
                    <CircularProgressbar 
                      value={singleResults.final_match_score_percentage} 
                      text={`${singleResults.final_match_score_percentage}%`} 
                      styles={buildStyles({
                        textSize: '24px', pathColor: singleResults.final_match_score_percentage >= 75 ? '#2ecc71' : singleResults.final_match_score_percentage >= 50 ? '#f39c12' : '#e74c3c',
                        textColor: '#2c3e50', trailColor: '#e0e0e0',
                      })}
                    />
                  </div>
                </div>

                <div className="inner-tabs">
                  <button style={innerTabStyle(resultTab === 'overview')} onClick={() => setResultTab('overview')}>📊 Overview</button>
                  <button style={innerTabStyle(resultTab === 'skills')} onClick={() => setResultTab('skills')}>🎯 Skill Gap</button>
                  <button style={innerTabStyle(resultTab === 'coach')} onClick={() => setResultTab('coach')}>✨ Coach</button>
                  <button style={innerTabStyle(resultTab === 'tailor')} onClick={() => setResultTab('tailor')}>🪄 Tailor</button>
                </div>

                <div className="tab-content">
                  {resultTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                      <div className="metrics-grid">
                        <div className="metric-box"><h4>Skill Overlap</h4><p>{(singleResults.feature_breakdown.skill_overlap_score * 100).toFixed(1)}%</p></div>
                        <div className="metric-box"><h4>Semantic</h4><p>{(singleResults.feature_breakdown.semantic_score * 100).toFixed(1)}%</p></div>
                        <div className="metric-box"><h4>Lexical</h4><p>{(singleResults.feature_breakdown.lexical_score * 100).toFixed(1)}%</p></div>
                      </div>
                      
                      {/* XAI RADAR CHART ADDED HERE */}
                      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginTop: '10px' }}>
                        <XAIDial featureBreakdown={singleResults.feature_breakdown} />
                      </div>
                    </div>
                  )}

                  {resultTab === 'skills' && (
                    <div className="skills-grid">
                      <div className="skills-section">
                        <h4>Matched Skills</h4>
                        <div className="tags">{singleResults.skill_analysis.common_skills?.map(skill => <span key={skill} className="tag match">{skill}</span>)}</div>
                      </div>
                      <div className="skills-section">
                        <h4>Missing Skills</h4>
                        <div className="tags">{missingSkills.map(skill => <span key={skill} className="tag missing">{skill}</span>)}</div>
                      </div>
                    </div>
                  )}

                  {resultTab === 'coach' && (
                    <div className="ai-coach-box">
                      <div className="markdown-body"><ReactMarkdown components={{a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" {...props} />}}>{singleResults.ai_feedback}</ReactMarkdown></div>
                    </div>
                  )}

                  {resultTab === 'tailor' && (
                    <div className="tailor-box">
                      {!tailoredResume ? (
                        <div className="text-center">
                          <p>Generate an ATS-friendly, markdown-formatted version of your resume optimized specifically for this Job Description.</p>
                          <button onClick={handleTailor} disabled={tailorLoading} className="tailor-btn">{tailorLoading ? '🪄 Rewriting...' : '🪄 Auto-Tailor Resume'}</button>
                        </div>
                      ) : (
                        <div className="tailored-resume-card">
                          <h3>📄 JD-Optimized Draft</h3>
                          <div className="markdown-body"><ReactMarkdown>{tailoredResume}</ReactMarkdown></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!singleResults && !bulkResults && !loading && (
              <div className="empty-state-card">
                <h3>Ready for Analysis</h3>
                <p>Upload a resume and job description on the left to see the AI breakdown here.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DATABASE UI */}
      {activeTab === 'database' && (
        <div className="dashboard-card full-width">
          <h2>Historical Candidates</h2>
          <div className="table-responsive">
            <table className="ats-table">
              <thead><tr><th>ID</th><th>File</th><th>Score</th><th>Date</th></tr></thead>
              <tbody>
                {dbCandidates.length > 0 ? dbCandidates.map((c) => (
                  <tr key={c.id}>
                    <td>#{c.id}</td><td className="file-cell">{c.filename}</td>
                    <td><span className={`score-badge ${c.final_score > 50 ? 'high' : 'low'}`}>{c.final_score}%</span></td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                )) : <tr><td colSpan="4" className="text-center">No data found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;