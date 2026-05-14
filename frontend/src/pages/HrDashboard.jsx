import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8001';

function HrDashboard() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/candidates`);
      setCandidates(response.data.data);
    } catch (err) {
      console.error("Failed to fetch candidates", err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreBadge = (score) => {
    if (score >= 75) return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full text-xs font-black">{score.toFixed(1)}%</span>;
    if (score >= 50) return <span className="px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-full text-xs font-black">{score.toFixed(1)}%</span>;
    return <span className="px-3 py-1 bg-red-100 text-red-800 border border-red-200 rounded-full text-xs font-black">{score.toFixed(1)}%</span>;
  };

  return (
    <div className="animate-in fade-in duration-500 mt-6">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-800">Enterprise Leaderboard</h2>
          <p className="text-slate-500 font-medium mt-1">Global AI analysis history across all roles and candidates.</p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-3xl font-black text-blue-600">{candidates.length}</p>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Total Scans</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-slate-400 font-bold animate-pulse">Loading secure database...</div>
        ) : candidates.length === 0 ? (
          <div className="p-20 text-center">
            <span className="text-4xl block mb-4">🗄️</span>
            <h3 className="text-xl font-bold text-slate-700">Database Empty</h3>
            <p className="text-slate-500 mt-2">Go to the Candidate Portal and run an analysis to populate this leaderboard.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Candidate File</th>
                  <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Job ID</th>
                  <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest">Overall Match</th>
                  <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest hidden md:table-cell">Skill Overlap</th>
                  <th className="p-5 text-xs font-black text-slate-500 uppercase tracking-widest hidden lg:table-cell">Exp / Edu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{candidate.filename.includes('🔒') ? '🕵️‍♂️' : '📄'}</span>
                        <span className={`text-sm font-bold truncate max-w-[200px] ${candidate.filename.includes('🔒') ? 'text-emerald-700' : 'text-slate-800'}`}>
                          {candidate.filename}
                        </span>
                      </div>
                    </td>
                    <td className="p-5 text-sm font-bold text-slate-500">#{candidate.job_id}</td>
                    <td className="p-5">{getScoreBadge(candidate.final_score)}</td>
                    <td className="p-5 hidden md:table-cell text-sm font-semibold text-slate-600">
                      {(candidate.skill_overlap_score * 100).toFixed(1)}%
                    </td>
                    <td className="p-5 hidden lg:table-cell">
                      <div className="text-sm font-bold text-slate-800">{candidate.total_yoe || 0} Yrs</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[150px]">{candidate.highest_education || 'Unknown'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default HrDashboard;