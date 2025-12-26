import React, { useState, useMemo } from 'react';
import type { BrandKeyword, RankedKeyword } from '../types';

interface SOVTableProps {
  type: 'sov';
  keywords: RankedKeyword[];
}

interface SOSTableProps {
  type: 'sos';
  keywords: BrandKeyword[];
}

type KeywordTableProps = SOVTableProps | SOSTableProps;

type SortKey = 'keyword' | 'searchVolume' | 'position' | 'ctr' | 'visibleVolume' | 'isOwnBrand';
type SortDirection = 'asc' | 'desc';

// Common topics/verticals for quick selection
const SUGGESTED_TOPICS = [
  'running shoes',
  'natural cosmetics',
  'organic food',
  'fitness equipment',
  'sustainable fashion',
  'smart home',
  'electric vehicles',
  'vegan products'
];

const getPositionBadgeClass = (position: number): string => {
  if (position <= 3) return 'bg-emerald-100 text-emerald-800';
  if (position <= 10) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-600';
};

export const KeywordTable: React.FC<KeywordTableProps> = (props) => {
  const [sortKey, setSortKey] = useState<SortKey>('searchVolume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [topicFilter, setTopicFilter] = useState<string>('');

  // Filter keywords by topic for SOV
  const filteredKeywords = useMemo(() => {
    if (props.type !== 'sov' || !topicFilter.trim()) {
      return props.keywords;
    }

    const filterWords = topicFilter.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    if (filterWords.length === 0) return props.keywords;

    return (props.keywords as RankedKeyword[]).filter(kw => {
      const keywordLower = kw.keyword.toLowerCase();
      // Match if keyword contains any of the filter words
      return filterWords.some(word => keywordLower.includes(word));
    });
  }, [props.keywords, props.type, topicFilter]);

  // Calculate filtered SOV stats
  const filteredSOVStats = useMemo(() => {
    if (props.type !== 'sov') return null;

    const keywords = filteredKeywords as RankedKeyword[];
    const totalVisibleVolume = keywords.reduce((sum, kw) => sum + (kw.visibleVolume || 0), 0);
    const totalMarketVolume = keywords.reduce((sum, kw) => sum + kw.searchVolume, 0);
    const filteredSOV = totalMarketVolume > 0
      ? Math.round((totalVisibleVolume / totalMarketVolume) * 100 * 10) / 10
      : 0;

    return {
      filteredSOV,
      totalVisibleVolume,
      totalMarketVolume,
      keywordCount: keywords.length
    };
  }, [filteredKeywords, props.type]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  const sortedKeywords = [...filteredKeywords].sort((a, b) => {
    let aVal: string | number | boolean;
    let bVal: string | number | boolean;

    if (props.type === 'sov') {
      const aRanked = a as RankedKeyword;
      const bRanked = b as RankedKeyword;
      switch (sortKey) {
        case 'keyword': aVal = aRanked.keyword; bVal = bRanked.keyword; break;
        case 'searchVolume': aVal = aRanked.searchVolume; bVal = bRanked.searchVolume; break;
        case 'position': aVal = aRanked.position; bVal = bRanked.position; break;
        case 'ctr': aVal = aRanked.ctr || 0; bVal = bRanked.ctr || 0; break;
        case 'visibleVolume': aVal = aRanked.visibleVolume || 0; bVal = bRanked.visibleVolume || 0; break;
        default: aVal = aRanked.searchVolume; bVal = bRanked.searchVolume;
      }
    } else {
      const aBrand = a as BrandKeyword;
      const bBrand = b as BrandKeyword;
      switch (sortKey) {
        case 'keyword': aVal = aBrand.keyword; bVal = bBrand.keyword; break;
        case 'searchVolume': aVal = aBrand.searchVolume; bVal = bBrand.searchVolume; break;
        case 'isOwnBrand': aVal = aBrand.isOwnBrand ? 1 : 0; bVal = bBrand.isOwnBrand ? 1 : 0; break;
        default: aVal = aBrand.searchVolume; bVal = bBrand.searchVolume;
      }
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal);
    }
    return sortDirection === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  if (props.type === 'sov') {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Share of Voice - Keyword Breakdown</h3>
          <p className="text-sm text-gray-500 mt-1">Rankings weighted by CTR to calculate visible search volume</p>
        </div>

        {/* Topic/Vertical Filter */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Filter by Topic/Vertical</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                placeholder="e.g., running shoes, natural cosmetics..."
                className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              {topicFilter && (
                <button
                  onClick={() => setTopicFilter('')}
                  className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick topic suggestions */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Suggestions:</span>
              {SUGGESTED_TOPICS.slice(0, 5).map((topic) => (
                <button
                  key={topic}
                  onClick={() => setTopicFilter(topic)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${
                    topicFilter === topic
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>

            {/* Filtered stats */}
            {topicFilter && filteredSOVStats && (
              <div className="flex items-center gap-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-orange-700">Filtered SOV:</span>
                  <span className="text-lg font-bold text-orange-600">{filteredSOVStats.filteredSOV}%</span>
                </div>
                <div className="text-sm text-orange-600">
                  {filteredSOVStats.keywordCount} keywords |
                  Visible: {filteredSOVStats.totalVisibleVolume.toLocaleString()} |
                  Market: {filteredSOVStats.totalMarketVolume.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th
                  onClick={() => handleSort('keyword')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Keyword{getSortIndicator('keyword')}
                </th>
                <th
                  onClick={() => handleSort('searchVolume')}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Volume{getSortIndicator('searchVolume')}
                </th>
                <th
                  onClick={() => handleSort('position')}
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Position{getSortIndicator('position')}
                </th>
                <th
                  onClick={() => handleSort('ctr')}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  CTR %{getSortIndicator('ctr')}
                </th>
                <th
                  onClick={() => handleSort('visibleVolume')}
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Visible Vol.{getSortIndicator('visibleVolume')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(sortedKeywords as RankedKeyword[]).map((kw, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {kw.keyword}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                    {kw.searchVolume.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPositionBadgeClass(kw.position)}`}>
                      #{kw.position}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                    {kw.ctr?.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-emerald-600 text-right">
                    {kw.visibleVolume?.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {kw.url}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // SOS Table
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Share of Search - Brand Keywords</h3>
        <p className="text-sm text-gray-500 mt-1">Brand search volumes compared to competitors</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                onClick={() => handleSort('keyword')}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Keyword{getSortIndicator('keyword')}
              </th>
              <th
                onClick={() => handleSort('searchVolume')}
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Search Volume{getSortIndicator('searchVolume')}
              </th>
              <th
                onClick={() => handleSort('isOwnBrand')}
                className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                Type{getSortIndicator('isOwnBrand')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(sortedKeywords as BrandKeyword[]).map((kw, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {kw.keyword}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                  {kw.searchVolume.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {kw.isOwnBrand ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      Own Brand
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                      Competitor
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
