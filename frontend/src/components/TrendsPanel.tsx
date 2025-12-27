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
  if (value === 0) return <span className="text-gray-400 dark:text-gray-500 dark:text-gray-400 text-sm">-</span>;
  return (
    <span className={`text-sm ${value > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
      {value > 0 ? '↑' : '↓'}
    </span>
  );
};

const ChangeValue: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="flex items-center gap-1.5">
    <TrendArrow value={value} />
    <span className={`text-sm font-medium ${value === 0 ? 'text-gray-500 dark:text-gray-400' : value > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
      {value > 0 ? '+' : ''}{value}pp
    </span>
    <span className="text-sm text-gray-400">{label}</span>
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
  const width = 420;
  const height = 180;
  const padding = { top: 20, right: 12, bottom: 28, left: 36 };
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
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid */}
      {gridLines.map((line, idx) => (
        <g key={idx}>
          <line x1={padding.left} y1={line.y} x2={width - padding.right} y2={line.y} stroke="#f3f4f6" strokeWidth="1" />
          <text x={padding.left - 4} y={line.y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">{line.value}%</text>
        </g>
      ))}

      {/* Competitor lines with values */}
      {competitors?.filter(c => selectedCompetitors.includes(c.name)).map((comp, idx) => {
        const compData = [...comp.trends].reverse().map(t => t.sos);
        return (
          <g key={comp.name}>
            <path
              d={generatePath(compData)}
              fill="none"
              stroke={COMPETITOR_COLORS[idx]}
              strokeWidth="2"
              strokeDasharray="5 3"
              opacity="0.8"
            />
            {compData.map((value, i) => (
              <g key={i}>
                <circle cx={getX(i)} cy={getY(value)} r="3" fill={COMPETITOR_COLORS[idx]} opacity="0.8" />
                <text
                  x={getX(i)}
                  y={getY(value) - 6}
                  textAnchor="middle"
                  fontSize="8"
                  fontWeight="500"
                  fill={COMPETITOR_COLORS[idx]}
                  opacity="0.9"
                >
                  {value}%
                </text>
              </g>
            ))}
          </g>
        );
      })}

      {/* SOS Line */}
      <path d={generatePath(sosData)} fill="none" stroke="#10b981" strokeWidth="2" />
      {sosData.map((value, index) => (
        <g key={`sos-${index}`}>
          <circle cx={getX(index)} cy={getY(value)} r="4" fill="#10b981" />
          <text x={getX(index)} y={getY(value) - 8} textAnchor="middle" fontSize="9" fontWeight="600" fill="#059669">{value}%</text>
        </g>
      ))}

      {/* SOV Line */}
      <path d={generatePath(sovData)} fill="none" stroke="#f97316" strokeWidth="2" />
      {sovData.map((value, index) => (
        <g key={`sov-${index}`}>
          <circle cx={getX(index)} cy={getY(value)} r="4" fill="#f97316" />
          <text x={getX(index)} y={getY(value) + 14} textAnchor="middle" fontSize="9" fontWeight="600" fill="#ea580c">{value}%</text>
        </g>
      ))}

      {/* X-axis */}
      {labels.map((label, index) => (
        <text key={index} x={getX(index)} y={height - 6} textAnchor="middle" fontSize="9" fill="#6b7280">{label}</text>
      ))}

      {/* Legend */}
      <g transform={`translate(${padding.left}, 4)`}>
        <rect width="8" height="8" fill="#10b981" rx="1" />
        <text x="10" y="7" fontSize="9" fill="#374151">{brandName} SOS</text>
        <rect x="70" width="8" height="8" fill="#f97316" rx="1" />
        <text x="80" y="7" fontSize="9" fill="#374151">SOV</text>
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
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h5 className="text-sm font-semibold text-gray-700">Keyword Impact (12 months)</h5>
        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
          <button
            onClick={() => setActiveTab('generic')}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              activeTab === 'generic' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Generic
          </button>
          <button
            onClick={() => setActiveTab('branded')}
            className={`px-3 py-1.5 text-sm rounded-md transition-all ${
              activeTab === 'branded' ? 'bg-white dark:bg-gray-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Branded
          </button>
        </div>
      </div>

      {hasData ? (
        <div className="grid grid-cols-2 gap-4">
          {/* Gainers */}
          <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-emerald-600 text-sm">↑</span>
              <span className="text-sm font-medium text-emerald-700">Top Gainers</span>
            </div>
            {currentData.gainers.length > 0 ? (
              <div className="space-y-2">
                {currentData.gainers.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-white dark:bg-gray-700 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-emerald-600 font-mono text-xs">#{item.position}</span>
                      <span className="truncate text-gray-700">{item.keyword}</span>
                    </div>
                    <span className="text-emerald-600 font-medium text-xs ml-2">+{item.impactChange}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-600">No gainers detected</p>
            )}
          </div>

          {/* Losers */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-100">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-red-600 text-sm">↓</span>
              <span className="text-sm font-medium text-red-700">Top Losers</span>
            </div>
            {currentData.losers.length > 0 ? (
              <div className="space-y-2">
                {currentData.losers.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-white dark:bg-gray-700 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-red-600 font-mono text-xs">#{item.position}</span>
                      <span className="truncate text-gray-700">{item.keyword}</span>
                    </div>
                    <span className="text-red-600 font-medium text-xs ml-2">{item.impactChange}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-red-600">No losers detected</p>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-3">No {activeTab} keyword data available</p>
      )}
    </div>
  );
};

export const TrendsPanel: React.FC<TrendsPanelProps> = ({ data, isLoading }) => {
  const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>([]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Historical Trends</h3>
        </div>
        <div className="p-4 flex items-center justify-center">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Historical Trends</h3>
            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">12 months</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Chart and Competitor Selection */}
        <div className="flex gap-5">
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
          <div className="w-52 space-y-3">
            {/* Changes */}
            <div className="space-y-3">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <div className="text-sm font-semibold text-emerald-700 mb-2">Share of Search</div>
                <ChangeValue value={data.changes.sos.vs6MonthsAgo} label="vs 6mo" />
                <ChangeValue value={data.changes.sos.vs12MonthsAgo} label="vs 12mo" />
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-100">
                <div className="text-sm font-semibold text-orange-700 mb-2">Share of Voice</div>
                <ChangeValue value={data.changes.sov.vs6MonthsAgo} label="vs 6mo" />
                <ChangeValue value={data.changes.sov.vs12MonthsAgo} label="vs 12mo" />
              </div>
            </div>

            {/* Competitor Toggle */}
            {data.competitorTrends && data.competitorTrends.length > 0 && (
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="text-sm font-semibold text-gray-600 dark:text-gray-300 dark:text-gray-400 mb-2">Compare with:</div>
                <div className="space-y-2">
                  {data.competitorTrends.map((comp, idx) => (
                    <label key={comp.name} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCompetitors.includes(comp.name)}
                        onChange={() => toggleCompetitor(comp.name)}
                        className="w-4 h-4 rounded border-gray-300"
                        style={{ accentColor: COMPETITOR_COLORS[idx] }}
                      />
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COMPETITOR_COLORS[idx] }}
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{comp.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Keyword Impact */}
        <KeywordImpactSection keywordImpact={data.keywordImpact} />

        {/* Trend Insights */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg border ${
            data.changes.sos.vs12MonthsAgo > 2 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
            data.changes.sos.vs12MonthsAgo < -2 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600 dark:text-gray-300'
          }`}>
            <div className="text-sm font-medium">
              {data.changes.sos.vs12MonthsAgo > 2 ? 'Brand awareness is growing' :
               data.changes.sos.vs12MonthsAgo < -2 ? 'Brand awareness is declining' : 'Brand awareness is stable'}
            </div>
            <div className="text-xs mt-1 opacity-80">
              {data.changes.sos.vs12MonthsAgo > 2 ? 'Your brand searches have increased over the past year.' :
               data.changes.sos.vs12MonthsAgo < -2 ? 'Consider investing in brand marketing.' : 'Consistent performance over time.'}
            </div>
          </div>
          <div className={`p-4 rounded-lg border ${
            data.changes.sov.vs12MonthsAgo > 2 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
            data.changes.sov.vs12MonthsAgo < -2 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600 dark:text-gray-300'
          }`}>
            <div className="text-sm font-medium">
              {data.changes.sov.vs12MonthsAgo > 2 ? 'SEO visibility is improving' :
               data.changes.sov.vs12MonthsAgo < -2 ? 'SEO visibility is declining' : 'SEO visibility is stable'}
            </div>
            <div className="text-xs mt-1 opacity-80">
              {data.changes.sov.vs12MonthsAgo > 2 ? 'Your organic rankings have improved.' :
               data.changes.sov.vs12MonthsAgo < -2 ? 'Review your SEO strategy for improvements.' : 'Organic presence remains consistent.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
