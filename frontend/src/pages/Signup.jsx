import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await axios.post(`${API_BASE_URL}/api/signup`, { email, password });
      navigate('/login', { state: { message: "Account created successfully. Please log in." }});
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true); setError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', 'demo@company.com');
      formData.append('password', 'demo123');
      const response = await axios.post(`${API_BASE_URL}/api/login`, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      localStorage.setItem('access_token', response.data.access_token);
      navigate('/hr');
      window.location.reload(); 
    } catch (err) {
      setError("Demo login failed.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B1121] relative overflow-hidden p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0B1121] to-[#0B1121]"></div>
      
      {/* 🚀 NEW: Top-Left Logo / Back to Landing Page */}
      <Link to="/" className="absolute top-6 left-6 md:top-10 md:left-10 flex items-center gap-2 text-white hover:text-blue-400 transition-all z-50 group">
        <span className="text-2xl drop-shadow-md group-hover:scale-110 transition-transform">⚡</span>
        <span className="text-xl font-black tracking-tight hidden sm:block">AI Resume Analyzer</span>
      </Link>

      <div className="w-full max-w-md bg-[#0F172A] p-10 rounded-3xl border border-slate-800 shadow-2xl relative z-10">
        <div className="text-center mb-10">
          <div className="text-4xl mb-4 drop-shadow-lg">⚡</div>
          <h2 className="text-2xl font-black text-white">Create Workspace</h2>
          <p className="text-slate-400 text-sm font-medium mt-2">Get started with IntelligenceATS</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-[#0B1121] text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm font-medium shadow-inner" placeholder="recruiter@company.com" />
          </div>
          
          <div className="relative">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Password</label>
            <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-slate-700 bg-[#0B1121] text-white focus:ring-2 focus:ring-blue-500/50 outline-none transition-all text-sm font-medium shadow-inner pr-12" placeholder="••••••••" minLength={6} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[36px] text-slate-500 hover:text-slate-300 transition-colors text-lg">
              {showPassword ? "👁️" : "👁️‍🗨️"}
            </button>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-[0.98] disabled:opacity-70 mt-2 tracking-wide">
            {loading ? 'SETTING UP...' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <button onClick={handleDemoLogin} className="mt-6 w-full bg-[#1E293B] hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] text-sm shadow-sm flex items-center justify-center gap-2">
          <span>🚀</span> Quick Demo Login
        </button>

        {error && <p className="text-red-400 text-xs font-bold mt-4 text-center bg-red-500/10 py-3 rounded-lg border border-red-500/20">{error}</p>}

        <p className="text-center mt-8 text-sm font-medium text-slate-500">
          Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;