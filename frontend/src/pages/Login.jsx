import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e, isDemo = false) => {
    if (e) e.preventDefault();
    setLoading(true); setError('');
    
    // Autofill demo credentials if the demo button was clicked
    const targetEmail = isDemo ? 'demo@company.com' : email;
    const targetPassword = isDemo ? 'demo123' : password;

    try {
      const formData = new URLSearchParams();
      formData.append('username', targetEmail);
      formData.append('password', targetPassword);

      const response = await axios.post(`${API_BASE_URL}/api/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      localStorage.setItem('access_token', response.data.access_token);
      navigate('/hr');
      window.location.reload(); 
    } catch (err) {
      setError("Invalid email or password.");
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
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome back</h2>
          <p className="text-sm text-slate-500 mt-2 font-medium">Log in to your ATS dashboard</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 text-sm font-bold rounded-xl flex items-center gap-2">
            <span>🚨</span> {error}
          </div>
        )}
        
        <form onSubmit={(e) => handleLogin(e, false)} className="space-y-5">
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
            />
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between gap-4">
          <hr className="flex-1 border-slate-200" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Or</span>
          <hr className="flex-1 border-slate-200" />
        </div>

        {/* The Viva Defense Lifesaver Button */}
        <button 
          type="button"
          onClick={() => handleLogin(null, true)}
          disabled={loading}
          className="mt-6 w-full bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold py-3.5 rounded-xl transition-all active:scale-[0.98]"
        >
          🚀 One-Click Demo Login
        </button>

        <p className="text-center mt-8 text-sm font-medium text-slate-500">
          New to the platform? <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-bold hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;