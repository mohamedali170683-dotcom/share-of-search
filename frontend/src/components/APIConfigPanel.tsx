import React, { useState } from 'react';
import { LOCATIONS } from '../types';

interface APIConfigPanelProps {
  onFetchData: (config: {
    login: string;
    password: string;
    domain: string;
    locationCode: number;
    languageCode: string;
    customCompetitors?: string[];
  }) => void;
  isLoading: boolean;
}

// Pre-configured DataForSEO credentials
const DATAFORSEO_LOGIN = 'mohamed.alimohamed@wppmedia.com';
const DATAFORSEO_PASSWORD = '0d925a94bf0c0b56';

export const APIConfigPanel: React.FC<APIConfigPanelProps> = ({ onFetchData, isLoading }) => {
  const [isOpen, setIsOpen] = useState(true); // Open by default
  const [domain, setDomain] = useState('');
  const [location, setLocation] = useState('germany');
  const [customCompetitors, setCustomCompetitors] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const locationData = LOCATIONS[location];

    // Parse custom competitors from comma-separated string
    const competitors = customCompetitors
      .split(',')
      .map(c => c.trim().toLowerCase())
      .filter(c => c.length > 0);

    onFetchData({
      login: DATAFORSEO_LOGIN,
      password: DATAFORSEO_PASSWORD,
      domain,
      locationCode: locationData.code,
      languageCode: location === 'germany' ? 'de' : location === 'france' ? 'fr' : location === 'spain' ? 'es' : 'en',
      customCompetitors: competitors.length > 0 ? competitors : undefined
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-gray-900">Analyze Your Brand</span>
        </div>
        <span className="text-sm text-emerald-600 font-medium">
          Enter your domain to get started
        </span>
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Your Domain
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {Object.entries(LOCATIONS).map(([key, { name }]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              Advanced Options (Custom Competitors)
            </button>
          </div>

          {/* Custom Competitors Input */}
          {showAdvanced && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Competitors for Share of Search
              </label>
              <input
                type="text"
                value={customCompetitors}
                onChange={(e) => setCustomCompetitors(e.target.value)}
                placeholder="e.g., michelin, goodyear, bridgestone, pirelli"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                Enter competitor brand names separated by commas. Leave empty to use auto-detected industry competitors.
                The system will fetch search volumes for each competitor to calculate Share of Search.
              </p>
            </div>
          )}

          <div className="mt-4">
            <button
              type="submit"
              disabled={isLoading || !domain}
              className="w-full md:w-auto px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </>
              ) : (
                'Analyze Domain'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
