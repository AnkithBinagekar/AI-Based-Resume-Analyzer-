import React from 'react';
import { useNavigate } from 'react-router-dom';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center pt-20">
      
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto px-4 mb-20">
        <span className="inline-block py-1 px-3 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold tracking-wide mb-6 border border-emerald-200">
          FINAL YEAR IT PROJECT
        </span>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-blue-600">
          Hire Smarter. <br /> Not Harder.
        </h1>
        <p className="text-lg md:text-xl text-slate-500 mb-10 leading-relaxed">
          An enterprise-grade Applicant Tracking System powered by RAG-Fusion and Explainable AI. Say goodbye to keyword stuffing and hello to semantic matching.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={() => navigate('/candidate')} 
            className="px-8 py-4 text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95"
          >
            Candidate Portal
          </button>
          <button 
            onClick={() => navigate('/hr')} 
            className="px-8 py-4 text-base font-bold text-slate-700 bg-white border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
          >
            HR Dashboard
          </button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full px-4">
        
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl mb-6">🧠</div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">Explainable AI (XAI)</h3>
          <p className="text-slate-500 leading-relaxed">
            Understand exactly why a candidate matched. Our Random Forest ensemble breaks down Semantic, Lexical, and Skill overlap.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-2xl mb-6">💬</div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">RAG-Fusion Copilot</h3>
          <p className="text-slate-500 leading-relaxed">
            Chat directly with the resume. We use ChromaDB and multi-query retrieval to eliminate AI hallucinations.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
          <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-2xl mb-6">🛡️</div>
          <h3 className="text-xl font-bold text-slate-800 mb-3">Fraud Detection</h3>
          <p className="text-slate-500 leading-relaxed">
            Built-in blind hiring mode to scrub PII, alongside invisible ink detection to flag fraudulent CVs.
          </p>
        </div>

      </div>
    </div>
  );
}

export default LandingPage;