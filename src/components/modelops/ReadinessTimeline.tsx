'use client';

import React, { useState } from 'react';
import { ModelCardOutput, VersionHistoryPoint } from '@/types/modelops';
import { buildVersionTimeline, TimelineTrendSummary } from '@/lib/modelops/timeline';
import { TrendingUp, TrendingDown, History, AlertTriangle, CheckCircle2, Calendar, Sparkles, Layers } from 'lucide-react';

interface ReadinessTimelineProps {
  currentCard: ModelCardOutput;
  templateId?: string | null;
}

export default function ReadinessTimeline({ currentCard, templateId }: ReadinessTimelineProps) {
  const summary: TimelineTrendSummary = buildVersionTimeline(currentCard, templateId);
  const [hoveredPoint, setHoveredPoint] = useState<VersionHistoryPoint | null>(
    summary.points[summary.points.length - 1]
  );

  const { points, trajectory, scoreDelta, driftWarning, highestScore, lowestScore } = summary;

  // Chart dimensions
  const svgWidth = 700;
  const svgHeight = 220;
  const paddingX = 60;
  const paddingY = 40;
  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  const minScore = Math.max(0, Math.min(...points.map((p) => p.readiness_score)) - 10);
  const maxScore = Math.min(100, Math.max(...points.map((p) => p.readiness_score)) + 10);

  const getCoordinates = (index: number, score: number) => {
    const x = paddingX + (index / (points.length - 1)) * chartWidth;
    const y = svgHeight - paddingY - ((score - minScore) / (maxScore - minScore || 1)) * chartHeight;
    return { x, y };
  };

  const pathData = points
    .map((p, idx) => {
      const { x, y } = getCoordinates(idx, p.readiness_score);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  const areaData = `${pathData} L ${getCoordinates(points.length - 1, minScore).x} ${
    svgHeight - paddingY
  } L ${getCoordinates(0, minScore).x} ${svgHeight - paddingY} Z`;

  return (
    <div className="bg-white border border-gray-300 rounded-md p-6 sm:p-8 shadow-xs space-y-6 text-gray-900 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-emerald-50 text-[#13715B] border border-emerald-200 rounded text-[11px] font-bold uppercase tracking-wider font-mono">
              Continuous Governance
            </span>
            <span className="text-xs text-gray-500 font-mono">Multi-Version Trajectory</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <History className="w-5 h-5 text-[#13715B]" />
            Readiness Trend Timeline
          </h3>
        </div>

        {/* Trajectory Pill */}
        <div className="flex items-center gap-2">
          {driftWarning && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded text-xs font-bold font-mono">
              <AlertTriangle className="w-3.5 h-3.5" /> Drift Warning
            </span>
          )}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold border ${
              trajectory === 'upward'
                ? 'bg-emerald-50 text-[#13715B] border-emerald-200'
                : trajectory === 'downward'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-gray-100 text-gray-700 border-gray-300'
            }`}
          >
            {trajectory === 'upward' ? (
              <>
                <TrendingUp className="w-4 h-4" /> Trajectory (+{scoreDelta} pts over {points.length} releases)
              </>
            ) : trajectory === 'downward' ? (
              <>
                <TrendingDown className="w-4 h-4" /> Trajectory ({scoreDelta} pts over {points.length} releases)
              </>
            ) : (
              <span>Stable Trajectory</span>
            )}
          </span>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="p-4 bg-gray-50/70 border border-gray-200 rounded overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-64 select-none">
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#13715B" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#13715B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((scoreVal) => {
            if (scoreVal < minScore || scoreVal > maxScore) return null;
            const y = svgHeight - paddingY - ((scoreVal - minScore) / (maxScore - minScore || 1)) * chartHeight;
            return (
              <g key={scoreVal}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="#E5E7EB"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#9CA3AF" fontFamily="monospace">
                  {scoreVal}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path d={areaData} fill="url(#areaGradient)" />

          {/* Line stroke */}
          <path d={pathData} fill="none" stroke="#13715B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Nodes */}
          {points.map((p, idx) => {
            const { x, y } = getCoordinates(idx, p.readiness_score);
            const isSelected = hoveredPoint?.version === p.version;
            const isCurrent = idx === points.length - 1;

            return (
              <g
                key={p.version}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(p)}
                onClick={() => setHoveredPoint(p)}
              >
                <circle
                  cx={x}
                  y={y}
                  r={isSelected ? 7 : isCurrent ? 6 : 4.5}
                  fill={isCurrent ? '#13715B' : '#FFFFFF'}
                  stroke="#13715B"
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all duration-200 hover:scale-125"
                />

                {/* Version Label */}
                <text
                  x={x}
                  y={svgHeight - 15}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  fill={isSelected ? '#13715B' : '#4B5563'}
                  fontFamily="monospace"
                >
                  {p.version.split(' ')[0]}
                </text>

                {/* Score badge above node */}
                <text
                  x={x}
                  y={y - 12}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill="#111827"
                  fontFamily="monospace"
                >
                  {p.readiness_score}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Version Detail Card */}
      {hoveredPoint && (
        <div className="p-4 bg-emerald-50/30 border border-emerald-200 rounded space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-[#13715B]">{hoveredPoint.version}</span>
              <span className="text-xs text-gray-500 font-mono flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" /> {hoveredPoint.release_date}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">Readiness Score:</span>
              <span className="px-2 py-0.5 bg-[#13715B] text-white rounded font-mono font-bold text-xs">
                {hoveredPoint.readiness_score} / 100
              </span>
            </div>
          </div>

          <p className="text-xs text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-900">Release Changelog / Milestone: </span>
            {hoveredPoint.primary_change}
          </p>

          {/* Metric snapshot chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {Object.entries(hoveredPoint.metrics).map(([mKey, mVal]) => (
              <div key={mKey} className="px-2.5 py-1 bg-white border border-gray-200 rounded text-[11px] font-mono">
                <span className="text-gray-500 capitalize">{mKey.replace(/_/g, ' ')}: </span>
                <span className="font-bold text-gray-900">{typeof mVal === 'number' ? mVal : String(mVal)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestone Table */}
      <div className="border border-gray-200 rounded overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-bold uppercase tracking-wider font-mono text-gray-900">
          Model Release History Matrix
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/70 border-b border-gray-200 text-gray-700 font-semibold">
                <th className="p-3">Release Version</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Readiness</th>
                <th className="p-3">Key Metrics</th>
                <th className="p-3">Milestone Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {points.map((pt, i) => {
                const isSelected = hoveredPoint?.version === pt.version;
                return (
                  <tr
                    key={pt.version}
                    onClick={() => setHoveredPoint(pt)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-emerald-50/60 font-medium' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="p-3 font-mono font-bold text-gray-900">{pt.version}</td>
                    <td className="p-3 text-gray-600 font-mono">{pt.release_date}</td>
                    <td className="p-3 text-right font-mono font-bold text-[#13715B]">{pt.readiness_score} pts</td>
                    <td className="p-3 font-mono text-gray-600">
                      {Object.entries(pt.metrics)
                        .slice(0, 2)
                        .map(([k, v]) => `${k.slice(0, 3)}: ${v}`)
                        .join(' | ')}
                    </td>
                    <td className="p-3 text-gray-600 max-w-xs truncate">{pt.primary_change}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
