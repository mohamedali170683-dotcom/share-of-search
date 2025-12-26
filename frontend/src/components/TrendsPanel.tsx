import React from 'react';

interface TrendPoint {
  period: string;
  monthsAgo: number;
  sos?: number;
  sov?: number;
  brandVolume?: number;
  totalVolume?: number;
  visibleVolume?: number;
  totalMarketVolume?: number;
}

interface KeywordImpactItem {
  keyword: string;
  position: number;
  volumeChange: number;
  impactChange: number;
}

interface TrendsData {
  brandName: string;
  sosTrends: TrendPoint[];
  sovTrends: TrendPoint[];
  changes: {
    sos: {
      vs6MonthsAgo: number;
      vs12MonthsAgo: number;
    };
    sov: {
      vs6MonthsAgo: number;
      vs12MonthsAgo: number;
    };
  };
  keywordImpact?: {
    gainers: KeywordImpactItem[];
    losers: KeywordImpactItem[];
  };
}

interface TrendsPanelProps {
  data: TrendsData | null;
  isLoading: boolean;
}

const TrendArrow: React.FC<{ value: number; size?: 'sm' | 'lg' }> = ({ value, size = 'sm' }) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  if (isNeutral) {
    return <span className={`${sizeClass} text-gray-400`}>-</span>;
  }

  return (
    <svg
      className={`${sizeClass} ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={isPositive ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3'}
      />
    </svg>
  );
};

const ChangeValue: React.FC<{ value: number; label: string }> = ({ value, label }) => {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <div className="flex items-center gap-2">
      <TrendArrow value={value} />
      <span className={`text-sm font-medium ${
        isNeutral ? 'text-gray-500' : isPositive ? 'text-emerald-600' : 'text-red-600'
      }`}>
        {isPositive ? '+' : ''}{value}pp
      </span>
      <span className="text-xs text-gray-400">{label}</span>
    </div>
  );
};

// SVG Line Chart Component
const LineChart: React.FC<{
  sosData: number[];
  sovData: number[];
  labels: string[];
}> = ({ sosData, sovData, labels }) => {
  const width = 400;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate scales
  const allValues = [...sosData, ...sovData];
  const maxValue = Math.max(...allValues, 1);
  const minValue = Math.min(...allValues, 0);
  const valueRange = maxValue - minValue || 1;

  const getX = (index: number) =>
    padding.left + (index / (labels.length - 1)) * chartWidth;

  const getY = (value: number) =>
    padding.top + chartHeight - ((value - minValue) / valueRange) * chartHeight;

  // Generate path data
  const generatePath = (data: number[]) => {
    return data.map((value, index) => {
      const x = getX(index);
      const y = getY(value);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');
  };

  const sosPath = generatePath(sosData);
  const sovPath = generatePath(sovData);

  // Grid lines
  const gridLines = [];
  const numGridLines = 5;
  for (let i = 0; i <= numGridLines; i++) {
    const y = padding.top + (i / numGridLines) * chartHeight;
    const value = maxValue - (i / numGridLines) * valueRange;
    gridLines.push({ y, value: Math.round(value) });
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      {gridLines.map((line, idx) => (
        <g key={idx}>
          <line
            x1={padding.left}
            y1={line.y}
            x2={width - padding.right}
            y2={line.y}
            stroke="#e5e7eb"
            strokeDasharray="4 4"
          />
          <text
            x={padding.left - 8}
            y={line.y + 4}
            textAnchor="end"
            fontSize="10"
            fill="#6b7280"
          >
            {line.value}%
          </text>
        </g>
      ))}

      {/* SOS Line */}
      <path
        d={sosPath}
        fill="none"
        stroke="#10b981"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* SOV Line */}
      <path
        d={sovPath}
        fill="none"
        stroke="#f97316"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* SOS Points */}
      {sosData.map((value, index) => (
        <g key={`sos-${index}`}>
          <circle
            cx={getX(index)}
            cy={getY(value)}
            r="6"
            fill="#10b981"
          />
          <text
            x={getX(index)}
            y={getY(value) - 12}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#059669"
          >
            {value}%
          </text>
        </g>
      ))}

      {/* SOV Points */}
      {sovData.map((value, index) => (
        <g key={`sov-${index}`}>
          <circle
            cx={getX(index)}
            cy={getY(value)}
            r="6"
            fill="#f97316"
          />
          <text
            x={getX(index)}
            y={getY(value) + 20}
            textAnchor="middle"
            fontSize="11"
            fontWeight="600"
            fill="#ea580c"
          >
            {value}%
          </text>
        </g>
      ))}

      {/* X-axis labels */}
      {labels.map((label, index) => (
        <text
          key={index}
          x={getX(index)}
          y={height - 10}
          textAnchor="middle"
          fontSize="11"
          fill="#6b7280"
        >
          {label}
        </text>
      ))}

      {/* Legend */}
      <g transform={`translate(${width - 120}, 10)`}>
        <rect x="0" y="0" width="10" height="10" fill="#10b981" rx="2" />
        <text x="14" y="9" fontSize="10" fill="#374151">SOS</text>
        <rect x="50" y="0" width="10" height="10" fill="#f97316" rx="2" />
        <text x="64" y="9" fontSize="10" fill="#374151">SOV</text>
      </g>
    </svg>
  );
};

// Keyword Impact Table
const KeywordImpactTable: React.FC<{
  gainers: KeywordImpactItem[];
  losers: KeywordImpactItem[];
}> = ({ gainers, losers }) => {
  if (gainers.length === 0 && losers.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Gainers */}
      <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-4">
        <h5 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          Top Visibility Gainers
        </h5>
        {gainers.length > 0 ? (
          <div className="space-y-2">
            {gainers.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-emerald-600 font-mono text-xs">#{item.position}</span>
                  <span className="truncate text-gray-700">{item.keyword}</span>
                </div>
                <span className="text-emerald-600 font-medium ml-2">
                  +{item.impactChange.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-emerald-600">No significant gainers detected</p>
        )}
      </div>

      {/* Losers */}
      <div className="bg-red-50 rounded-lg border border-red-200 p-4">
        <h5 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
          </svg>
          Top Visibility Losers
        </h5>
        {losers.length > 0 ? (
          <div className="space-y-2">
            {losers.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm bg-white rounded px-3 py-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-red-600 font-mono text-xs">#{item.position}</span>
                  <span className="truncate text-gray-700">{item.keyword}</span>
                </div>
                <span className="text-red-600 font-medium ml-2">
                  {item.impactChange.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-red-600">No significant losers detected</p>
        )}
      </div>
    </div>
  );
};

export const TrendsPanel: React.FC<TrendsPanelProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Historical Trends</h3>
        </div>
        <div className="p-6 flex items-center justify-center">
          <div className="flex items-center gap-3 text-gray-500">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Loading historical data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  // Reverse the data so it goes from oldest to newest (left to right)
  const sosValues = [...data.sosTrends].reverse().map(t => t.sos || 0);
  const sovValues = [...data.sovTrends].reverse().map(t => t.sov || 0);
  const periodLabels = [...data.sosTrends].reverse().map(t => t.period);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Historical Trends</h3>
          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
            12-Month View
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-1">Compare your Share of Search and Share of Voice over time</p>
      </div>

      <div className="p-6">
        {/* Line Chart */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <LineChart sosData={sosValues} sovData={sovValues} labels={periodLabels} />
          </div>
        </div>

        {/* Change Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h4 className="font-semibold text-emerald-800 mb-2">Share of Search</h4>
            <div className="space-y-1">
              <ChangeValue value={data.changes.sos.vs6MonthsAgo} label="vs 6 months ago" />
              <ChangeValue value={data.changes.sos.vs12MonthsAgo} label="vs 12 months ago" />
            </div>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <h4 className="font-semibold text-orange-800 mb-2">Share of Voice</h4>
            <div className="space-y-1">
              <ChangeValue value={data.changes.sov.vs6MonthsAgo} label="vs 6 months ago" />
              <ChangeValue value={data.changes.sov.vs12MonthsAgo} label="vs 12 months ago" />
            </div>
          </div>
        </div>

        {/* Keyword Impact Analysis */}
        {data.keywordImpact && (
          <KeywordImpactTable
            gainers={data.keywordImpact.gainers}
            losers={data.keywordImpact.losers}
          />
        )}

        {/* Trend Insights - Now at the bottom */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h5 className="font-medium text-gray-800 mb-3">Trend Insights</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className={`p-3 rounded ${
              data.changes.sos.vs12MonthsAgo > 2 ? 'bg-emerald-100 text-emerald-700' :
              data.changes.sos.vs12MonthsAgo < -2 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {data.changes.sos.vs12MonthsAgo > 2 ? (
                <><strong>Brand growth!</strong> Your brand awareness has increased significantly over the past year.</>
              ) : data.changes.sos.vs12MonthsAgo < -2 ? (
                <><strong>Brand declining.</strong> Consider investing in brand marketing to reverse this trend.</>
              ) : (
                <><strong>Stable brand.</strong> Your brand awareness has remained consistent over time.</>
              )}
            </div>
            <div className={`p-3 rounded ${
              data.changes.sov.vs12MonthsAgo > 2 ? 'bg-emerald-100 text-emerald-700' :
              data.changes.sov.vs12MonthsAgo < -2 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {data.changes.sov.vs12MonthsAgo > 2 ? (
                <><strong>SEO momentum!</strong> Your organic visibility has improved significantly.</>
              ) : data.changes.sov.vs12MonthsAgo < -2 ? (
                <><strong>Visibility declining.</strong> Review your SEO strategy and check for ranking losses.</>
              ) : (
                <><strong>Stable visibility.</strong> Your organic presence has remained consistent.</>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
