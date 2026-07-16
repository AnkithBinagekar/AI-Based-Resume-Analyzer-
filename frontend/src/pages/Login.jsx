import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Zap, Eye, EyeOff, Rocket } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001';

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e, isDemo = false) => {
    if (e) e.preventDefault();
    setLoading(true); setError('');
    const targetEmail = isDemo ? 'demo@company.com' : email;
    const targetPassword = isDemo ? 'demo123' : password;

    try {
      const formData = new URLSearchParams();
      formData.append('username', targetEmail);
      formData.append('password', targetPassword);
      const response = await axios.post(`${API_BASE_URL}/api/login`, formData, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
      localStorage.setItem('access_token', response.data.access_token);
      navigate('/hr');
      window.location.reload(); 
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1A1F2E] relative overflow-hidden p-6 font-sans">
      {/* Intense glowing orbs to bleed through the glass */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#2F6FED]/20 via-[#1A1F2E] to-[#1A1F2E]"></div>
      <div className="absolute top-[20%] left-[30%] w-[400px] h-[400px] bg-[#2F6FED]/20 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
      
      <Link to="/" className="absolute top-6 left-6 md:top-10 md:left-10 flex items-center gap-2 text-[#F7F9FC] hover:text-[#2F6FED] transition-all z-50 group">
        <Zap className="w-6 h-6 text-[#2F6FED] drop-shadow-[0_0_15px_rgba(47,111,237,0.6)] group-hover:scale-110 transition-transform" />
        <span className="text-xl font-black tracking-tight hidden sm:block">AI Resume Analyzer</span>
      </Link>

      {/* 🔮 HEAVY GLASSMORPHISM CONTAINER */}
      <div className="w-full max-w-md bg-[#242B3D]/40 backdrop-blur-2xl p-10 rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] relative z-10">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4"><Zap className="w-10 h-10 text-[#2F6FED] drop-shadow-[0_0_20px_rgba(47,111,237,0.5)]" /></div>
          <h2 className="text-2xl font-black text-[#F7F9FC]">Welcome Back</h2>
          <p className="text-[#94A3B8] text-sm font-medium mt-2">Sign in to your ATS workspace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-2 ml-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-white/5 bg-[#1A1F2E]/50 text-[#F7F9FC] focus:bg-[#1A1F2E]/80 focus:ring-2 focus:ring-[#2F6FED]/50 outline-none transition-all text-sm font-medium shadow-inner backdrop-blur-sm" placeholder="name@company.com" />
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-[#94A3B8] uppercase tracking-widest mb-2 ml-1">Password</label>
            <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full px-4 py-3.5 rounded-xl border border-white/5 bg-[#1A1F2E]/50 text-[#F7F9FC] focus:bg-[#1A1F2E]/80 focus:ring-2 focus:ring-[#2F6FED]/50 outline-none transition-all text-sm font-medium shadow-inner backdrop-blur-sm pr-12" placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-[36px] text-[#94A3B8] hover:text-[#F7F9FC] transition-colors text-lg">
              {showPassword ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
            </button>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-[#2F6FED]/90 backdrop-blur-md hover:bg-[#2563EB] text-white font-black py-4 rounded-xl transition-all shadow-[0_0_20px_rgba(47,111,237,0.3)] active:scale-[0.98] disabled:opacity-70 mt-2 tracking-wide border border-white/10">
            {loading ? 'AUTHENTICATING...' : 'SIGN IN'}
          </button>
        </form>

        <button onClick={() => handleLogin(null, true)} className="mt-6 w-full bg-[#1A1F2E]/50 backdrop-blur-md hover:bg-[#242B3D]/80 text-[#F7F9FC] border border-white/5 font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] text-sm shadow-sm flex items-center justify-center gap-2">
          <Rocket className="w-4 h-4" /> One-Click Demo Login
        </button>

        {error && <p className="text-[#E85D75] text-xs font-bold mt-4 text-center bg-[#E85D75]/10 backdrop-blur-md py-3 rounded-lg border border-[#E85D75]/20">{error}</p>}
        
        <p className="text-center mt-8 text-sm font-medium text-[#94A3B8]">
          Don't have an account? <Link to="/signup" className="text-[#2F6FED] hover:text-[#2F6FED]/80 font-bold drop-shadow-sm">Create one</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;