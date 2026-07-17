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
      subject: 'Matched Tools & Skills',
      score: Math.round(featureBreakdown.skill_overlap_score * 100),
      fullMark: 100,
    },
    {
      subject: 'Contextual Exp. (Semantic)',
      score: Math.round(featureBreakdown.semantic_score * 100),
      fullMark: 100,
    },
    {
      subject: 'Exact Keyword Match (Lexical)',
      score: Math.round(featureBreakdown.lexical_score * 100),
      fullMark: 100,
    }
  ];

  // Custom Tooltip for the Enterprise Slate UI
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A1F2E]/90 backdrop-blur-md text-[#F7F9FC] p-4 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] text-xs font-bold border border-[#374151]">
          <p className="uppercase tracking-wider text-[#2F6FED] mb-1.5">{payload[0].payload.subject}</p>
          <p className="text-xl font-black">{payload[0].value}% Match</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            {/* Dark mode grid lines */}
            <PolarGrid stroke="#374151" />
            
            {/* Axis Labels (Muted Slate) */}
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: '600' }} 
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: '#475569', fontSize: 10 }} 
              tickCount={6}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Radar Polygon (Primary Blue) */}
            <Radar 
              name="Candidate Score" 
              dataKey="score" 
              stroke="#2F6FED" 
              strokeWidth={3}
              fill="#2F6FED" 
              fillOpacity={0.25} 
              activeDot={{ r: 6, fill: '#2F6FED', stroke: '#1A1F2E', strokeWidth: 3 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer text mapped to the Enterprise Slate theme */}
      <div className="mt-4 pt-4 border-t border-[#374151] grid grid-cols-3 gap-2 text-center w-full">
        <div>
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Keyword Match</p>
          <p className="text-lg font-black text-[#F7F9FC]">{data[2].score}%</p>
        </div>
        <div className="border-l border-r border-[#374151]">
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Contextual Exp.</p>
          <p className="text-lg font-black text-[#F7F9FC]">{data[1].score}%</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">Tools & Skills</p>
          <p className="text-lg font-black text-[#F7F9FC]">{data[0].score}%</p>
        </div>
      </div>
    </div>
  );
};

export default XAIDial;