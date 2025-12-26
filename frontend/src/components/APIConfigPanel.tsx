import React, { useState } from 'react';
import { LOCATIONS } from '../types';

interface APIConfigPanelProps {
  onFetchData: (config: {
    login: string;
    password: string;
    domain: string;
    locationCode: number;
    languageCode: string;
  }) => void;
  isLoading: boolean;
}

export const APIConfigPanel: React.FC<APIConfigPanelProps> = ({ onFetchData, isLoading }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [login, setLogin] = useState(import.meta.env.VITE_DATAFORSEO_LOGIN || '');
  const [password, setPassword] = useState(import.meta.env.VITE_DATAFORSEO_PASSWORD || '');
  const [domain, setDomain] = useState('');
  const [location, setLocation] = useState('germany');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const locationData = LOCATIONS[location];
    onFetchData({
      login,
      password,
      domain,
      locationCode: locationData.code,
      languageCode: location === 'germany' ? 'de' : location === 'france' ? 'fr' : location === 'spain' ? 'es' : 'en'
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
          <span className="font-medium text-gray-900">DataForSEO API Configuration</span>
        </div>
        <span className="text-sm text-gray-500">
          {login ? 'Configured' : 'Not configured'}
        </span>
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-2 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DataForSEO Login
              </label>
              <input
                type="text"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="your-email@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                DataForSEO Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your API password"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target Domain
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

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={isLoading || !login || !password || !domain}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fetching...
                </>
              ) : (
                'Fetch Data'
              )}
            </button>
            <p className="text-sm text-gray-500 self-center">
              Get a free account at <a href="https://dataforseo.com" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">dataforseo.com</a>
            </p>
          </div>
        </form>
      )}
    </div>
  );
};
