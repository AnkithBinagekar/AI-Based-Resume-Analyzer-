import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// Vite dynamic environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // FastAPI expects standard JSON for the Signup route
      await axios.post(`${API_BASE_URL}/api/signup`, { email, password });
      
      // Navigate to login smoothly on success
      navigate('/login', { state: { message: "Account created successfully. Please log in." }});
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative bg-slate-50 overflow-hidden">
      
      {/* SaaS Background Pattern */}
      <div className="absolute inset-0 -z-10 h-full w-full bg-slate-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-60"></div>

      {/* Simple Logo Header */}
      <div className="absolute top-8 left-8 flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg">AI</div>
        <span className="font-extrabold text-slate-800 tracking-tight text-xl">Resume Analyzer</span>
      </div>

      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-slate-200 p-10 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Create Workspace</h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">Join the enterprise ATS platform</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <span>🚨</span> {error}
          </div>
        )}
        
        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Work Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-medium"
              placeholder="recruiter@company.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Password</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              className="w-full px-4 py-3.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all bg-slate-50 focus:bg-white text-sm font-medium"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Setting up Workspace...' : 'Create Account'}
          </button>
        </form>

        <p className="text-center mt-8 text-sm font-medium text-slate-500">
          Already have an account? <Link to="/login" className="text-slate-900 hover:text-blue-600 font-bold hover:underline transition-colors">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;