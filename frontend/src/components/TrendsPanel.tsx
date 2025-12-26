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
    return <span className={`${sizeClass} text-gray-400`}>→</span>;
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

const TrendBar: React.FC<{ values: number[]; labels: string[]; color: 'emerald' | 'orange' }> = ({
  values,
  labels,
  color
}) => {
  const maxValue = Math.max(...values, 1);

  return (
    <div className="flex items-end gap-4 h-24">
      {values.map((value, idx) => (
        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs font-medium text-gray-700">{value}%</span>
          <div
            className={`w-full rounded-t transition-all ${
              color === 'emerald' ? 'bg-emerald-500' : 'bg-orange-500'
            } ${idx === 0 ? 'opacity-100' : idx === 1 ? 'opacity-70' : 'opacity-40'}`}
            style={{ height: `${(value / maxValue) * 100}%`, minHeight: '4px' }}
          />
          <span className="text-xs text-gray-500 text-center">{labels[idx]}</span>
        </div>
      ))}
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

  const sosValues = data.sosTrends.map(t => t.sos || 0);
  const sovValues = data.sovTrends.map(t => t.sov || 0);
  const periodLabels = data.sosTrends.map(t => t.period);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* SOS Trends */}
          <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-emerald-800">Share of Search Trend</h4>
              <div className="flex flex-col items-end gap-1">
                <ChangeValue value={data.changes.sos.vs6MonthsAgo} label="vs 6mo" />
                <ChangeValue value={data.changes.sos.vs12MonthsAgo} label="vs 12mo" />
              </div>
            </div>

            <TrendBar values={sosValues} labels={periodLabels} color="emerald" />

            <div className="mt-4 p-3 bg-emerald-100 rounded text-xs text-emerald-700">
              {data.changes.sos.vs12MonthsAgo > 2 ? (
                <><strong>Strong growth!</strong> Your brand awareness has increased significantly over the past year.</>
              ) : data.changes.sos.vs12MonthsAgo < -2 ? (
                <><strong>Declining trend.</strong> Consider investing in brand marketing to reverse this trend.</>
              ) : (
                <><strong>Stable performance.</strong> Your brand awareness has remained consistent over time.</>
              )}
            </div>
          </div>

          {/* SOV Trends */}
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-orange-800">Share of Voice Trend</h4>
              <div className="flex flex-col items-end gap-1">
                <ChangeValue value={data.changes.sov.vs6MonthsAgo} label="vs 6mo" />
                <ChangeValue value={data.changes.sov.vs12MonthsAgo} label="vs 12mo" />
              </div>
            </div>

            <TrendBar values={sovValues} labels={periodLabels} color="orange" />

            <div className="mt-4 p-3 bg-orange-100 rounded text-xs text-orange-700">
              {data.changes.sov.vs12MonthsAgo > 2 ? (
                <><strong>SEO momentum!</strong> Your organic visibility has improved significantly.</>
              ) : data.changes.sov.vs12MonthsAgo < -2 ? (
                <><strong>Visibility declining.</strong> Review your SEO strategy and check for ranking losses.</>
              ) : (
                <><strong>Consistent visibility.</strong> Your organic presence has remained stable.</>
              )}
            </div>
          </div>
        </div>

        {/* Trend Summary */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h5 className="font-medium text-gray-800 mb-2">Trend Summary</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                data.changes.sos.vs12MonthsAgo > 0 ? 'bg-emerald-500' :
                data.changes.sos.vs12MonthsAgo < 0 ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <span className="text-gray-600">
                SOS is <strong>{
                  data.changes.sos.vs12MonthsAgo > 0 ? 'growing' :
                  data.changes.sos.vs12MonthsAgo < 0 ? 'declining' : 'stable'
                }</strong> year-over-year
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                data.changes.sov.vs12MonthsAgo > 0 ? 'bg-emerald-500' :
                data.changes.sov.vs12MonthsAgo < 0 ? 'bg-red-500' : 'bg-gray-400'
              }`} />
              <span className="text-gray-600">
                SOV is <strong>{
                  data.changes.sov.vs12MonthsAgo > 0 ? 'growing' :
                  data.changes.sov.vs12MonthsAgo < 0 ? 'declining' : 'stable'
                }</strong> year-over-year
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TrendArrow value={data.changes.sov.vs12MonthsAgo - data.changes.sos.vs12MonthsAgo} size="lg" />
              <span className="text-gray-600">
                {data.changes.sov.vs12MonthsAgo > data.changes.sos.vs12MonthsAgo
                  ? 'SEO outpacing brand growth'
                  : data.changes.sov.vs12MonthsAgo < data.changes.sos.vs12MonthsAgo
                  ? 'Brand growth outpacing SEO'
                  : 'Balanced growth trajectory'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
