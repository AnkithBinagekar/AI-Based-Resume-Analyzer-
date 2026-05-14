import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip 
} from 'recharts';

const XAIDial = ({ featureBreakdown }) => {
  if (!featureBreakdown) return null;

  // Transform the backend decimals (0.0 to 1.0) into UI percentages (0 to 100)
  const data = [
    {
      subject: 'Hard Skill Overlap',
      score: Math.round(featureBreakdown.skill_overlap_score * 100),
      fullMark: 100,
    },
    {
      subject: 'Semantic Context',
      score: Math.round(featureBreakdown.semantic_score * 100),
      fullMark: 100,
    },
    {
      subject: 'Lexical Match',
      score: Math.round(featureBreakdown.lexical_score * 100),
      fullMark: 100,
    }
  ];

  // Custom Tooltip for a polished UI
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-xs font-bold border border-slate-700">
          <p className="uppercase tracking-wider text-blue-300 mb-1">{payload[0].payload.subject}</p>
          <p className="text-lg">{payload[0].value}% Match</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 w-full animate-in fade-in zoom-in-95 duration-500">
      <div className="mb-2 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <span className="text-blue-600">⬡</span> Explainable AI (XAI)
          </h3>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Random Forest Decision Vectors
          </p>
        </div>
        <div className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-widest rounded-md self-start md:self-auto">
          Zero-Hallucination
        </div>
      </div>
      
      {/* Explicit Height for Recharts */}
      <div className="h-64 md:h-72 w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
            <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#475569', fontSize: 11, fontWeight: '800' }} 
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: '#94a3b8', fontSize: 10 }} 
              tickCount={6}
            />
            <Tooltip content={<CustomTooltip />} />
            <Radar 
              name="Candidate Score" 
              dataKey="score" 
              stroke="#2563eb" 
              strokeWidth={3}
              fill="#3b82f6" 
              fillOpacity={0.35} 
              activeDot={{ r: 6, fill: '#1d4ed8', stroke: '#fff', strokeWidth: 2 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Lexical</p>
          <p className="text-sm font-black text-slate-700">{data[2].score}%</p>
        </div>
        <div className="border-l border-r border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Semantic</p>
          <p className="text-sm font-black text-slate-700">{data[1].score}%</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Overlap</p>
          <p className="text-sm font-black text-slate-700">{data[0].score}%</p>
        </div>
      </div>
    </div>
  );
};

export default XAIDial;