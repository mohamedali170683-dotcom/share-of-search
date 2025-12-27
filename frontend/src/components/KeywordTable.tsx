import React, { useState, useMemo, useEffect } from 'react';
import type { BrandKeyword, RankedKeyword } from '../types';

interface SOVTableProps {
  type: 'sov';
  keywords: RankedKeyword[];
  onFilteredSOVChange?: (filteredSOV: number, totalVisibleVolume: number, totalMarketVolume: number) => void;
}

interface SOSTableProps {
  type: 'sos';
  keywords: BrandKeyword[];
  onSelectedCompetitorsChange?: (selectedBrands: string[], sos: number, brandVolume: number, totalVolume: number) => void;
}

type KeywordTableProps = SOVTableProps | SOSTableProps;

type SortKey = 'keyword' | 'searchVolume' | 'position' | 'ctr' | 'visibleVolume' | 'isOwnBrand' | 'category';
type SortDirection = 'asc' | 'desc';

// Category patterns for keyword classification
const CATEGORY_PATTERNS: { category: string; patterns: RegExp[] }[] = [
  // Automotive / Tires (check first to avoid false positives)
  { category: 'Tires', patterns: [/\breifen\b|tire|tyre|pneu|räder\b|wheels?\b/i] },
  { category: 'Winter Tires', patterns: [/winterreifen|winter.?tire|winter.?tyre|schneereifen/i] },
  { category: 'Summer Tires', patterns: [/sommerreifen|summer.?tire|summer.?tyre/i] },
  { category: 'All-Season Tires', patterns: [/allwetter|ganzjahres|all.?season|allseason/i] },
  { category: 'Car Parts', patterns: [/auto.?teil|car.?part|ersatzteil|brake|bremse|felge|rim\b/i] },
  { category: 'Automotive', patterns: [/auto|car\b|vehicle|fahrzeug|kfz|pkw|suv\b|truck|lkw/i] },

  // Cosmetics / Beauty
  { category: 'Natural Cosmetics', patterns: [/natural.?cosmetic|natur.?kosmetik|bio.?cosmetic|organic.?beauty/i] },
  { category: 'Skincare', patterns: [/skincare|skin.?care|hautpflege|face.?cream|gesichtscreme|serum|moistur/i] },
  { category: 'Makeup', patterns: [/makeup|make-up|lipstick|mascara|foundation|eyeshadow|lippenstift|rouge|blush/i] },
  { category: 'Hair Care', patterns: [/hair.?care|haarpflege|shampoo|conditioner|spülung/i] },
  { category: 'Body Care', patterns: [/body.?care|körperpflege|body.?lotion|duschgel|shower/i] },
  { category: 'Anti-Aging', patterns: [/anti.?age|anti.?aging|anti.?falten|wrinkle/i] },
  { category: 'Sun Care', patterns: [/sun.?care|sonnenschutz|sunscreen|spf\s?\d|uv.?schutz/i] },

  // Sportswear / Fashion
  { category: 'Running', patterns: [/running|laufschuh|jogging|marathon/i] },
  { category: 'Training', patterns: [/training|workout|fitness|gym\b/i] },
  { category: 'Football', patterns: [/football|fußball|soccer|fussball/i] },
  { category: 'Sneakers', patterns: [/sneaker|sportschuh|trainer\b/i] },
  { category: 'Apparel', patterns: [/\bshirt\b|hoodie|jacket|jacke|pants|hose|shorts/i] },

  // Technology
  { category: 'Electronics', patterns: [/electronic|elektronik|gadget|device/i] },
  { category: 'Software', patterns: [/software|app\b|application|programm/i] },

  // General
  { category: 'Eco-Friendly', patterns: [/eco.?friendly|öko|nachhaltig|sustainab|umweltfreundlich/i] },
  { category: 'Vegan', patterns: [/\bvegan\b|tierversuchsfrei|cruelty.?free/i] },
];

// Detect category for a keyword (fallback when API doesn't provide one)
// This is only used when DataForSEO doesn't return category IDs
const detectCategoryFallback = (keyword: string): string => {
  const keywordLower = keyword.toLowerCase();

  // Try each pattern - first match wins
  for (const { category, patterns } of CATEGORY_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(keywordLower)) {
        return category;
      }
    }
  }

  // Don't create arbitrary categories - just mark as uncategorized
  return 'Uncategorized';
};

// Get category - prefer API-provided, fall back to detection
const getCategory = (kw: RankedKeyword): string => {
  // Use API-provided category if available
  if (kw.category) {
    return kw.category;
  }
  // Fall back to regex-based detection
  return detectCategoryFallback(kw.keyword);
};

interface CategorizedKeyword extends RankedKeyword {
  category: string;
  topic: string; // URL-based topic (similar to Ahrefs Parent Topic)
}

// This will be populated after we process all keywords
// Maps URL -> highest volume keyword for that URL (Parent Topic)
const getParentTopics = (keywords: RankedKeyword[]): Map<string, string> => {
  const urlToKeywords = new Map<string, { keyword: string; volume: number }[]>();

  // Group keywords by URL
  for (const kw of keywords) {
    const url = kw.url || 'unknown';
    const existing = urlToKeywords.get(url) || [];
    existing.push({ keyword: kw.keyword, volume: kw.searchVolume });
    urlToKeywords.set(url, existing);
  }

  // For each URL, find the keyword with highest volume = Parent Topic
  const urlToParentTopic = new Map<string, string>();
  for (const [url, kwList] of urlToKeywords) {
    // Sort by volume descending and take the first one
    kwList.sort((a, b) => b.volume - a.volume);
    const parentTopic = kwList[0]?.keyword || 'Unknown';
    // Capitalize first letter of each word for display
    const formattedTopic = parentTopic
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    urlToParentTopic.set(url, formattedTopic);
  }

  return urlToParentTopic;
};

const getPositionBadgeClass = (position: number): string => {
  if (position <= 3) return 'bg-emerald-100 text-emerald-800';
  if (position <= 10) return 'bg-yellow-100 text-yellow-800';
  return 'bg-gray-100 text-gray-600';
};

const getCategoryBadgeClass = (category: string): string => {
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

  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

type GroupingMode = 'category' | 'topic';

export const KeywordTable: React.FC<KeywordTableProps> = (props) => {
  const [sortKey, setSortKey] = useState<SortKey>('searchVolume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('topic'); // Default to topic (URL-based, like Ahrefs)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [selectedCompetitors, setSelectedCompetitors] = useState<Set<string>>(new Set());
  const [competitorsInitialized, setCompetitorsInitialized] = useState(false);

  // Categorize all keywords and extract Parent Topics (like Ahrefs)
  // Parent Topic = highest volume keyword ranking for the same URL
  const categorizedKeywords = useMemo(() => {
    if (props.type !== 'sov') return [];

    const keywords = props.keywords as RankedKeyword[];
    // First, compute parent topics for all URLs
    const parentTopics = getParentTopics(keywords);

    return keywords.map(kw => ({
      ...kw,
      category: getCategory(kw),
      // Parent Topic: the highest-volume keyword for this URL (like Ahrefs)
      topic: parentTopics.get(kw.url || 'unknown') || 'Unknown'
    })) as CategorizedKeyword[];
  }, [props.keywords, props.type]);

  // Get unique competitor brands for SOS
  const competitorBrands = useMemo(() => {
    if (props.type !== 'sos') return [];
    const brands = (props.keywords as BrandKeyword[])
      .filter(kw => !kw.isOwnBrand)
      .map(kw => kw.keyword);
    return [...new Set(brands)];
  }, [props.keywords, props.type]);

  // Reset initialization when keywords change (new data fetched)
  useEffect(() => {
    if (props.type === 'sos') {
      setCompetitorsInitialized(false);
    }
  }, [props.keywords, props.type]);

  // Initialize selected competitors (all selected by default)
  useEffect(() => {
    if (props.type === 'sos' && competitorBrands.length > 0 && !competitorsInitialized) {
      setSelectedCompetitors(new Set(competitorBrands));
      setCompetitorsInitialized(true);
    }
  }, [competitorBrands, competitorsInitialized, props.type]);

  // Calculate SOS based on selected competitors
  const sosCalculation = useMemo(() => {
    if (props.type !== 'sos') return null;

    const keywords = props.keywords as BrandKeyword[];
    const ownBrandVolume = keywords
      .filter(kw => kw.isOwnBrand)
      .reduce((sum, kw) => sum + kw.searchVolume, 0);

    const competitorVolume = keywords
      .filter(kw => !kw.isOwnBrand && selectedCompetitors.has(kw.keyword))
      .reduce((sum, kw) => sum + kw.searchVolume, 0);

    const totalVolume = ownBrandVolume + competitorVolume;
    const sos = totalVolume > 0 ? Math.round((ownBrandVolume / totalVolume) * 100 * 10) / 10 : 0;

    return { sos, ownBrandVolume, competitorVolume, totalVolume };
  }, [props.keywords, props.type, selectedCompetitors]);

  // Notify parent of SOS changes
  useEffect(() => {
    if (props.type === 'sos' && sosCalculation && props.onSelectedCompetitorsChange && competitorsInitialized) {
      props.onSelectedCompetitorsChange(
        Array.from(selectedCompetitors),
        sosCalculation.sos,
        sosCalculation.ownBrandVolume,
        sosCalculation.totalVolume
      );
    }
  }, [sosCalculation, selectedCompetitors, competitorsInitialized, props]);

  // Toggle competitor selection
  const toggleCompetitor = (brand: string) => {
    setSelectedCompetitors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(brand)) {
        newSet.delete(brand);
      } else {
        newSet.add(brand);
      }
      return newSet;
    });
  };

  const selectAllCompetitors = () => {
    setSelectedCompetitors(new Set(competitorBrands));
  };

  const deselectAllCompetitors = () => {
    setSelectedCompetitors(new Set());
  };

  // Get unique categories with counts
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

  // Get unique topics (URL-based, like Ahrefs Parent Topic) with counts
  const topicStats = useMemo(() => {
    if (props.type !== 'sov') return [];

    const counts = new Map<string, { count: number; volume: number; visibleVolume: number; urls: Set<string> }>();

    for (const kw of categorizedKeywords) {
      const existing = counts.get(kw.topic) || { count: 0, volume: 0, visibleVolume: 0, urls: new Set<string>() };
      existing.urls.add(kw.url || '');
      counts.set(kw.topic, {
        count: existing.count + 1,
        volume: existing.volume + kw.searchVolume,
        visibleVolume: existing.visibleVolume + (kw.visibleVolume || 0),
        urls: existing.urls
      });
    }

    return Array.from(counts.entries())
      .map(([topic, stats]) => ({
        topic,
        count: stats.count,
        volume: stats.volume,
        visibleVolume: stats.visibleVolume,
        urlCount: stats.urls.size,
        sov: stats.volume > 0 ? Math.round((stats.visibleVolume / stats.volume) * 100 * 10) / 10 : 0
      }))
      .sort((a, b) => b.volume - a.volume); // Sort by volume for topics
  }, [categorizedKeywords, props.type]);

  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
    setCurrentPage(1);
  };

  // Toggle topic selection
  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topic)) {
        newSet.delete(topic);
      } else {
        newSet.add(topic);
      }
      return newSet;
    });
    setCurrentPage(1);
  };

  const clearCategories = () => {
    setSelectedCategories(new Set());
    setCurrentPage(1);
  };

  const clearTopics = () => {
    setSelectedTopics(new Set());
    setCurrentPage(1);
  };

  // Filter keywords by category/topic, search, and position
  const filteredKeywords = useMemo(() => {
    if (props.type === 'sov') {
      let keywords: CategorizedKeyword[] = categorizedKeywords;

      // Apply category filter (when in category mode)
      if (groupingMode === 'category' && selectedCategories.size > 0) {
        keywords = keywords.filter(kw => selectedCategories.has(kw.category));
      }

      // Apply topic filter (when in topic mode - like Ahrefs Parent Topic)
      if (groupingMode === 'topic' && selectedTopics.size > 0) {
        keywords = keywords.filter(kw => selectedTopics.has(kw.topic));
      }

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        keywords = keywords.filter(kw => kw.keyword.toLowerCase().includes(query));
      }

      // Apply position filter
      if (positionFilter !== 'all') {
        keywords = keywords.filter(kw => {
          switch (positionFilter) {
            case 'top3': return kw.position <= 3;
            case 'top10': return kw.position <= 10;
            case 'page1': return kw.position <= 10;
            case 'page2': return kw.position > 10 && kw.position <= 20;
            default: return true;
          }
        });
      }

      return keywords;
    } else {
      let keywords: BrandKeyword[] = props.keywords as BrandKeyword[];

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        keywords = keywords.filter(kw => kw.keyword.toLowerCase().includes(query));
      }

      return keywords;
    }
  }, [categorizedKeywords, selectedCategories, selectedTopics, groupingMode, searchQuery, positionFilter, props.keywords, props.type]);

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

  // Notify parent of SOV filter changes
  useEffect(() => {
    if (props.type !== 'sov' || !filteredSOVStats) return;
    if (!props.onFilteredSOVChange) return;

    // Only notify when filters are active
    const hasFilters = selectedCategories.size > 0 || selectedTopics.size > 0 || searchQuery || positionFilter !== 'all';
    if (hasFilters) {
      props.onFilteredSOVChange(
        filteredSOVStats.filteredSOV,
        filteredSOVStats.totalVisibleVolume,
        filteredSOVStats.totalMarketVolume
      );
    } else {
      // Reset to original when no filters
      props.onFilteredSOVChange(0, 0, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSOVStats, selectedCategories.size, selectedTopics.size, searchQuery, positionFilter]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortKey !== key) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  // Sort keywords
  const sortedKeywords = useMemo(() => {
    return [...filteredKeywords].sort((a, b) => {
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
  }, [filteredKeywords, sortKey, sortDirection, props.type]);

  // Pagination
  const totalPages = Math.ceil(sortedKeywords.length / itemsPerPage) || 1;

  // Ensure currentPage is valid when totalPages changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(Math.max(1, totalPages));
    }
  }, [totalPages, currentPage]);

  const paginatedKeywords = sortedKeywords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  const handleFilterChange = (setter: (val: string) => void, value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  // Page navigation handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Pagination component
  const Pagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers: (number | string)[] = [];
    const maxVisiblePages = 7;

    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
    } else {
      // Always show first page
      pageNumbers.push(1);

      if (currentPage <= 4) {
        // Near the beginning
        for (let i = 2; i <= 5; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Near the end
        pageNumbers.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pageNumbers.push(i);
      } else {
        // In the middle
        pageNumbers.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pageNumbers.push(i);
        pageNumbers.push('...');
        pageNumbers.push(totalPages);
      }
    }

    return (
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, sortedKeywords.length)} of {sortedKeywords.length}
          </span>
          <select
            id="sov-items-per-page"
            name="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            {ITEMS_PER_PAGE_OPTIONS.map(n => (
              <option key={n} value={n}>{n} per page</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {pageNumbers.map((page, idx) => (
            typeof page === 'number' ? (
              <button
                type="button"
                key={`page-${page}`}
                onClick={() => goToPage(page)}
                className={`px-3 py-1 text-sm border rounded ${
                  currentPage === page
                    ? 'bg-orange-500 text-white border-orange-500'
                    : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            ) : (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">...</span>
            )
          ))}

          <button
            type="button"
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    );
  };

  if (props.type === 'sov') {
    return (
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Share of Voice - Keyword Breakdown</h3>
          <p className="text-sm text-gray-500 mt-1">Rankings weighted by CTR to calculate visible search volume</p>
        </div>

        {/* Filters Section */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col gap-4">
            {/* Search and Position Filter Row */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Search Input */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    id="sov-search-keywords"
                    name="searchQuery"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                    placeholder="Search keywords..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Position Filter */}
              <select
                id="sov-position-filter"
                name="positionFilter"
                value={positionFilter}
                onChange={(e) => handleFilterChange(setPositionFilter, e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              >
                <option value="all">All Positions</option>
                <option value="top3">Top 3</option>
                <option value="top10">Top 10 (Page 1)</option>
                <option value="page2">Page 2 (11-20)</option>
              </select>

              {/* Clear Filters */}
              {(searchQuery || selectedCategories.size > 0 || selectedTopics.size > 0 || positionFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategories(new Set());
                    setSelectedTopics(new Set());
                    setPositionFilter('all');
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
                >
                  Clear All Filters
                </button>
              )}
            </div>

            {/* Grouping Mode Toggle */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Group by:</span>
              <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  onClick={() => {
                    setGroupingMode('topic');
                    setSelectedCategories(new Set());
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    groupingMode === 'topic'
                      ? 'bg-purple-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Parent Topic
                </button>
                <button
                  onClick={() => {
                    setGroupingMode('category');
                    setSelectedTopics(new Set());
                  }}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                    groupingMode === 'category'
                      ? 'bg-orange-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Category
                </button>
              </div>
              <span className="text-xs text-gray-500">
                {groupingMode === 'topic'
                  ? 'Groups by main keyword per URL (like Ahrefs Parent Topic)'
                  : 'Groups by Google Ads product categories'}
              </span>
            </div>

            {/* Parent Topic Filter (like Ahrefs) */}
            {groupingMode === 'topic' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Parent Topics:</span>
                    <span className="text-xs text-gray-500">(main keyword per ranking page)</span>
                  </div>
                  {selectedTopics.size > 0 && (
                    <button
                      onClick={clearTopics}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {topicStats.slice(0, 15).map(({ topic, count, volume }, idx) => (
                    <label
                      key={topic}
                      htmlFor={`topic-${idx}`}
                      className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg border cursor-pointer transition-all text-xs ${
                        selectedTopics.has(topic)
                          ? 'bg-purple-50 border-purple-300 text-purple-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-purple-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={`topic-${idx}`}
                        name={`topic-${topic}`}
                        checked={selectedTopics.has(topic)}
                        onChange={() => toggleTopic(topic)}
                        className="w-3 h-3 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="max-w-[150px] truncate" title={topic}>{topic}</span>
                      <span className={`px-1 rounded ${selectedTopics.has(topic) ? 'bg-purple-200' : 'bg-gray-100'}`}>
                        {count}
                      </span>
                      <span className="text-gray-400">{(volume / 1000).toFixed(1)}k</span>
                    </label>
                  ))}
                  {topicStats.length > 15 && (
                    <span className="text-xs text-gray-400 self-center">+{topicStats.length - 15} more topics</span>
                  )}
                </div>
                <p className="text-xs text-purple-600 italic">
                  Parent Topic = highest-volume keyword per URL. Keywords ranking for the same page share the same parent topic.
                </p>
              </div>
            )}

            {/* Category Filter - Multi-select (Google Ads categories) */}
            {groupingMode === 'category' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Select Categories:</span>
                    <span className="text-xs text-gray-500">(from Google Ads taxonomy)</span>
                  </div>
                  {selectedCategories.size > 0 && (
                    <button
                      onClick={clearCategories}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {categoryStats.slice(0, 12).map(({ category, count }, idx) => (
                    <label
                      key={category}
                      htmlFor={`category-${idx}`}
                      className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg border cursor-pointer transition-all text-xs ${
                        selectedCategories.has(category)
                          ? 'bg-orange-50 border-orange-300 text-orange-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-orange-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        id={`category-${idx}`}
                        name={`category-${category}`}
                        checked={selectedCategories.has(category)}
                        onChange={() => toggleCategory(category)}
                        className="w-3 h-3 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span>{category}</span>
                      <span className={`px-1 rounded ${selectedCategories.has(category) ? 'bg-orange-200' : 'bg-gray-100'}`}>
                        {count}
                      </span>
                    </label>
                  ))}
                  {categoryStats.length > 12 && (
                    <span className="text-xs text-gray-400 self-center">+{categoryStats.length - 12} more</span>
                  )}
                </div>
                <p className="text-xs text-orange-600 italic">
                  Categories are based on Google Ads product taxonomy from DataForSEO.
                </p>
              </div>
            )}

            {/* Active Filters Stats */}
            {(selectedCategories.size > 0 || selectedTopics.size > 0 || searchQuery || positionFilter !== 'all') && filteredSOVStats && (
              <div className="flex items-center gap-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-orange-700 font-medium">Filtered SOV:</span>
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
                <th onClick={() => handleSort('keyword')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  Keyword{getSortIndicator('keyword')}
                </th>
                <th onClick={() => handleSort('category')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  {groupingMode === 'topic' ? 'Parent Topic' : 'Category'}{getSortIndicator('category')}
                </th>
                <th onClick={() => handleSort('searchVolume')} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  Volume{getSortIndicator('searchVolume')}
                </th>
                <th onClick={() => handleSort('position')} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  Position{getSortIndicator('position')}
                </th>
                <th onClick={() => handleSort('ctr')} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  CTR %{getSortIndicator('ctr')}
                </th>
                <th onClick={() => handleSort('visibleVolume')} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  Visible Vol.{getSortIndicator('visibleVolume')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(paginatedKeywords as CategorizedKeyword[]).map((kw, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {kw.keyword}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    {groupingMode === 'topic' ? (
                      <button
                        onClick={() => toggleTopic(kw.topic)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 max-w-[150px] truncate ${
                          selectedTopics.has(kw.topic)
                            ? 'bg-purple-500 text-white'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                        title={kw.topic}
                      >
                        {kw.topic}
                      </button>
                    ) : (
                      <button
                        onClick={() => toggleCategory(kw.category)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 ${
                          selectedCategories.has(kw.category)
                            ? 'bg-orange-500 text-white'
                            : getCategoryBadgeClass(kw.category)
                        }`}
                      >
                        {kw.category}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    {kw.searchVolume.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getPositionBadgeClass(kw.position)}`}>
                      #{kw.position}
                    </span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-600 text-right">
                    {kw.ctr?.toFixed(1)}%
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-emerald-600 text-right">
                    {kw.visibleVolume?.toLocaleString()}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 max-w-[200px] truncate" title={kw.url}>
                    {kw.url}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination />
      </div>
    );
  }

  // SOS Table
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Share of Search - Brand Keywords</h3>
        <p className="text-sm text-gray-500 mt-1">Brand search volumes compared to competitors. Select which competitors to include in the calculation.</p>
      </div>

      {/* Competitor Selection */}
      {competitorBrands.length > 0 && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">Select Competitors:</span>
              <span className="text-xs text-gray-500">(all selected by default)</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAllCompetitors}
                className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                Select All
              </button>
              <button
                onClick={deselectAllCompetitors}
                className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600"
              >
                Deselect All
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {competitorBrands.map((brand, idx) => (
              <label
                key={brand}
                htmlFor={`sos-competitor-${idx}`}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                  selectedCompetitors.has(brand)
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-gray-300 text-gray-500'
                }`}
              >
                <input
                  type="checkbox"
                  id={`sos-competitor-${idx}`}
                  name={`competitor-${brand}`}
                  checked={selectedCompetitors.has(brand)}
                  onChange={() => toggleCompetitor(brand)}
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-sm capitalize">{brand}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-emerald-600 italic mt-2">
            Changing competitor selection will update the overall Share of Search % shown in the metric card above.
          </p>

          {/* Updated SOS Display */}
          {sosCalculation && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-emerald-700 font-medium">Calculated SOS:</span>
                  <span className="text-2xl font-bold text-emerald-600">{sosCalculation.sos}%</span>
                </div>
                <div className="text-sm text-emerald-600">
                  Your brand: {sosCalculation.ownBrandVolume.toLocaleString()} |
                  Total: {sosCalculation.totalVolume.toLocaleString()} |
                  {selectedCompetitors.size} of {competitorBrands.length} competitors selected
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Include
              </th>
              <th onClick={() => handleSort('keyword')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                Keyword{getSortIndicator('keyword')}
              </th>
              <th onClick={() => handleSort('searchVolume')} className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                Search Volume{getSortIndicator('searchVolume')}
              </th>
              <th onClick={() => handleSort('isOwnBrand')} className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                Type{getSortIndicator('isOwnBrand')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {(sortedKeywords as BrandKeyword[]).map((kw, idx) => (
              <tr key={idx} className={`hover:bg-gray-50 ${!kw.isOwnBrand && !selectedCompetitors.has(kw.keyword) ? 'opacity-50' : ''}`}>
                <td className="px-6 py-4 text-center">
                  {kw.isOwnBrand ? (
                    <span className="text-emerald-500">
                      <svg className="w-5 h-5 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                  ) : (
                    <input
                      type="checkbox"
                      id={`competitor-${idx}`}
                      name={`competitor-${kw.keyword}`}
                      aria-label={`Include ${kw.keyword} in calculation`}
                      checked={selectedCompetitors.has(kw.keyword)}
                      onChange={() => toggleCompetitor(kw.keyword)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  )}
                </td>
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
