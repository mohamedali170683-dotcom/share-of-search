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

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  borderColor,
  tooltip,
  details,
  interpretation
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
