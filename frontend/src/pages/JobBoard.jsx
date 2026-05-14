import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = 'http://127.0.0.1:8001';

function JobBoard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [jdText, setJdText] = useState('');
  const [jdFile, setJdFile] = useState(null);
  const [error, setError] = useState('');
  
  // NEW STATE: Tracks which job description is currently being viewed
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
    e.stopPropagation(); // Prevent the card's onClick (which opens the modal) from firing
    
    // Quick confirmation dialog to prevent accidental clicks
    if (!window.confirm("Are you sure you want to delete this job requisition? This cannot be undone.")) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/jobs/${jobId}`);
      // Refresh the job list instantly after deletion
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
    <div className="animate-in fade-in duration-500 mt-6 relative">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-slate-800">Job Requisitions</h2>
        <p className="text-slate-500 font-medium mt-1">Manage open roles and target job descriptions for AI analysis.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* CREATE JOB FORM */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
            <h3 className="text-lg font-black text-slate-800 mb-6 uppercase tracking-wider">Create New Role</h3>
            <form onSubmit={handleCreateJob} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Job Title</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior React Developer" className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Department</label>
                <select value={department} onChange={e => setDepartment(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium">
                  {departments.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Job Description Text</label>
                <textarea rows="3" placeholder="Paste JD here..." value={jdText} onChange={e => setJdText(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" />
              </div>

              <div className="text-center text-xs font-bold text-slate-400 uppercase">OR UPLOAD FILE</div>

              <div {...getRootProps()} className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'}`}>
                <input {...getInputProps()} />
                {jdFile ? (
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-xl">🏢</span>
                    <p className="text-xs font-bold text-slate-800 truncate flex-1">{jdFile.name}</p>
                    <button type="button" className="text-red-500 hover:text-red-700" onClick={(e) => { e.stopPropagation(); setJdFile(null); }}>✕</button>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-2xl mb-1 block">📄</span>
                    <p className="text-[10px] uppercase font-bold text-slate-500">Drop PDF or Image</p>
                  </div>
                )}
              </div>

              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-bold rounded-lg">{error}</div>}

              <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 mt-4">
                {loading ? "SAVING..." : "SAVE ROLE TO DATABASE"}
              </button>
            </form>
          </div>
        </div>

        {/* SAVED JOBS GRID */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {jobs.length === 0 ? (
              <div className="col-span-2 bg-white rounded-3xl border border-slate-200 p-12 text-center">
                <span className="text-4xl block mb-4">📭</span>
                <h3 className="text-xl font-bold text-slate-700">No active roles</h3>
                <p className="text-slate-500 mt-2">Create your first job description on the left to start analyzing candidates.</p>
              </div>
            ) : (
              jobs.map(job => (
                <div 
                  key={job.id} 
                  onClick={() => setViewingJob(job)} 
                  className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 z-0 group-hover:scale-110 transition-transform"></div>
                  
                  {/* --- NEW DELETE BUTTON --- */}
                  <button
                    onClick={(e) => handleDeleteJob(e, job.id)}
                    className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all shadow-sm opacity-0 group-hover:opacity-100"
                    title="Delete Job"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>

                  <div className="relative z-10">
                    <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded mb-3">ID: #{job.id}</span>
                    <h3 className="text-lg font-black text-slate-800 leading-tight mb-1 pr-6">{job.title}</h3>
                    <p className="text-xs text-slate-500 mb-6 truncate">{job.description_text ? job.description_text.substring(0, 80) + '...' : 'File uploaded'}</p>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation(); // Prevents opening the modal when clicking the button
                        navigate('/candidate', { state: { selectedJobId: job.id } });
                      }}
                      className="text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                    >
                      Scan Candidate against Role <span className="text-lg">→</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- JOB DESCRIPTION MODAL --- */}
      {viewingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative">
            
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-black uppercase tracking-widest mb-3 inline-block">
                  Job ID: #{viewingJob.id}
                </span>
                <h2 className="text-2xl font-black text-slate-800 leading-tight">
                  {viewingJob.title}
                </h2>
              </div>
              <button 
                onClick={() => setViewingJob(null)}
                className="w-10 h-10 bg-white border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-full flex items-center justify-center text-slate-400 transition-colors shadow-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable Description) */}
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">
                Full Job Description
              </h3>
              <div className="prose prose-slate max-w-none text-sm leading-relaxed whitespace-pre-wrap text-slate-600">
                {viewingJob.description_text}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setViewingJob(null)}
                className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors"
              >
                Close
              </button>
              <button 
                onClick={() => navigate('/candidate', { state: { selectedJobId: viewingJob.id } })}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
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