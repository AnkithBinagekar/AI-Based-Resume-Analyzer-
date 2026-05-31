import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function JobBoard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [error, setError] = useState('');
  
  const [viewingJob, setViewingJob] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jobs`);
      setJobs(response.data.data);
    } catch (err) {
      console.error("Failed to fetch jobs", err);
    }
  };

  const handleDeleteJob = async (e, jobId) => {
    e.stopPropagation(); 
    if (!window.confirm("Are you sure you want to delete this job description?")) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/jobs/${jobId}`);
      setJobs(prev => prev.filter(job => job.id !== jobId));
    } catch (err) {
      alert("Failed to delete job.");
    }
  };

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) setJdFile(acceptedFiles[0]);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] }, multiple: false
  });

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Job Title is required.");
    if (!jdText.trim() && !jdFile) return setError("Please provide either Job Description text or a file.");

    setLoading(true); setError('');
    const formData = new FormData();
    formData.append('title', title);
    formData.append('department', department);
    if (jdText) formData.append('job_description_text', jdText);
    if (jdFile) formData.append('job_description_file', jdFile);

    try {
      await axios.post(`${API_BASE_URL}/api/jobs`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTitle(''); setJdText(''); setJdFile(null);
      fetchJobs();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create job.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1121] text-slate-300 pt-6 pb-20 relative overflow-x-hidden font-sans selection:bg-blue-500/30">
      
      {/* Background Grid */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20"></div>
        <div className="absolute top-[10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Header */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black tracking-widest uppercase mb-4 shadow-sm">
              📋 ATS Database
            </div>
            <h2 className="text-4xl font-black text-white tracking-tight">Active Roles</h2>
            <p className="text-slate-400 font-medium mt-2">Manage job requisitions and initiate candidate scans.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
          
          {/* LEFT PANEL: CREATE JOB */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#0F172A]/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-800 p-8 sticky top-24">
              <div className="mb-8 border-b border-slate-800 pb-5">
                 <h3 className="text-xl font-black text-white">Create New Requisition</h3>
                 <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Upload JD to Database</p>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Job Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer" className="w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-[#0B1121] text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-sm font-medium shadow-inner" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Department</label>
                  <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-[#0B1121] text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-sm font-medium shadow-inner appearance-none cursor-pointer">
                    <option value="Engineering">Engineering</option>
                    <option value="Product">Product</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">JD Text (Optional)</label>
                  <textarea rows="3" value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste job description here..." className="w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-[#0B1121] text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all text-sm custom-scrollbar shadow-inner" />
                </div>

                <div>
                   <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">— OR UPLOAD FILE —</label>
                   <div {...getRootProps()} className={`relative group flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-700 bg-[#1E293B] hover:border-blue-500/50 hover:bg-blue-500/5'}`}>
                      <input {...getInputProps()} />
                      {jdFile ? (
                        <div className="flex items-center gap-3 w-full animate-in fade-in zoom-in duration-300">
                          <span className="text-2xl drop-shadow-md">🏢</span>
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-white truncate">{jdFile.name}</p>
                          </div>
                          <button type="button" className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 rounded-full text-red-400 transition-colors border border-red-500/20" onClick={(e) => { e.stopPropagation(); setJdFile(null); }}>✕</button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform drop-shadow-lg">📄</span>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Drop .PDF or .PNG</p>
                        </div>
                      )}
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 tracking-wide">
                  {loading ? (
                    <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> SAVING...</>
                  ) : "ADD TO DATABASE"}
                </button>
                {error && <p className="text-red-400 text-xs font-bold mt-2 text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</p>}
              </form>
            </div>
          </div>

          {/* RIGHT PANEL: JOB LIST */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.length === 0 ? (
                <div className="col-span-full bg-[#0F172A]/80 backdrop-blur-xl rounded-3xl shadow-lg border border-slate-800 p-16 text-center animate-in fade-in">
                  <div className="text-5xl mb-4 drop-shadow-md">📭</div>
                  <h3 className="text-xl font-black text-white mb-2">No Active Roles</h3>
                  <p className="text-slate-400 text-sm font-medium">Create a new job description to start scanning candidates.</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <div 
                    key={job.id} 
                    onClick={() => setViewingJob(job)}
                    className="bg-[#1E293B] p-6 rounded-3xl border border-slate-700 hover:border-blue-500/50 shadow-lg hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] transition-all cursor-pointer group flex flex-col relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 z-0 group-hover:scale-125 transition-transform duration-500"></div>
                    
                    <div className="relative z-10 flex justify-between items-start mb-4">
                       <span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">Job #{job.id}</span>
                       <button 
                         onClick={(e) => handleDeleteJob(e, job.id)}
                         className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                         title="Delete Job"
                       >
                         ✕
                       </button>
                    </div>
                    
                    <div className="relative z-10 mb-6 flex-1">
                      <h3 className="text-lg font-black text-white leading-tight mb-1 group-hover:text-blue-400 transition-colors">{job.title.split(' (')[0]}</h3>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{job.title.includes('(') ? job.title.split('(')[1].replace(')', '') : 'General'}</p>
                    </div>

                    <div className="relative z-10 flex gap-3">
                      <button 
                         onClick={(e) => { e.stopPropagation(); navigate('/candidate', { state: { selectedJobId: job.id } }); }}
                         className="flex-1 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-center"
                      >
                         Scan Resumes
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- DEEP DIVE MODAL (DARK MODE) --- */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070B14]/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-[#0F172A] rounded-3xl shadow-2xl border border-slate-800 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-start bg-slate-900/50">
              <div>
                <span className="px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 inline-flex shadow-sm">
                  Job #{viewingJob.id}
                </span>
                <h2 className="text-2xl font-black text-white leading-tight">{viewingJob.title}</h2>
              </div>
              <button 
                onClick={() => setViewingJob(null)}
                className="w-10 h-10 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full flex items-center justify-center transition-colors font-bold border border-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar bg-[#0B1121]">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">
                Full Job Description
              </h3>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap text-slate-300 font-medium">
                {viewingJob.description_text}
              </div>
            </div>
            
            <div className="p-6 bg-[#0F172A] border-t border-slate-800 flex justify-end gap-4">
              <button 
                onClick={() => setViewingJob(null)}
                className="px-6 py-3 bg-[#1E293B] hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition-colors border border-slate-700"
              >
                Close
              </button>
              <button 
                onClick={() => navigate('/candidate', { state: { selectedJobId: viewingJob.id } })}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 tracking-wide"
              >
                Scan Candidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobBoard;