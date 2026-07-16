import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useReactToPrint } from 'react-to-print';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import { useDropzone } from 'react-dropzone';
import { useLocation, useNavigate } from 'react-router-dom';
import 'react-circular-progressbar/dist/styles.css';
import XAIDial from '../components/XAIDial';

// --- NEW ENTERPRISE ICONS ---
import { 
  FileText, UploadCloud, ShieldCheck, Download, AlertTriangle, 
  CheckCircle, Sparkles, Wand2, Mail, Bot, ArrowRight, Zap, 
  Target, LayoutDashboard, Sliders, ChevronDown, X, Building,
  Search, Eye, TrendingUp, TrendingDown, Minus, XCircle
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
  
 const [loadingText, setLoadingText] = useState("INITIATE SCAN");
  
  const [tailorLoading, setTailorLoading] = useState(false);
  const [tailorData, setTailorData] = useState(null);
  const [showTailoredPreview, setShowTailoredPreview] = useState(false); 
  
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterText, setCoverLetterText] = useState('');
  
  const [chatHistory, setChatHistory] = useState([]);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  const [resultTab, setResultTab] = useState('overview');
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

    const loadingSteps = [
      "EXTRACTING DOCUMENT PAYLOAD...",
      "VECTORIZING SEMANTIC CONTEXT...",
      "RUNNING RANDOM FOREST ENSEMBLE...",
      "COMPILING EXPLAINABLE AI REPORT..."
    ];
    let stepIndex = 0;
    setLoadingText(loadingSteps[0]);
    const stepInterval = setInterval(() => {
      stepIndex = (stepIndex + 1) % loadingSteps.length;
      setLoadingText(loadingSteps[stepIndex]);
    }, 1500);

    try {
      const endpoint = uploadMode === 'single' ? `${API_BASE_URL}/analyze` : `${API_BASE_URL}/analyze-bulk`;
      const response = await axios.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 15000 });
      
      if (uploadMode === 'single') {
        setSingleResults(response.data.data); 
      } else {
        setBulkResults(response.data.data);
        setAutoRedirect(true);
        setRedirectCountdown(10);
      }
    } catch (err) {
      let errorMsg = "An error occurred during analysis.";
      if (err.code === 'ECONNABORTED') errorMsg = "AI request timed out. Please try again.";
      else if (err.response?.status === 429) errorMsg = "AI rate limit reached. Please wait about one minute before trying again.";
      else if (err.response?.data?.detail) errorMsg = typeof err.response.data.detail === 'string' ? err.response.data.detail : JSON.stringify(err.response.data.detail);
      else if (err.message) errorMsg = err.message;
      setError(errorMsg);
    } finally { 
      clearInterval(stepInterval); 
      setLoadingText("INITIATE SCAN"); 
      setLoading(false); 
    }
  };

  const handleTailor = async () => { 
    setTailorLoading(true); setTailorData(null); 
    const formData = new FormData(); formData.append('resume_file', file); formData.append('job_description', singleResults?.cleaned_jd || jd); 
    try { 
      const response = await axios.post(`${API_BASE_URL}/tailor`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 15000 }); 
      if (response.data.tailored_resume && response.data.tailored_resume.includes("DOMAIN_MISMATCH_ERROR")) {
        alert("Ethical AI Block: The system cannot tailor this resume. The candidate's background is fundamentally unrelated to the target role. Fabricating entirely new career experience is prohibited.");
        setTailorLoading(false);
        return;
      }
      setTailorData({ 
        text: response.data.tailored_resume, 
        newScore: response.data.new_score, 
        oldScore: singleResults.final_match_score_percentage,
        optimization_result: response.data.optimization_result || {} 
      });
    } catch (err) { 
      if (err.code === 'ECONNABORTED') alert("AI request timed out. Please try again.");
      else if (err.response?.status === 429) alert("AI rate limit reached. Please wait about one minute before trying again.");
      else alert("Failed to optimize resume"); 
    } finally { setTailorLoading(false); } 
  };

  const handleGenerateCoverLetter = async () => { 
    setCoverLetterLoading(true); setCoverLetterText(''); 
    const formData = new FormData(); formData.append('resume_file', file); formData.append('job_description', singleResults?.cleaned_jd || jd); 
    try { 
      const response = await axios.post(`${API_BASE_URL}/generate-cover-letter`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 15000 }); 
      setCoverLetterText(response.data.cover_letter); 
    } catch (err) { 
      if (err.code === 'ECONNABORTED') alert("AI request timed out. Please try again.");
      else if (err.response?.status === 429) alert("AI rate limit reached. Please wait about one minute before trying again.");
      else alert("Failed to write letter"); 
    } finally { setCoverLetterLoading(false); } 
  };
  
  const handleChat = async (e) => { 
    e.preventDefault(); 
    if (!chatQuestion.trim()) return; 
    const newQuestion = chatQuestion; 
    setChatHistory(prev => [...prev, { role: 'user', content: newQuestion }]); 
    setChatQuestion(''); setChatLoading(true); 
    const formData = new FormData(); formData.append('resume_file', file); formData.append('question', newQuestion); 
    try { 
      const response = await axios.post(`${API_BASE_URL}/chat-resume`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 15000 }); 
      setChatHistory(prev => [...prev, { role: 'ai', content: String(response?.data?.answer || "Sorry, I received an empty response from the database.") }]); 
    } catch (err) { 
      const errorMsg = err.code === 'ECONNABORTED' ? "AI request timed out. Please try again." : (err.response?.status === 429 ? "AI rate limit reached. Please wait about one minute before trying again." : "Failed to reach AI backend.");
      setChatHistory(prev => [...prev, { role: 'ai', content: errorMsg }]); 
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
  const tailoredResumeRef = useRef();
  const handleDownloadTailoredResume = useReactToPrint({ contentRef: tailoredResumeRef, documentTitle: singleResults ? `Optimized_Resume_${singleResults.processed_filename.replace('.pdf', '')}` : 'Optimized_Resume' });

  // Placeholder for downloading original file - would connect to real file download logic
  const handleDownloadOriginal = () => {
    alert("Triggering download of the original Source Document.");
  };

  const missingSkills = singleResults?.skill_analysis?.jd_skills_detected ? singleResults.skill_analysis.jd_skills_detected.filter(skill => !singleResults.skill_analysis.common_skills?.includes(skill)) : [];
  const innerTabStyle = (isActive) => `flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all whitespace-nowrap text-center backdrop-blur-md flex items-center justify-center gap-2 ${isActive ? 'bg-[#1A1F2E]/60 text-[#2F6FED] shadow-sm border border-white/10' : 'text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#374151]/30 border border-transparent'}`;
  
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
              <Search className="w-3 h-3" /> Intelligence Scanner
            </div>
            <h2 className="text-4xl font-black text-[#F7F9FC] tracking-tight drop-shadow-sm">Analysis Portal</h2>
            <p className="text-[#94A3B8] font-medium mt-2">Upload candidate documents to run multi-vector contextual analysis.</p>
          </div>
          
          <div className="flex items-center gap-2 bg-[#242B3D]/60 backdrop-blur-xl p-1.5 rounded-xl border border-white/10 shadow-lg">
            <button onClick={toggleRole} className={`px-5 py-2 flex items-center gap-2 rounded-lg text-sm font-bold transition-all backdrop-blur-md ${userRole === 'candidate' ? 'bg-[#2F6FED]/90 border border-white/10 text-white shadow-[0_0_15px_rgba(47,111,237,0.4)]' : 'text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#1A1F2E]/50 border border-transparent'}`}><Sparkles className="w-4 h-4"/> Candidate View</button>
            <button onClick={toggleRole} className={`px-5 py-2 flex items-center gap-2 rounded-lg text-sm font-bold transition-all backdrop-blur-md ${userRole === 'recruiter' ? 'bg-[#2F6FED]/90 border border-white/10 text-white shadow-[0_0_15px_rgba(47,111,237,0.4)]' : 'text-[#94A3B8] hover:text-[#F7F9FC] hover:bg-[#1A1F2E]/50 border border-transparent'}`}><Building className="w-4 h-4"/> HR View</button>
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
                        <FileText className="w-8 h-8 text-[#2F6FED] drop-shadow-md" />
                        <div className="flex-1 overflow-hidden">
                          <p className="text-sm font-bold text-[#F7F9FC] truncate drop-shadow-sm">{file.name}</p>
                          <p className="text-[10px] uppercase tracking-wider font-bold text-[#2FBF71] mt-1 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Ready</p>
                        </div>
                        <button type="button" className="w-8 h-8 flex items-center justify-center bg-[#E85D75]/20 hover:bg-[#E85D75]/40 rounded-full text-[#E85D75] transition-colors border border-[#E85D75]/30" onClick={(e) => { e.stopPropagation(); setFile(null); }}><X className="w-4 h-4"/></button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <UploadCloud className="w-10 h-10 mx-auto mb-4 text-[#94A3B8] group-hover:scale-110 group-hover:text-[#2F6FED] transition-all drop-shadow-lg" />
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
                      <CustomDropdown value={selectedSavedJobId} onChange={setSelectedSavedJobId} options={dbJobs.map(job => ({ value: job.id, label: job.title }))} placeholder="Select a target role..." />
                    </div>
                  ) : jdMode === 'text' ? (
                    <textarea rows="4" placeholder="Paste the target JD..." value={jd} onChange={(e) => setJd(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-white/5 bg-[#1A1F2E]/60 backdrop-blur-md text-[#F7F9FC] placeholder:text-[#94A3B8] focus:bg-[#1A1F2E]/80 focus:ring-2 focus:ring-[#2F6FED]/50 outline-none transition-all text-sm custom-scrollbar shadow-inner" />
                  ) : (
                    <div {...getJdRootProps()} className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all backdrop-blur-md ${isJdDragActive ? 'border-[#2F6FED] bg-[#2F6FED]/20' : 'border-white/10 bg-[#1A1F2E]/40 hover:border-[#2F6FED]/50 hover:bg-[#2F6FED]/10'}`}>
                      <input {...getJdInputProps()} />
                      {jdFile ? (
                        <div className="flex items-center gap-3 w-full">
                          <Building className="w-6 h-6 text-[#94A3B8]" />
                          <p className="text-sm font-bold text-[#F7F9FC] truncate flex-1 drop-shadow-sm">{jdFile.name}</p>
                          <button type="button" className="text-[#E85D75] hover:text-white font-bold p-1 bg-[#E85D75]/20 hover:bg-[#E85D75] rounded-full w-6 h-6 flex items-center justify-center transition-colors" onClick={(e) => { e.stopPropagation(); setJdFile(null); }}><X className="w-4 h-4"/></button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <Building className="w-8 h-8 mx-auto mb-3 text-[#94A3B8] group-hover:scale-110 group-hover:text-[#2F6FED] transition-all" />
                          <p className="text-xs font-bold text-[#94A3B8]">Drop JD (.pdf, .png, .jpg)</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {userRole === 'recruiter' && (
                  <div onClick={() => setBlindMode(!blindMode)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all mb-8 backdrop-blur-md ${blindMode ? 'bg-[#2F6FED]/20 border-[#2F6FED]/50 ring-4 ring-[#2F6FED]/20 shadow-lg' : 'bg-[#1A1F2E]/50 border-white/5 hover:border-[#374151]'}`}>
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors shadow-sm border ${blindMode ? 'bg-[#2F6FED] border-[#2F6FED] text-white' : 'bg-[#242B3D]/80 border-white/10'}`}>
                      {blindMode && <CheckCircle className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm font-bold flex items-center gap-2 ${blindMode ? 'text-[#2F6FED] drop-shadow-sm' : 'text-[#F7F9FC]'}`}><ShieldCheck className="w-4 h-4" /> Blind Hiring Mode</h4>
                      <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-wider mt-0.5">Strip Identifiable Info</p>
                    </div>
                  </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-[#2F6FED]/90 backdrop-blur-md hover:bg-[#2563EB] text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(47,111,237,0.3)] border border-white/10 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 tracking-wide">
                  {loading ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> {loadingText}</> : "INITIATE SCAN"}
                </button>
              </form>
              
              {error && (
                <div className={`mt-6 p-4 rounded-xl text-sm font-bold flex items-center gap-2 animate-in zoom-in-95 border backdrop-blur-md ${error.includes('FRAUD') ? 'bg-[#E85D75]/20 text-[#E85D75] border-[#E85D75]/40' : 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/40'}`}>
                  <AlertTriangle className="w-5 h-5 shrink-0" /> {error}
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
                    <p className="text-[#94A3B8] font-medium text-sm mt-2 flex items-center gap-2"><FileText className="w-4 h-4"/> {singleResults.processed_filename}</p>
                  </div>
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <button onClick={handleDownloadReport} className="flex items-center gap-2 bg-[#242B3D]/80 backdrop-blur-md hover:bg-white/10 text-[#F7F9FC] border border-white/10 px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95">
                      <Download className="w-5 h-5" /> Export
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
                  <button onClick={() => setResultTab('overview')} className={innerTabStyle(resultTab === 'overview')}><LayoutDashboard className="w-4 h-4"/> Overview</button>
                  <button onClick={() => setResultTab('skills')} className={innerTabStyle(resultTab === 'skills')}><Target className="w-4 h-4"/> Skills</button>
                  {userRole === 'recruiter' && (
                    <>
                      <button onClick={() => setResultTab('logic')} className={innerTabStyle(resultTab === 'logic')}><Sliders className="w-4 h-4"/> AI Logic & Fraud</button>
                      <button onClick={() => setResultTab('chat')} className={innerTabStyle(resultTab === 'chat')}><Bot className="w-4 h-4"/> RAG Copilot</button>
                    </>
                  )}
                  {userRole === 'candidate' && (
                    <>
                      <button onClick={() => setResultTab('coach')} className={innerTabStyle(resultTab === 'coach')}><Sparkles className="w-4 h-4"/> Coach</button>
                      <button onClick={() => setResultTab('tailor')} className={innerTabStyle(resultTab === 'tailor')}><Wand2 className="w-4 h-4"/> Tailor Resume</button>
                      <button onClick={() => setResultTab('coverLetter')} className={innerTabStyle(resultTab === 'coverLetter')}><Mail className="w-4 h-4"/> Cover Letter</button>
                    </>
                  )}
                </div>

                <div className="p-8">
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
                              <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
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
                            <p className={`font-black drop-shadow-sm print:drop-shadow-none print:text-black ${item.truncate ? 'line-clamp-3 text-[11px] leading-snug text-[#F7F9FC]' : 'text-2xl text-[#F7F9FC]'}`} title={item.value}>{item.value}</p>
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
                              <CheckCircle className="w-4 h-4" /> Key Strengths
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
                              <AlertTriangle className="w-4 h-4" /> Areas of Concern
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
                          <CheckCircle className="w-4 h-4" /> Verified Matches
                        </h4>
                        <div className="flex flex-wrap gap-3">
                          {singleResults.skill_analysis.common_skills?.map(skill => <span key={skill} className="px-4 py-2 bg-[#242B3D]/80 backdrop-blur-sm text-[#2FBF71] border border-[#2FBF71]/30 rounded-xl text-xs font-bold shadow-sm">{skill}</span>)}
                          {(!singleResults.skill_analysis.common_skills || singleResults.skill_analysis.common_skills.length === 0) && <span className="text-sm font-medium text-[#94A3B8]">No matching skills found.</span>}
                        </div>
                      </div>
                      
                      <div className="bg-[#1A1F2E]/50 backdrop-blur-md p-8 rounded-3xl border border-white/5 shadow-inner">
                        <h4 className="font-black text-[#F59E0B] uppercase text-xs tracking-widest flex items-center gap-3 mb-6">
                          <AlertTriangle className="w-4 h-4" /> Missing Requirements
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
                          <span className="p-2.5 bg-[#2F6FED]/20 backdrop-blur-sm border border-[#2F6FED]/30 rounded-xl text-[#2F6FED] shadow-sm"><Zap className="w-5 h-5"/></span> 
                          Random Forest Decision Engine
                        </h3>
                        <p className="text-[#94A3B8] font-medium leading-relaxed max-w-3xl">Evaluates using an ensemble of decision trees to weigh deep semantic context over simple keyword frequency.</p>
                      </div>

                      <div className="bg-[#242B3D]/60 backdrop-blur-xl p-8 rounded-2xl border border-white/5 shadow-lg">
                         <h4 className="text-xs font-black uppercase text-[#94A3B8] tracking-widest mb-6 flex items-center gap-2"><Target className="w-4 h-4"/> Live AI Reasoning & Fraud Analysis</h4>
                         <ul className="space-y-4">
                           {getCandidateInsights(singleResults).strengths.map((reason, idx) => (
                             <li key={`str-${idx}`} className="flex items-start gap-4 text-sm font-medium p-5 rounded-xl bg-[#1A1F2E]/80 backdrop-blur-md border border-white/5 shadow-inner">
                               <CheckCircle className="w-5 h-5 text-[#2FBF71] shrink-0" />
                               <span className="text-[#2FBF71] drop-shadow-sm leading-relaxed">{reason}</span>
                             </li>
                           ))}
                           {getCandidateInsights(singleResults).concerns.map((reason, idx) => {
                             const isDanger = reason.includes("Risk") || reason.includes("manipulation") || reason.includes("Stuffing");
                             return (
                               <li key={`con-${idx}`} className="flex items-start gap-4 text-sm font-medium p-5 rounded-xl bg-[#1A1F2E]/80 backdrop-blur-md border border-white/5 shadow-inner">
                                 <AlertTriangle className={`w-5 h-5 shrink-0 ${isDanger ? "text-[#E85D75] animate-pulse" : "text-[#F59E0B]"}`} />
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
                          <Wand2 className="w-16 h-16 mx-auto mb-6 text-[#2F6FED] opacity-80" />
                          <h3 className="text-2xl font-black text-[#F7F9FC] mb-3 drop-shadow-sm">AI Resume Optimization</h3>
                          <p className="text-base font-medium text-[#94A3B8] mb-10 max-w-lg mx-auto">Generate an ATS-friendly, keyword-optimized version of this candidate's resume and re-evaluate it through our Random Forest model.</p>
                          <button onClick={handleTailor} disabled={tailorLoading} className="bg-[#2F6FED]/90 backdrop-blur-md border border-white/10 hover:bg-[#2563EB] text-white font-bold py-4 px-10 rounded-xl transition-all shadow-[0_0_20px_rgba(47,111,237,0.4)] active:scale-95 disabled:opacity-70 disabled:shadow-none tracking-wide">
                            {tailorLoading ? 'GENERATING & RE-SCORING...' : 'OPTIMIZE & RE-SCORE'}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                          {(() => {
  // Extract Data
  const origScore = tailorData?.oldScore || 0;
  const optScore = tailorData?.newScore || 0;
  const delta = optScore - origScore;
  
  // 1 & 2. Single Source of Truth: Stop deriving verdict, use Backend payload directly
  const backendResult = tailorData?.optimization_result || {};
  const auditLog = backendResult.audit_log || [];
  
  // Fallbacks are only used if the backend payload is completely missing
  const derivedVerdict = backendResult.verdict || (delta >= 0 ? "Accepted" : "Needs Review");
  const uiTheme = backendResult.ui_state || (delta >= 0 ? "success" : "warning");
  const isSafe = backendResult.is_safe_to_auto_replace ?? (delta >= 0);

  // Dynamic Score Colors & Delta Calculation
  let scoreColor = "text-[#94A3B8]"; 
  let deltaDisplay = "0.0%";
  let deltaColor = "text-[#94A3B8]";
  
  if (delta > 0) {
    scoreColor = "text-[#2FBF71]";
    deltaColor = "text-[#2FBF71]";
    deltaDisplay = `▲ +${delta.toFixed(1)}%`;
  } else if (delta < 0 && delta >= -10) {
    scoreColor = "text-[#F59E0B]";
    deltaColor = "text-[#F59E0B]";
    deltaDisplay = `▼ ${delta.toFixed(1)}%`;
  } else if (delta < -10) {
    scoreColor = "text-[#E85D75]";
    deltaColor = "text-[#E85D75]";
    deltaDisplay = `▼ ${delta.toFixed(1)}%`;
  }

  // Theme mapping for the UI elements
  const themes = {
    success: { badge: 'bg-[#2FBF71]/20 text-[#2FBF71] border-[#2FBF71]/30', bgGlow: 'bg-[#2FBF71]/10' },
    warning: { badge: 'bg-[#F59E0B]/20 text-[#F59E0B] border-[#F59E0B]/30', bgGlow: 'bg-[#F59E0B]/10' },
    danger:  { badge: 'bg-[#E85D75]/20 text-[#E85D75] border-[#E85D75]/30', bgGlow: 'bg-[#E85D75]/10' }
  };
  const currentTheme = themes[uiTheme];

  // 4. Improved Recruiter-Friendly Messaging
  const recommendationText = uiTheme === 'success'
    ? "The optimized resume passed all validation checks and is recommended for application."
    : uiTheme === 'warning'
    ? "The AI-generated revision did not outperform your original resume. We recommend reviewing both versions before use."
    : "The AI-generated revision did not outperform your original resume. Based on deterministic ATS evaluation, we recommend continuing with your original resume for this application.";

  return (
    <>
      <div className="flex flex-col bg-[#242B3D]/60 backdrop-blur-xl p-8 rounded-3xl border border-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.2)] relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${currentTheme.bgGlow}`}></div>
        
        <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10 w-full">
          
          <div className="flex-1 flex flex-col justify-center">
            <h3 className="text-2xl font-black text-[#F7F9FC] drop-shadow-sm mb-5">Optimization Audit</h3>
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest w-16">Status:</span>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border shadow-sm ${currentTheme.badge}`}>
                  {derivedVerdict}
                </span>
              </div>
              {/* Fake Confidence Row Removed Here */}
            </div>
            <p className="text-sm font-medium text-[#94A3B8] leading-relaxed max-w-md">
              {recommendationText}
            </p>
          </div>

          <div className="flex items-center gap-5 bg-[#1A1F2E]/80 backdrop-blur-md px-6 py-6 rounded-2xl border border-white/5 shadow-inner shrink-0 self-center">
            <div className="text-center">
              <p className="text-[10px] uppercase font-bold text-[#94A3B8] tracking-widest mb-1.5">Original Match</p>
              <p className="text-3xl font-black text-[#F7F9FC]">{origScore.toFixed(1)}%</p>
            </div>
            <div className="text-[#94A3B8] text-xl font-light"><ArrowRight className="w-6 h-6"/></div>
            <div className="text-center">
              <p className={`text-[10px] uppercase font-bold tracking-widest mb-1.5 ${scoreColor}`}>
                AI Draft Match
              </p>
              <p className={`text-3xl font-black ${scoreColor}`}>
                {optScore.toFixed(1)}%
              </p>
              {/* 6. Improved Delta Emphasis: Increased text size to text-base and added drop-shadow */}
              <p className={`text-base font-black mt-1.5 tracking-wider drop-shadow-sm ${deltaColor}`}>
                {deltaDisplay}
              </p>
            </div>
          </div>
          
        </div>

        {/* 3. Audit Checklist: Strictly renders backend array with matched icons */}
        {auditLog.length > 0 && (
          <div className="mt-8 border-t border-white/10 pt-6 relative z-10 w-full">
            <ul className="space-y-3">
              {auditLog.map((log, idx) => {
                let Icon = CheckCircle;
                let iconColor = "text-[#2FBF71]";
                let cleanLog = log.replace(/[✅⚠️🚨]/g, '').trim();

                if (log.includes("⚠️")) {
                  Icon = AlertTriangle;
                  iconColor = "text-[#F59E0B]";
                } else if (log.includes("🚨")) {
                  Icon = XCircle;
                  iconColor = "text-[#E85D75]";
                }

                return (
                  <li key={idx} className="text-sm font-medium text-[#F7F9FC] flex items-start gap-3">
                    <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
                    <span>{cleanLog}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {/* 5. Renamed "Source Document" to "Original Resume" */}
        <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center bg-[#1A1F2E]/80 backdrop-blur-md p-5 rounded-2xl border transition-all ${!isSafe ? 'border-[#2F6FED]/50 shadow-[0_0_15px_rgba(47,111,237,0.15)]' : 'border-white/5 shadow-inner'}`}>
          <div className="mb-4 sm:mb-0">
            <h4 className="text-sm font-black text-[#F7F9FC] uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#94A3B8]"/> Original Resume {(!isSafe) && <span className="text-[#2F6FED] ml-1">(Recommended)</span>}
            </h4>
            <p className="text-[10px] text-[#94A3B8] font-bold mt-1.5 tracking-wide">Your original uploaded resume</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleDownloadOriginal} className="w-full sm:w-auto bg-[#2F6FED]/10 hover:bg-[#2F6FED]/20 text-[#2F6FED] border border-[#2F6FED]/30 font-black tracking-wide py-2 px-6 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 text-xs">
              <Download className="w-4 h-4"/> DOWNLOAD
            </button>
          </div>
        </div>
        
        <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center bg-[#1A1F2E]/80 backdrop-blur-md p-5 rounded-2xl border transition-all ${isSafe ? 'border-[#2FBF71]/50 shadow-[0_0_15px_rgba(47,191,113,0.15)]' : 'border-white/5 shadow-inner'}`}>
          <div className="mb-4 sm:mb-0">
            <h4 className="text-sm font-black text-[#F7F9FC] uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#94A3B8]"/> AI-Optimized Revision {(isSafe) && <span className="text-[#2FBF71] ml-1">(Recommended)</span>}
            </h4>
            <p className={`text-[10px] font-bold mt-1.5 tracking-wide ${isSafe ? 'text-[#94A3B8]' : 'text-[#F59E0B]'}`}>
              {isSafe ? 'Formatted for immediate application' : 'Needs review before application'}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowTailoredPreview(true)} className="flex-1 sm:flex-none bg-[#242B3D]/80 hover:bg-white/10 text-[#94A3B8] hover:text-[#F7F9FC] border border-white/10 font-black tracking-wide py-2 px-6 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 text-xs">
              <Eye className="w-4 h-4"/> PREVIEW
            </button>
            <button onClick={handleDownloadTailoredResume} className="flex-1 sm:flex-none bg-[#2FBF71]/10 hover:bg-[#2FBF71] text-[#2FBF71] hover:text-white border border-[#2FBF71]/30 font-black tracking-wide py-2 px-6 rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 text-xs">
              <Download className="w-4 h-4"/> DOWNLOAD
            </button>
          </div>
        </div>

        {/* Hidden printable component (unchanged) */}
        <div className="hidden">
          <div ref={tailoredResumeRef} className="bg-white text-black w-[850px] min-h-[1100px] p-12 print:p-8" style={{ fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
            <div className="prose prose-sm max-w-none text-gray-900 prose-h1:text-center prose-h1:text-3xl prose-h1:font-black prose-h1:mb-2 prose-h1:tracking-tight prose-h1:text-black prose-h2:text-lg prose-h2:font-black prose-h2:border-b-2 prose-h2:border-black prose-h2:pb-1 prose-h2:mt-6 prose-h2:mb-3 prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-black prose-h3:text-base prose-h3:font-bold prose-h3:mt-4 prose-h3:mb-1 prose-h3:text-black prose-p:text-sm prose-p:my-1 prose-p:leading-relaxed prose-p:text-center prose-ul:mt-2 prose-ul:mb-4 prose-ul:list-disc prose-ul:pl-5 prose-li:text-sm prose-li:my-1 prose-li:leading-relaxed prose-li:marker:text-black prose-strong:font-bold prose-strong:text-black print:prose-h2:border-black print:text-black">
              <ReactMarkdown>{tailorData.text}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </>
  );
})()}
                        </div>
                      )}
                    </div>
                  )}

                  {resultTab === 'coverLetter' && (
                    <div className="py-4">
                      {!coverLetterText ? (
                        <div className="text-center bg-[#1A1F2E]/50 backdrop-blur-md rounded-3xl border border-white/5 p-16 shadow-inner">
                          <Mail className="w-16 h-16 mx-auto mb-6 text-[#2F6FED] opacity-80" />
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
                        <div className="w-10 h-10 rounded-xl bg-[#2F6FED]/20 border border-[#2F6FED]/30 flex items-center justify-center shadow-inner"><Bot className="w-5 h-5 text-[#2F6FED]"/></div>
                        <div>
                          <h4 className="text-base font-black text-[#F7F9FC] leading-tight drop-shadow-sm">RAG-Fusion Copilot</h4>
                          <p className="text-[10px] font-bold text-[#2F6FED] uppercase tracking-widest mt-0.5">Secure Vector Memory Active</p>
                        </div>
                      </div>

                      <div className="flex-1 p-6 overflow-y-auto space-y-6 custom-scrollbar bg-transparent">
                        {chatHistory.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-[#94A3B8] p-8">
                            <div className="w-20 h-20 bg-[#242B3D]/80 backdrop-blur-md border border-white/5 rounded-full flex items-center justify-center mb-6 shadow-lg"><Bot className="w-10 h-10 text-[#94A3B8]" /></div>
                            <p className="font-medium text-sm text-center max-w-xs mb-8">Ask questions about this candidate's background, technical projects, or skills.</p>
                            
                            <div className="text-left border-t border-white/10 pt-6 w-full">
                              <p className="text-[10px] font-black uppercase tracking-widest mb-3 text-[#94A3B8] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2F6FED]"></span> Quick Actions
                              </p>
                              <div className="flex flex-col gap-2">
                                {["Summarize candidate's experience", "What are their strongest skills?", "Are there any red flags or job hopping?", "Why did they score this way?"].map((prompt, i) => (
                                  <button key={i} onClick={() => { setChatQuestion(prompt); }} className="text-xs font-bold text-left bg-[#1A1F2E]/60 hover:bg-[#2F6FED]/20 hover:text-[#2F6FED] border border-white/5 hover:border-[#2F6FED]/30 transition-all px-4 py-2.5 rounded-xl text-[#F7F9FC] shadow-sm backdrop-blur-md">
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
                        <button type="submit" disabled={chatLoading || !chatQuestion.trim()} className="bg-[#2F6FED]/90 backdrop-blur-md hover:bg-[#2563EB] text-white px-6 py-3.5 rounded-xl font-bold transition-all border border-white/10 disabled:opacity-50 shadow-[0_0_20px_rgba(47,111,237,0.4)] active:scale-95 disabled:shadow-none"><ArrowRight className="w-5 h-5"/></button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            ) : bulkResults ? (
              <div className="bg-[#242B3D]/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 p-8 flex flex-col h-full min-h-[600px] animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#2FBF71]/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                <div className="text-center mb-6 relative z-10">
                  <div className="w-14 h-14 bg-[#2FBF71]/20 border border-[#2FBF71]/40 text-[#2FBF71] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(47,191,113,0.3)] mx-auto mb-4"><CheckCircle className="w-6 h-6"/></div>
                  <h3 className="text-2xl font-black text-[#F7F9FC] tracking-tight mb-2 drop-shadow-sm">Bulk Scan Complete</h3>

                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    <span className="px-3 py-1.5 bg-[#1A1F2E]/80 backdrop-blur-md rounded-lg border border-white/5 text-xs font-bold text-[#94A3B8] shadow-sm"><span className="text-white">{bulkResults.length}</span> Imported</span>
                    <span className="px-3 py-1.5 bg-[#1A1F2E]/80 backdrop-blur-md rounded-lg border border-white/5 text-xs font-bold text-[#94A3B8] shadow-sm">Avg Match <span className="text-white">{bulkAvgMatch}%</span></span>
                    <span className={`px-3 py-1.5 bg-[#1A1F2E]/80 backdrop-blur-md rounded-lg border border-white/5 text-xs font-bold shadow-sm ${bulkFraudCount > 0 ? 'text-[#E85D75]' : 'text-[#94A3B8]'}`}>Fraud Flags <span className={bulkFraudCount > 0 ? 'text-[#E85D75]' : 'text-white'}>{bulkFraudCount}</span></span>
                  </div>
                </div>

                {bulkFraudCount > 0 && (
                  <div className="mb-6 relative z-10 bg-[#E85D75]/10 border border-[#E85D75]/30 rounded-xl p-3 flex items-center justify-between shadow-inner">
                     <p className="text-sm font-bold text-[#E85D75] flex items-center gap-2"><AlertTriangle className="w-5 h-5 animate-pulse" /> Fraud Alerts Detected: {bulkFraudCount} candidate(s) flagged.</p>
                     <button onClick={() => navigate('/hr')} className="text-xs font-bold text-[#E85D75] hover:text-white transition-colors bg-[#E85D75]/20 px-3 py-1.5 rounded-lg border border-[#E85D75]/30">Review Now</button>
                  </div>
                )}

                <div className="flex-1 bg-[#1A1F2E]/60 backdrop-blur-md rounded-2xl border border-white/5 p-6 shadow-inner relative z-10 flex flex-col">
                  <h4 className="text-xs font-black uppercase text-[#94A3B8] tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#2F6FED] rounded-full shadow-[0_0_8px_#2F6FED]"></span> Candidate Ranking Summary
                  </h4>

                  <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                    {bulkResults.slice(0, 5).map((candidate, idx) => {
                      const status = candidate.score >= 75 ? 'SHORTLIST' : candidate.score >= 50 ? 'REVIEW' : 'ARCHIVE';
                      const statusColor = candidate.score >= 75 ? 'text-[#2FBF71] bg-[#2FBF71]/10 border-[#2FBF71]/30' : candidate.score >= 50 ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30' : 'text-[#94A3B8] bg-[#242B3D]/80 border-white/5';
                      
                      const reason = candidate.filename.includes('[FRAUD]') 
                        ? "ATS manipulation detected in metadata." 
                        : candidate.score >= 75 ? "Strong technical and semantic alignment with JD." 
                        : candidate.score >= 50 ? "Meets baseline, missing some core requirements." 
                        : "Severe gap in required technical skills.";

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
                              <p className="text-xs text-[#94A3B8] truncate flex items-center gap-1">
                                {candidate.filename.includes('[FRAUD]') ? <AlertTriangle className="w-3 h-3 text-[#E85D75]"/> : candidate.score >= 75 ? <CheckCircle className="w-3 h-3 text-[#2FBF71]"/> : candidate.score >= 50 ? <AlertTriangle className="w-3 h-3 text-[#F59E0B]"/> : <X className="w-3 h-3 text-[#E85D75]"/>}
                                {reason}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-black shadow-sm border ${candidate.score >= 75 ? 'text-[#2FBF71] bg-[#2FBF71]/10 border-[#2FBF71]/30' : candidate.score >= 50 ? 'text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/30' : 'text-[#94A3B8] bg-[#1A1F2E]/80 border-white/5'}`}>
                              {candidate.score.toFixed(1)}%
                            </span>
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
                <div className="w-32 h-32 bg-[#1A1F2E]/80 backdrop-blur-md border border-white/5 text-[#94A3B8] rounded-full flex items-center justify-center shadow-inner relative">
                  <span className="absolute top-0 right-0 w-5 h-5 bg-[#2F6FED] rounded-full animate-ping"></span>
                  <span className="absolute top-0 right-0 w-5 h-5 bg-[#2F6FED]/90 border border-white/30 rounded-full shadow-[0_0_15px_rgba(47,111,237,0.9)]"></span>
                  <Search className="w-12 h-12" />
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

      {showTailoredPreview && tailorData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#242B3D]/80 backdrop-blur-3xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.6)] border border-white/10 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-[#1A1F2E]/40 backdrop-blur-md">
              <h3 className="text-lg font-black text-[#F7F9FC] flex items-center gap-2">
                <FileText className="w-5 h-5"/> ATS-Optimized Document Preview
              </h3>
              <div className="flex items-center gap-4">
                 <button onClick={handleDownloadTailoredResume} className="text-xs font-bold bg-[#2FBF71]/20 text-[#2FBF71] border border-[#2FBF71]/30 px-4 py-2 rounded-lg hover:bg-[#2FBF71] hover:text-white transition-colors shadow-sm flex items-center gap-2">
                   <Download className="w-4 h-4"/> Download PDF
                 </button>
                 <button onClick={() => setShowTailoredPreview(false)} className="w-8 h-8 bg-[#1A1F2E]/50 hover:bg-white/10 text-[#94A3B8] hover:text-[#F7F9FC] rounded-full flex items-center justify-center transition-colors font-bold border border-white/5 backdrop-blur-md">
                   <X className="w-4 h-4" />
                 </button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar p-6 bg-[#0A0D14]/50 flex justify-center">
               <div className="bg-white text-black w-full max-w-[850px] min-h-[1100px] p-12 shadow-2xl" style={{ fontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
                   <div className="prose prose-sm max-w-none text-gray-900 prose-h1:text-center prose-h1:text-3xl prose-h1:font-black prose-h1:mb-2 prose-h1:tracking-tight prose-h1:text-black prose-h2:text-lg prose-h2:font-black prose-h2:border-b-2 prose-h2:border-black prose-h2:pb-1 prose-h2:mt-6 prose-h2:mb-3 prose-h2:uppercase prose-h2:tracking-widest prose-h2:text-black prose-h3:text-base prose-h3:font-bold prose-h3:mt-4 prose-h3:mb-1 prose-h3:text-black prose-p:text-sm prose-p:my-1 prose-p:leading-relaxed prose-p:text-center prose-ul:mt-2 prose-ul:mb-4 prose-ul:list-disc prose-ul:pl-5 prose-li:text-sm prose-li:my-1 prose-li:leading-relaxed prose-li:marker:text-black prose-strong:font-bold prose-strong:text-black">
                      <ReactMarkdown>{tailorData.text}</ReactMarkdown>
                   </div>
               </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default CandidateDashboard;