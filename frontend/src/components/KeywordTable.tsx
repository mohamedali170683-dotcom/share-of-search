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

type SortKey = 'keyword' | 'searchVolume' | 'position' | 'ctr' | 'visibleVolume' | 'isOwnBrand' | 'category';
type SortDirection = 'asc' | 'desc';

// Category patterns for keyword classification
const CATEGORY_PATTERNS: { category: string; patterns: RegExp[] }[] = [
  { category: 'Natural Cosmetics', patterns: [/natural|natur|bio|organic|öko|eco/i, /cosmetic|kosmetik|beauty|pflege/i] },
  { category: 'Skincare', patterns: [/skin|haut|face|gesicht|cream|creme|serum|moistur|feucht/i] },
  { category: 'Makeup', patterns: [/makeup|make-up|lipstick|mascara|foundation|eyeshadow|lippenstift|rouge|blush/i] },
  { category: 'Hair Care', patterns: [/hair|haar|shampoo|conditioner|spülung/i] },
  { category: 'Body Care', patterns: [/body|körper|lotion|shower|dusch|bath|bad|soap|seife/i] },
  { category: 'Vegan Products', patterns: [/vegan|tierversuchsfrei|cruelty.?free/i] },
  { category: 'Eco-Friendly', patterns: [/eco|öko|nachhaltig|sustainab|umwelt|green/i] },
  { category: 'Anti-Aging', patterns: [/anti.?age|anti.?aging|wrinkle|falten|mature|reif/i] },
  { category: 'Sun Care', patterns: [/sun|sonn|spf|uv|solar/i] },
  { category: 'Lip Care', patterns: [/lip|lippe/i] },
  { category: 'Eye Care', patterns: [/eye|auge/i] },
  { category: 'Deodorant', patterns: [/deo|deodorant/i] },
  { category: 'Certified Organic', patterns: [/certified|zertifiziert|natrue|ecocert|cosmos/i] },
];

// Detect category for a keyword
const detectCategory = (keyword: string): string => {
  const keywordLower = keyword.toLowerCase();

  for (const { category, patterns } of CATEGORY_PATTERNS) {
    // Check if any pattern matches
    const matches = patterns.filter(pattern => pattern.test(keywordLower));
    if (matches.length > 0) {
      return category;
    }
  }

  // Try to extract a meaningful category from the keyword itself
  const words = keywordLower.split(/\s+/);
  if (words.length >= 2) {
    // Use first two significant words as category
    const significantWords = words.filter(w => w.length > 3).slice(0, 2);
    if (significantWords.length > 0) {
      return significantWords.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  return 'Other';
};

// Extended keyword with category
interface CategorizedKeyword extends RankedKeyword {
  category: string;
}

const getPositionBadgeClass = (position: number): string => {
  if (position <= 3) return 'bg-emerald-100 text-emerald-800';
  if (position <= 10) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-600';
};

const getCategoryBadgeClass = (category: string): string => {
  // Generate consistent color based on category name
  const colors = [
    'bg-purple-100 text-purple-800',
    'bg-blue-100 text-blue-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800',
    'bg-teal-100 text-teal-800',
    'bg-cyan-100 text-cyan-800',
    'bg-rose-100 text-rose-800',
    'bg-violet-100 text-violet-800',
    'bg-fuchsia-100 text-fuchsia-800',
    'bg-sky-100 text-sky-800',
  ];

  // Simple hash of category name to pick a color
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const KeywordTable: React.FC<KeywordTableProps> = (props) => {
  const [sortKey, setSortKey] = useState<SortKey>('searchVolume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Categorize all keywords
  const categorizedKeywords = useMemo(() => {
    if (props.type !== 'sov') return [];

    return (props.keywords as RankedKeyword[]).map(kw => ({
      ...kw,
      category: detectCategory(kw.keyword)
    })) as CategorizedKeyword[];
  }, [props.keywords, props.type]);

  // Get unique categories with counts, sorted by keyword count
  const categoryStats = useMemo(() => {
    if (props.type !== 'sov') return [];

    const counts = new Map<string, { count: number; volume: number; visibleVolume: number }>();

    for (const kw of categorizedKeywords) {
      const existing = counts.get(kw.category) || { count: 0, volume: 0, visibleVolume: 0 };
      counts.set(kw.category, {
        count: existing.count + 1,
        volume: existing.volume + kw.searchVolume,
        visibleVolume: existing.visibleVolume + (kw.visibleVolume || 0)
      });
    }

    return Array.from(counts.entries())
      .map(([category, stats]) => ({
        category,
        ...stats,
        sov: stats.volume > 0 ? Math.round((stats.visibleVolume / stats.volume) * 100 * 10) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [categorizedKeywords, props.type]);

  // Filter keywords by selected category
  const filteredKeywords = useMemo(() => {
    if (props.type !== 'sov') return props.keywords;
    if (!selectedCategory) return categorizedKeywords;

    return categorizedKeywords.filter(kw => kw.category === selectedCategory);
  }, [categorizedKeywords, selectedCategory, props.keywords, props.type]);

  // Calculate filtered SOV stats
  const filteredSOVStats = useMemo(() => {
    if (props.type !== 'sov') return null;

    const keywords = filteredKeywords as CategorizedKeyword[];
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
      const aRanked = a as CategorizedKeyword;
      const bRanked = b as CategorizedKeyword;
      switch (sortKey) {
        case 'keyword': aVal = aRanked.keyword; bVal = bRanked.keyword; break;
        case 'searchVolume': aVal = aRanked.searchVolume; bVal = bRanked.searchVolume; break;
        case 'position': aVal = aRanked.position; bVal = bRanked.position; break;
        case 'ctr': aVal = aRanked.ctr || 0; bVal = bRanked.ctr || 0; break;
        case 'visibleVolume': aVal = aRanked.visibleVolume || 0; bVal = bRanked.visibleVolume || 0; break;
        case 'category': aVal = aRanked.category; bVal = bRanked.category; break;
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

        {/* Category Filter */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Filter by Category/Topic</span>
              {selectedCategory && (
                <button
                  onClick={() => setSelectedCategory('')}
                  className="ml-2 px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Show All
                </button>
              )}
            </div>

            {/* Category chips with stats */}
            <div className="flex flex-wrap gap-2">
              {categoryStats.map(({ category, count, sov }) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(selectedCategory === category ? '' : category)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all flex items-center gap-2 ${
                    selectedCategory === category
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-orange-400 hover:bg-orange-50'
                  }`}
                >
                  <span>{category}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    selectedCategory === category
                      ? 'bg-orange-600'
                      : 'bg-gray-100'
                  }`}>
                    {count}
                  </span>
                  <span className={`text-xs ${
                    selectedCategory === category ? 'text-orange-100' : 'text-gray-400'
                  }`}>
                    ({sov}%)
                  </span>
                </button>
              ))}
            </div>

            {/* Selected category stats */}
            {selectedCategory && filteredSOVStats && (
              <div className="flex items-center gap-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-orange-700 font-medium">{selectedCategory} SOV:</span>
                  <span className="text-xl font-bold text-orange-600">{filteredSOVStats.filteredSOV}%</span>
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
                  onClick={() => handleSort('category')}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  Category{getSortIndicator('category')}
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
              {(sortedKeywords as CategorizedKeyword[]).map((kw, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {kw.keyword}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedCategory(selectedCategory === kw.category ? '' : kw.category)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${getCategoryBadgeClass(kw.category)}`}
                    >
                      {kw.category}
                    </button>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                    {kw.url}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary row */}
        {filteredSOVStats && (
          <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-between text-sm">
            <span className="text-gray-600">
              Showing {filteredSOVStats.keywordCount} keywords
              {selectedCategory && ` in "${selectedCategory}"`}
            </span>
            <span className="font-medium text-gray-900">
              Total Visible Volume: {filteredSOVStats.totalVisibleVolume.toLocaleString()}
            </span>
          </div>
        )}
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
