import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

const XAIDial = ({ featureBreakdown }) => {
  if (!featureBreakdown) return null;

  const data = [
    { metric: 'Skill Overlap', score: Math.round(featureBreakdown.skill_overlap_score * 100), fullMark: 100 },
    { metric: 'Semantic', score: Math.round(featureBreakdown.semantic_score * 100), fullMark: 100 },
    { metric: 'Lexical', score: Math.round(featureBreakdown.lexical_score * 100), fullMark: 100 }
  ];

  return (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e0e0e0', width: '100%', maxWidth: '400px', margin: '0 auto', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: '#2c3e50' }}>Explainable AI (XAI)</h3>
      <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: '#7f8c8d' }}>
        Multidimensional breakdown of the final match score.
      </p>
      
      {/* THIS IS THE CRITICAL FIX: Explicit Height in Pixels */}
      <div style={{ width: '100%', height: '260px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#2c3e50', fontSize: 13, fontWeight: 'bold' }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip />
            <Radar
              name="Score %"
              dataKey="score"
              stroke="#3498db"
              fill="#3498db"
              fillOpacity={0.5}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default XAIDial;