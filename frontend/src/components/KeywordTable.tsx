import React, { useState } from 'react';
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

const getPositionBadgeClass = (position: number): string => {
  if (position <= 3) return 'bg-emerald-100 text-emerald-800';
  if (position <= 10) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-600';
};

export const KeywordTable: React.FC<KeywordTableProps> = (props) => {
  const [sortKey, setSortKey] = useState<SortKey>('searchVolume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  const sortedKeywords = [...props.keywords].sort((a, b) => {
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
