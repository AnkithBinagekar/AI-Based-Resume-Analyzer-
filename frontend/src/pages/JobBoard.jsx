import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Building, FileText, Inbox, X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

// --- CUSTOM DROPDOWN COMPONENT ---
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

  useEffect(() => { fetchJobs(); }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/jobs`);
      setJobs(response.data.data);
    } catch (err) { console.error("Failed to fetch jobs", err); }
  };

  const handleDeleteJob = async (e, jobId) => {
    e.stopPropagation(); 
    if (!window.confirm("Are you sure you want to delete this job description?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/jobs/${jobId}`);
      setJobs(prev => prev.filter(job => job.id !== jobId));
    } catch (err) { alert("Failed to delete job."); }
  };

  const onDrop = useCallback(acceptedFiles => { if (acceptedFiles?.length > 0) setJdFile(acceptedFiles[0]); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/pdf': ['.pdf'], 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] }, multiple: false });

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
    } catch (err) { setError(err.response?.data?.detail || "Failed to create job."); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#1A1F2E] text-[#F7F9FC] pt-6 pb-20 relative overflow-x-hidden font-sans selection:bg-[#2F6FED]/30">
      
      {/* Heavy Glowing Orbs for Glassmorphism Bleed */}
      <div className="absolute inset-0 z-0 pointer-events-none flex justify-center">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#242B3D_1px,transparent_1px),linear-gradient(to_bottom,#242B3D_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>
        <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-[#2F6FED]/20 blur-[120px] rounded-full pointer-events-none mix-blend-screen"></div>
        <div className="absolute bottom-[20%] left-[5%] w-[400px] h-[400px] bg-[#2FBF71]/10 blur-[150px] rounded-full pointer-events-none mix-blend-screen"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2F6FED]/10 backdrop-blur-md border border-[#2F6FED]/30 text-[#2F6FED] text-[10px] font-black tracking-widest uppercase mb-4 shadow-sm">
              <ClipboardList className="w-3 h-3" /> ATS Database
            </div>
            <h2 className="text-4xl font-black text-[#F7F9FC] tracking-tight drop-shadow-sm">Active Roles</h2>
            <p className="text-[#94A3B8] font-medium mt-2">Manage job requisitions and initiate candidate scans.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-700">
          
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#242B3D]/40 backdrop-blur-2xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] border border-white/10 p-8 sticky top-24 z-20">
              <div className="mb-8 border-b border-white/5 pb-5">
                 <h3 className="text-xl font-black text-[#F7F9FC] drop-shadow-sm">Create New Requisition</h3>
                 <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest mt-1">Upload JD to Database</p>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Job Title</label>
                  <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Frontend Engineer" className="w-full px-4 py-3.5 rounded-xl border border-white/5 bg-[#1A1F2E]/60 text-[#F7F9FC] placeholder:text-[#64748B] focus:bg-[#1A1F2E]/80 focus:ring-2 focus:ring-[#2F6FED]/50 outline-none transition-all text-sm font-medium shadow-inner backdrop-blur-md" />
                </div>
                
                <div className="relative z-30">
                  <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">Department</label>
                  <CustomDropdown 
                    value={department} 
                    onChange={setDepartment} 
                    options={[
                      { value: "Engineering", label: "Engineering" },
                      { value: "Product", label: "Product" },
                      { value: "Design", label: "Design" },
                      { value: "Marketing", label: "Marketing" },
                      { value: "Sales", label: "Sales" },
                      { value: "Operations", label: "Operations" }
                    ]} 
                    placeholder="Select a department..."
                  />
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2">JD Text (Optional)</label>
                  <textarea rows="3" value={jdText} onChange={(e) => setJdText(e.target.value)} placeholder="Paste job description here..." className="w-full px-4 py-3.5 rounded-xl border border-white/5 bg-[#1A1F2E]/60 text-[#F7F9FC] placeholder:text-[#64748B] focus:bg-[#1A1F2E]/80 focus:ring-2 focus:ring-[#2F6FED]/50 outline-none transition-all text-sm custom-scrollbar shadow-inner backdrop-blur-md" />
                </div>

                <div>
                   <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-wider mb-2 text-center">— OR UPLOAD FILE —</label>
                   <div {...getRootProps()} className={`relative group flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all backdrop-blur-md ${isDragActive ? 'border-[#2F6FED] bg-[#2F6FED]/20' : 'border-white/10 bg-[#1A1F2E]/40 hover:border-[#2F6FED]/50 hover:bg-[#2F6FED]/10'}`}>
                      <input {...getInputProps()} />
                      {jdFile ? (
                        <div className="flex items-center gap-3 w-full animate-in fade-in zoom-in duration-300">
                          <Building className="w-6 h-6 drop-shadow-md" />
                          <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-bold text-[#F7F9FC] truncate drop-shadow-sm">{jdFile.name}</p>
                          </div>
                          <button type="button" className="w-8 h-8 flex items-center justify-center bg-[#E85D75]/20 hover:bg-[#E85D75]/40 rounded-full text-[#E85D75] transition-colors border border-[#E85D75]/30" onClick={(e) => { e.stopPropagation(); setJdFile(null); }}><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <FileText className="w-8 h-8 mb-2 mx-auto text-[#94A3B8] group-hover:scale-110 transition-transform drop-shadow-lg" />
                          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Drop .PDF or .PNG</p>
                        </div>
                      )}
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full mt-4 bg-[#2F6FED]/90 backdrop-blur-md hover:bg-[#2563EB] text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(47,111,237,0.3)] border border-white/10 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 tracking-wide">
                  {loading ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> SAVING...</> : "ADD TO DATABASE"}
                </button>
                {error && <p className="text-[#E85D75] text-xs font-bold mt-2 text-center bg-[#E85D75]/10 backdrop-blur-md py-2 rounded-lg border border-[#E85D75]/30">{error}</p>}
              </form>
            </div>
          </div>

          <div className="lg:col-span-8 z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobs.length === 0 ? (
                <div className="col-span-full bg-[#242B3D]/40 backdrop-blur-3xl rounded-3xl shadow-2xl border border-white/10 p-24 text-center animate-in fade-in zoom-in-95">
                  <Inbox className="w-20 h-20 mx-auto mb-8 drop-shadow-md text-[#94A3B8]" />
                  <h3 className="text-3xl font-black text-[#F7F9FC] mb-3">No Active Roles</h3>
                  <p className="text-[#94A3B8] mb-10 text-lg font-medium">Create a new job description to start scanning candidates.</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <div 
                    key={job.id} 
                    onClick={() => setViewingJob(job)}
                    className="bg-[#242B3D]/40 backdrop-blur-xl p-6 rounded-3xl border border-white/5 hover:border-[#2F6FED]/50 shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_0_30px_rgba(47,111,237,0.2)] transition-all cursor-pointer group flex flex-col relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-[#2F6FED]/10 rounded-bl-full -mr-4 -mt-4 z-0 group-hover:scale-125 transition-transform duration-500"></div>
                    
                    <div className="relative z-10 flex justify-between items-start mb-4">
                       <span className="px-3 py-1 bg-[#2F6FED]/20 backdrop-blur-md text-[#2F6FED] border border-[#2F6FED]/30 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm">Job #{job.id}</span>
                       <button onClick={(e) => handleDeleteJob(e, job.id)} className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:bg-[#E85D75]/20 hover:text-[#E85D75] transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                    
                    <div className="relative z-10 mb-6 flex-1">
                      <h3 className="text-lg font-black text-[#F7F9FC] leading-tight mb-1 group-hover:text-[#2F6FED] transition-colors drop-shadow-sm">{job.title.split(' (')[0]}</h3>
                      <p className="text-xs font-bold text-[#94A3B8] uppercase tracking-widest">{job.title.includes('(') ? job.title.split('(')[1].replace(')', '') : 'General'}</p>
                    </div>

                    <div className="relative z-10 flex gap-3">
                      <button onClick={(e) => { e.stopPropagation(); navigate('/candidate', { state: { selectedJobId: job.id } }); }} className="flex-1 bg-[#2F6FED]/10 backdrop-blur-md hover:bg-[#2F6FED]/90 text-[#2F6FED] hover:text-white border border-[#2F6FED]/30 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all text-center">
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

      {viewingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/60 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#242B3D]/80 backdrop-blur-3xl rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-8 py-6 border-b border-white/5 flex justify-between items-start bg-[#1A1F2E]/40">
              <div>
                <span className="px-3 py-1.5 bg-[#2F6FED]/20 text-[#2F6FED] border border-[#2F6FED]/30 rounded-lg text-[10px] font-black uppercase tracking-widest mb-3 inline-flex shadow-sm backdrop-blur-md">Job #{viewingJob.id}</span>
                <h2 className="text-2xl font-black text-[#F7F9FC] leading-tight drop-shadow-sm">{viewingJob.title}</h2>
              </div>
              <button onClick={() => setViewingJob(null)} className="w-10 h-10 bg-[#1A1F2E]/50 hover:bg-white/10 text-[#94A3B8] hover:text-[#F7F9FC] rounded-full flex items-center justify-center transition-colors font-bold border border-white/5 backdrop-blur-md"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar bg-transparent">
              <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-widest mb-4">Full Job Description</h3>
              <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap text-[#F7F9FC] font-medium drop-shadow-sm">
                {viewingJob.description_text}
              </div>
            </div>
            
            <div className="p-6 bg-[#1A1F2E]/40 border-t border-white/5 flex justify-end gap-4 backdrop-blur-md">
              <button onClick={() => setViewingJob(null)} className="px-6 py-3 bg-[#242B3D]/50 hover:bg-white/10 text-[#F7F9FC] font-bold rounded-xl transition-colors border border-white/10 backdrop-blur-md">Close</button>
              <button onClick={() => navigate('/candidate', { state: { selectedJobId: viewingJob.id } })} className="px-8 py-3 bg-[#2F6FED]/90 hover:bg-[#2563EB] text-white border border-white/10 font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(47,111,237,0.3)] active:scale-95 tracking-wide backdrop-blur-md">Scan Candidate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JobBoard;