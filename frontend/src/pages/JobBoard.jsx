import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';

// Fixed Vite Environment Variable
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
    if (!window.confirm("Are you sure you want to delete this job requisition? This cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/jobs/${jobId}`);
      fetchJobs(); 
    } catch (err) {
      console.error("Failed to delete job", err);
      alert("Failed to delete the job. Check the console.");
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
    if (!jdText && !jdFile) return setError("Please provide either JD Text or a JD File.");
    setLoading(true); setError('');

    const formData = new FormData();
    formData.append('title', title);
    formData.append('department', department);
    if (jdText) formData.append('job_description_text', jdText);
    if (jdFile) formData.append('job_description_file', jdFile);

    try {
      await axios.post(`${API_BASE_URL}/api/jobs`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setTitle(''); setJdText(''); setJdFile(null); setDepartment('Engineering');
      fetchJobs();
    } catch (err) {
      setError("Failed to create job.");
    } finally {
      setLoading(false);
    }
  };

  const departments = ["Engineering", "Product", "Design", "Marketing", "Sales", "HR", "General"];

  return (
    <div className="min-h-screen bg-slate-50 pt-6 pb-20 relative overflow-hidden">
      
      {/* SaaS Background Pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>

      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100/50 text-indigo-700 text-xs font-bold tracking-widest uppercase mb-3 border border-indigo-200">
            💼 Job Architecture
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Job Requisitions</h2>
          <p className="text-slate-500 font-medium mt-2">Manage open roles and target job descriptions for AI analysis.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
          
          {/* CREATE JOB FORM */}
          <div className="lg:col-span-4">
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-sm border border-slate-200 p-8 sticky top-24">
              <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-wider flex items-center gap-2">
                <span className="text-blue-600">⊕</span> Create New Role
              </h3>
              <form onSubmit={handleCreateJob} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Job Title</label>
                  <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior React Developer" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department</label>
                  <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-medium">
                    {departments.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Job Description Text</label>
                  <textarea rows="3" placeholder="Paste JD here..." value={jdText} onChange={e => setJdText(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm custom-scrollbar" />
                </div>

                <div className="flex items-center gap-4 my-2">
                  <hr className="flex-1 border-slate-200" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Or Upload File</span>
                  <hr className="flex-1 border-slate-200" />
                </div>

                <div {...getRootProps()} className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'}`}>
                  <input {...getInputProps()} />
                  {jdFile ? (
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-xl">🏢</span>
                      <p className="text-xs font-bold text-slate-800 truncate flex-1">{jdFile.name}</p>
                      <button type="button" className="text-red-500 hover:text-red-700 p-1" onClick={(e) => { e.stopPropagation(); setJdFile(null); }}>✕</button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="text-2xl mb-1 block group-hover:scale-110 transition-transform">📄</span>
                      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Drop PDF or Image</p>
                    </div>
                  )}
                </div>

                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg flex items-center gap-2"><span>⚠️</span>{error}</div>}

                <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 mt-4">
                  {loading ? "SAVING..." : "SAVE ROLE TO DATABASE"}
                </button>
              </form>
            </div>
          </div>

          {/* SAVED JOBS GRID */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {jobs.length === 0 ? (
                <div className="col-span-2 bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200 p-16 text-center">
                  <span className="text-5xl block mb-4">📭</span>
                  <h3 className="text-2xl font-black text-slate-800">No active roles</h3>
                  <p className="text-slate-500 mt-2 font-medium">Create your first job description on the left to start analyzing candidates.</p>
                </div>
              ) : (
                jobs.map(job => (
                  <div 
                    key={job.id} 
                    onClick={() => setViewingJob(job)} 
                    className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden cursor-pointer"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 z-0 group-hover:scale-110 transition-transform"></div>
                    
                    <button
                      onClick={(e) => handleDeleteJob(e, job.id)}
                      className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                      title="Delete Job"
                    >
                      ✕
                    </button>

                    <div className="relative z-10">
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded mb-3 border border-slate-200">ID: #{job.id}</span>
                      <h3 className="text-xl font-black text-slate-800 leading-tight mb-2 pr-6">{job.title}</h3>
                      <p className="text-sm text-slate-500 mb-6 truncate font-medium">{job.description_text ? job.description_text.substring(0, 80) + '...' : 'File uploaded'}</p>
                      
                      <div className="flex items-center text-sm font-bold text-blue-600 group-hover:text-blue-800 transition-colors">
                        Scan Candidate against Role 
                        <span className="ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-lg">→</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- JOB DESCRIPTION MODAL --- */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-black uppercase tracking-widest mb-3 inline-block border border-blue-200">
                  Job ID: #{viewingJob.id}
                </span>
                <h2 className="text-3xl font-black text-slate-800 leading-tight">
                  {viewingJob.title}
                </h2>
              </div>
              <button 
                onClick={() => setViewingJob(null)}
                className="w-10 h-10 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-full flex items-center justify-center text-slate-400 transition-colors shadow-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Full Job Description
              </h3>
              <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap text-slate-600 font-medium">
                {viewingJob.description_text}
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setViewingJob(null)}
                className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors shadow-sm"
              >
                Close
              </button>
              <button 
                onClick={() => navigate('/candidate', { state: { selectedJobId: viewingJob.id } })}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95"
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