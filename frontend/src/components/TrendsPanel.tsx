import React, { useState } from 'react';

interface TrendPoint {
  period: string;
  monthsAgo: number;
  sos?: number;
  sov?: number;
}

interface KeywordImpactItem {
  keyword: string;
  position: number;
  volumeChange: number;
  impactChange: number;
}

interface CompetitorTrend {
  name: string;
  trends: Array<{ period: string; monthsAgo: number; sos: number }>;
}

interface TrendsData {
  brandName: string;
  sosTrends: TrendPoint[];
  sovTrends: TrendPoint[];
  competitorTrends?: CompetitorTrend[];
  changes: {
    sos: { vs6MonthsAgo: number; vs12MonthsAgo: number };
    sov: { vs6MonthsAgo: number; vs12MonthsAgo: number };
  };
  keywordImpact?: {
    branded: { gainers: KeywordImpactItem[]; losers: KeywordImpactItem[] };
    generic: { gainers: KeywordImpactItem[]; losers: KeywordImpactItem[] };
  };
}

interface TrendsPanelProps {
  data: TrendsData | null;
  isLoading: boolean;
}

const COMPETITOR_COLORS = ['#8b5cf6', '#ec4899', '#06b6d4'];

const TrendArrow: React.FC<{ value: number }> = ({ value }) => {
  if (value === 0) return <span className="text-gray-400 text-xs">-</span>;
  return (
    <span className={`text-xs ${value > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
      {value > 0 ? '↑' : '↓'}
    </span>
  );
};

const ChangeValue: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex items-center gap-1">
    <TrendArrow value={value} />
    <span className={`text-xs font-medium ${value === 0 ? 'text-gray-500' : value > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {value > 0 ? '+' : ''}{value}pp
    </span>
    <span className="text-xs text-gray-400">{label}</span>
  </div>
);

// Compact Line Chart with competitor toggle
const LineChart: React.FC<{
  brandName: string;
  sosData: number[];
  sovData: number[];
  labels: string[];
  competitors?: CompetitorTrend[];
  selectedCompetitors: string[];
}> = ({ brandName, sosData, sovData, labels, competitors, selectedCompetitors }) => {
  const width = 320;
  const height = 140;
  const padding = { top: 16, right: 12, bottom: 24, left: 32 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Collect all visible data for scale calculation
  const allValues = [...sosData, ...sovData];
  if (competitors) {
    competitors
      .filter(c => selectedCompetitors.includes(c.name))
      .forEach(c => {
        c.trends.forEach(t => allValues.push(t.sos));
      });
  }

  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues.filter(v => v > 0), 0);
  const valueRange = maxValue - minValue || 1;

  const getX = (index: number) => padding.left + (index / (labels.length - 1)) * chartWidth;
  const getY = (value: number) => padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;

  const generatePath = (data: number[]) => {
    return data.map((value, index) => {
      const x = getX(index);
      const y = getY(value);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  };

  const gridLines = [];
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (i / 4) * chartHeight;
    const value = maxValue - (i / 4) * valueRange;
    gridLines.push({ y, value: Math.round(value) });
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-w-md">
      {/* Grid */}
      {gridLines.map((line, idx) => (
        <g key={idx}>
          <line x1={padding.left} y1={line.y} x2={width - padding.right} y2={line.y} stroke="#f3f4f6" strokeWidth="1" />
          <text x={padding.left - 4} y={line.y + 3} textAnchor="end" fontSize="8" fill="#9ca3af">{line.value}%</text>
        </g>
      ))}

      {/* Competitor lines */}
      {competitors?.filter(c => selectedCompetitors.includes(c.name)).map((comp, idx) => {
        const compData = [...comp.trends].reverse().map(t => t.sos);
        return (
          <g key={comp.name}>
            <path
              d={generatePath(compData)}
              fill="none"
              stroke={COMPETITOR_COLORS[idx]}
              strokeWidth="2"
              strokeDasharray="4 2"
              opacity="0.7"
            />
            {compData.map((value, i) => (
              <circle key={i} cx={getX(i)} cy={getY(value)} r="3" fill={COMPETITOR_COLORS[idx]} opacity="0.7" />
            ))}
          </g>
        );
      })}

      {/* SOS Line */}
      <path d={generatePath(sosData)} fill="none" stroke="#10b981" strokeWidth="2" />
      {sosData.map((value, index) => (
        <g key={`sos-${index}`}>
          <circle cx={getX(index)} cy={getY(value)} r="4" fill="#10b981" />
          <text x={getX(index)} y={getY(value) - 6} textAnchor="middle" fontSize="8" fontWeight="600" fill="#059669">{value}%</text>
        </g>
      ))}

      {/* SOV Line */}
      <path d={generatePath(sovData)} fill="none" stroke="#f97316" strokeWidth="2" />
      {sovData.map((value, index) => (
        <g key={`sov-${index}`}>
          <circle cx={getX(index)} cy={getY(value)} r="4" fill="#f97316" />
          <text x={getX(index)} y={getY(value) + 12} textAnchor="middle" fontSize="8" fontWeight="600" fill="#ea580c">{value}%</text>
        </g>
      ))}

      {/* X-axis */}
      {labels.map((label, index) => (
        <text key={index} x={getX(index)} y={height - 6} textAnchor="middle" fontSize="8" fill="#6b7280">{label}</text>
      ))}

      {/* Legend */}
      <g transform={`translate(${padding.left}, 4)`}>
        <rect width="6" height="6" fill="#10b981" rx="1" />
        <text x="8" y="5" fontSize="7" fill="#374151">{brandName} SOS</text>
        <rect x="55" width="6" height="6" fill="#f97316" rx="1" />
        <text x="63" y="5" fontSize="7" fill="#374151">SOV</text>
      </g>
    </svg>
  );
};

// Keyword Impact with tabs
const KeywordImpactSection: React.FC<{
  keywordImpact: TrendsData['keywordImpact'];
}> = ({ keywordImpact }) => {
  const [activeTab, setActiveTab] = useState<'branded' | 'generic'>('generic');

  if (!keywordImpact) return null;

  const currentData = activeTab === 'branded' ? keywordImpact.branded : keywordImpact.generic;
  const hasData = currentData.gainers.length > 0 || currentData.losers.length > 0;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-medium text-gray-700">Keyword Impact (12mo)</h5>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('generic')}
            className={`px-2 py-1 text-xs rounded-md transition-all ${
              activeTab === 'generic' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Generic
          </button>
          <button
            onClick={() => setActiveTab('branded')}
            className={`px-2 py-1 text-xs rounded-md transition-all ${
              activeTab === 'branded' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Branded
          </button>
        </div>
      </div>

      {hasData ? (
        <div className="grid grid-cols-2 gap-3">
          {/* Gainers */}
          <div className="bg-emerald-50 rounded-lg p-2.5 border border-emerald-100">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-emerald-600 text-xs">↑</span>
              <span className="text-xs font-medium text-emerald-700">Gainers</span>
            </div>
            {currentData.gainers.length > 0 ? (
              <div className="space-y-1.5">
                {currentData.gainers.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1.5">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-emerald-600 font-mono text-[10px]">#{item.position}</span>
                      <span className="truncate text-gray-700">{item.keyword}</span>
                    </div>
                    <span className="text-emerald-600 font-medium text-[10px] ml-1">+{item.impactChange}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-emerald-600">No gainers</p>
            )}
          </div>

          {/* Losers */}
          <div className="bg-red-50 rounded-lg p-2.5 border border-red-100">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-red-600 text-xs">↓</span>
              <span className="text-xs font-medium text-red-700">Losers</span>
            </div>
            {currentData.losers.length > 0 ? (
              <div className="space-y-1.5">
                {currentData.losers.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1.5">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-red-600 font-mono text-[10px]">#{item.position}</span>
                      <span className="truncate text-gray-700">{item.keyword}</span>
                    </div>
                    <span className="text-red-600 font-medium text-[10px] ml-1">{item.impactChange}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-red-600">No losers</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center py-2">No {activeTab} keyword data available</p>
      )}
    </div>
  );
};

export const TrendsPanel: React.FC<TrendsPanelProps> = ({ data, isLoading }) => {
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Historical Trends</h3>
        </div>
        <div className="p-4 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sosValues = [...data.sosTrends].reverse().map(t => t.sos || 0);
  const sovValues = [...data.sovTrends].reverse().map(t => t.sov || 0);
  const periodLabels = [...data.sosTrends].reverse().map(t => t.period.replace(' Months Ago', 'mo').replace(' Ago', ''));

  const toggleCompetitor = (name: string) => {
    setSelectedCompetitors(prev =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900">Historical Trends</h3>
            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded">12mo</span>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Chart and Competitor Selection */}
        <div className="flex gap-4">
          {/* Chart */}
          <div className="flex-1">
            <LineChart
              brandName={data.brandName}
              sosData={sosValues}
              sovData={sovValues}
              labels={periodLabels}
              competitors={data.competitorTrends}
              selectedCompetitors={selectedCompetitors}
            />
          </div>

          {/* Competitor Selector & Changes */}
          <div className="w-40 space-y-3">
            {/* Changes */}
            <div className="space-y-2">
              <div className="p-2 bg-emerald-50 rounded border border-emerald-100">
                <div className="text-[10px] font-medium text-emerald-700 mb-1">SOS</div>
                <ChangeValue value={data.changes.sos.vs6MonthsAgo} label="6mo" />
                <ChangeValue value={data.changes.sos.vs12MonthsAgo} label="12mo" />
              </div>
              <div className="p-2 bg-orange-50 rounded border border-orange-100">
                <div className="text-[10px] font-medium text-orange-700 mb-1">SOV</div>
                <ChangeValue value={data.changes.sov.vs6MonthsAgo} label="6mo" />
                <ChangeValue value={data.changes.sov.vs12MonthsAgo} label="12mo" />
              </div>
            </div>

            {/* Competitor Toggle */}
            {data.competitorTrends && data.competitorTrends.length > 0 && (
              <div className="p-2 bg-gray-50 rounded border border-gray-200">
                <div className="text-[10px] font-medium text-gray-600 mb-1.5">Compare with:</div>
                <div className="space-y-1">
                  {data.competitorTrends.map((comp, idx) => (
                    <label key={comp.name} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCompetitors.includes(comp.name)}
                        onChange={() => toggleCompetitor(comp.name)}
                        className="w-3 h-3 rounded border-gray-300"
                        style={{ accentColor: COMPETITOR_COLORS[idx] }}
                      />
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COMPETITOR_COLORS[idx] }}
                      />
                      <span className="text-[10px] text-gray-700 truncate">{comp.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyword Impact */}
        <KeywordImpactSection keywordImpact={data.keywordImpact} />

        {/* Compact Insights */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
          <div className={`p-2 rounded ${
            data.changes.sos.vs12MonthsAgo > 2 ? 'bg-emerald-50 text-emerald-700' :
            data.changes.sos.vs12MonthsAgo < -2 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
          }`}>
            {data.changes.sos.vs12MonthsAgo > 2 ? 'Brand awareness growing' :
             data.changes.sos.vs12MonthsAgo < -2 ? 'Brand awareness declining' : 'Brand stable'}
          </div>
          <div className={`p-2 rounded ${
            data.changes.sov.vs12MonthsAgo > 2 ? 'bg-emerald-50 text-emerald-700' :
            data.changes.sov.vs12MonthsAgo < -2 ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
          }`}>
            {data.changes.sov.vs12MonthsAgo > 2 ? 'SEO visibility improving' :
             data.changes.sov.vs12MonthsAgo < -2 ? 'SEO visibility declining' : 'Visibility stable'}
          </div>
        </div>
      </div>
    </div>
  );
};
