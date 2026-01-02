import React, { useState } from 'react';
import { getSocialMentions, type SocialSOVResponse, type BrandMentions } from '../services/api';

interface SocialSOVPanelProps {
  brandName: string;
  competitors: string[];
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  instagram: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  tiktok: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  ),
  reddit: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
    </svg>
  ),
};

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'from-pink-500 to-purple-500',
  tiktok: 'from-gray-900 to-gray-700',
  youtube: 'from-red-500 to-red-600',
  reddit: 'from-orange-500 to-orange-600',
};

export const SocialSOVPanel: React.FC<SocialSOVPanelProps> = ({
  brandName,
  competitors,
}) => {
  const [data, setData] = useState<SocialSOVResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTriedFetch, setHasTriedFetch] = useState(false);

  const fetchData = async () => {
    if (!brandName) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await getSocialMentions(brandName, competitors.slice(0, 3));
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch social data');
    } finally {
      setIsLoading(false);
      setHasTriedFetch(true);
    }
  };

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  // Render platform breakdown
  const renderPlatformBreakdown = (mentions: BrandMentions) => {
    const platforms = Object.entries(mentions.byPlatform);
    if (platforms.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {platforms.map(([platform, stats]) => (
          <div
            key={platform}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r ${PLATFORM_COLORS[platform] || 'from-gray-400 to-gray-500'} text-white text-xs`}
          >
            {PLATFORM_ICONS[platform]}
            <span>{stats.count}</span>
          </div>
        ))}
      </div>
    );
  };

  // Not yet fetched - show prompt to start
  if (!hasTriedFetch && !isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Reddit Brand Mentions
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4 max-w-md mx-auto">
            Track brand mentions on Reddit and compare your presence against competitors.
          </p>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6 max-w-md mx-auto">
            <div className="flex items-start gap-3">
              {PLATFORM_ICONS.reddit}
              <div className="text-left">
                <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">Reddit analysis takes ~30 seconds</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  Searches for brand discussions across Reddit communities.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
          >
            {PLATFORM_ICONS.reddit}
            Analyze Reddit Mentions
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Analyzing Social Media...
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Scraping mentions from Instagram, TikTok, YouTube, and Reddit.
            <br />
            This may take 1-2 minutes.
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Fetch Social Data
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data
  if (!data) {
    return null;
  }

  // Success - show data
  const allBrands = [
    { ...data.yourBrand, isYou: true },
    ...data.competitors.map(c => ({ ...c, isYou: false })),
  ];

  const maxMentions = Math.max(...allBrands.map(b => b.totalMentions));

  return (
    <div className="space-y-6">
      {/* SOV Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SOV by Mentions */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Social SOV (Mentions)</h3>
            <svg className="w-6 h-6 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <div className="text-4xl font-bold mb-1">{data.sov.byMentions}%</div>
          <p className="text-sm opacity-75">
            {data.yourBrand.totalMentions} of {allBrands.reduce((sum, b) => sum + b.totalMentions, 0)} total mentions
          </p>
        </div>

        {/* SOV by Engagement */}
        <div className="bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Social SOV (Engagement)</h3>
            <svg className="w-6 h-6 opacity-75" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div className="text-4xl font-bold mb-1">{data.sov.byEngagement}%</div>
          <p className="text-sm opacity-75">
            {formatNumber(data.yourBrand.totalEngagement)} engagement score
          </p>
        </div>
      </div>

      {/* Brand Comparison */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            Brand Mention Comparison
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Last 30 days across all platforms
          </p>
        </div>

        <div className="p-6 space-y-4">
          {allBrands.map((brand, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${brand.isYou ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {brand.brand}
                    {brand.isYou && (
                      <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {brand.totalMentions} mentions
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                    ({formatNumber(brand.totalEngagement)} engagement)
                  </span>
                </div>
              </div>

              {/* Bar */}
              <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    brand.isYou
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      : 'bg-gradient-to-r from-gray-400 to-gray-500'
                  }`}
                  style={{ width: `${maxMentions > 0 ? (brand.totalMentions / maxMentions) * 100 : 0}%` }}
                />
              </div>

              {/* Platform breakdown */}
              {renderPlatformBreakdown(brand)}
            </div>
          ))}
        </div>
      </div>

      {/* Platform Details */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your Platform Performance
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-gray-200 dark:divide-gray-700">
          {Object.entries(data.yourBrand.byPlatform).map(([platform, stats]) => (
            <div key={platform} className="p-4 text-center">
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r ${PLATFORM_COLORS[platform]} text-white mb-2`}>
                {PLATFORM_ICONS[platform]}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.count}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">{platform}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {formatNumber(stats.engagement)} engagement
              </div>
            </div>
          ))}
          {Object.keys(data.yourBrand.byPlatform).length === 0 && (
            <div className="col-span-4 p-8 text-center text-gray-500 dark:text-gray-400">
              No mentions found on tracked platforms
            </div>
          )}
        </div>
      </div>

      {/* Recent Mentions Preview */}
      {data.yourBrand.mentions.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Mentions
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.yourBrand.mentions.slice(0, 5).map((mention, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r ${PLATFORM_COLORS[mention.platform]} flex items-center justify-center text-white`}>
                    {PLATFORM_ICONS[mention.platform]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                      {mention.text || 'No text available'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {mention.author && <span>@{mention.author}</span>}
                      {mention.engagement.likes !== undefined && mention.engagement.likes > 0 && (
                        <span>{formatNumber(mention.engagement.likes)} likes</span>
                      )}
                      {mention.engagement.comments !== undefined && mention.engagement.comments > 0 && (
                        <span>{mention.engagement.comments} comments</span>
                      )}
                    </div>
                  </div>
                  {mention.url && (
                    <a
                      href={mention.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Data
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Last updated: {new Date(data.timestamp).toLocaleString()}
        </p>
      </div>
    </div>
  );
};
