import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  borderColor: 'emerald' | 'orange' | 'red' | 'blue';
  tooltip?: string;
  details?: Array<{ label: string; value: string | number }>;
  interpretation?: {
    type: 'growth_potential' | 'missing_opportunities' | 'balanced';
    message: string;
  };
  insight?: {
    summary: string;
    explanation: string;
  };
}

const borderColorMap = {
  emerald: 'border-emerald-500',
  orange: 'border-orange-500',
  red: 'border-red-500',
  blue: 'border-blue-500'
};

const textColorMap = {
  emerald: 'text-emerald-600',
  orange: 'text-orange-500',
  red: 'text-red-500',
  blue: 'text-blue-600'
};

const interpretationColors = {
  growth_potential: 'text-emerald-600 bg-emerald-50',
  missing_opportunities: 'text-amber-600 bg-amber-50',
  balanced: 'text-blue-600 bg-blue-50'
};

const interpretationIcons = {
  growth_potential: '📈',
  missing_opportunities: '⚠️',
  balanced: '✓'
};

const insightColorMap = {
  emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-700'
};

const insightExplainColorMap = {
  emerald: 'bg-emerald-100 text-emerald-600',
  orange: 'bg-orange-100 text-orange-600',
  red: 'bg-red-100 text-red-600',
  blue: 'bg-blue-100 text-blue-600'
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  borderColor,
  tooltip,
  details,
  interpretation,
  insight
}) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  return (
    <div className={`bg-white rounded-xl shadow-sm border-t-4 p-6 ${borderColorMap[borderColor]}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</h3>
        {tooltip && (
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ℹ️
            </button>
            {showTooltip && (
              <div className="absolute right-0 top-6 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg z-10">
                {tooltip}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`text-5xl font-bold mb-2 ${textColorMap[borderColor]}`}>
        {value}
      </div>

      {subtitle && (
        <p className="text-sm text-gray-500 mb-4">{subtitle}</p>
      )}

      {interpretation && (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${interpretationColors[interpretation.type]}`}>
          <span>{interpretationIcons[interpretation.type]}</span>
          <span>{interpretation.message}</span>
        </div>
      )}

      {insight && (
        <div className={`mt-4 p-3 rounded-lg border ${insightColorMap[borderColor]}`}>
          <p className="text-sm mb-2">{insight.summary}</p>
          <div className={`text-xs p-2 rounded ${insightExplainColorMap[borderColor]}`}>
            {insight.explanation}
          </div>
        </div>
      )}

      {details && details.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          {details.map((detail, index) => (
            <div key={index} className="flex justify-between text-sm py-1">
              <span className="text-gray-500">{detail.label}</span>
              <span className="font-medium text-gray-700">{detail.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
