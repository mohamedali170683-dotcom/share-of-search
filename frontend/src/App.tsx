import { useState, useEffect, useMemo } from 'react';
import { MetricCard, KeywordTable, TrendsPanel, MethodologyPage, FAQ, ProjectCard, AnalysisForm, QuickWinsPanel, CategoryBreakdownPanel, CompetitorStrengthPanel, ActionListPanel, HiddenGemsPanel, CannibalizationPanel, ContentGapsPanel } from './components';
import type { BrandKeyword, RankedKeyword, SOSResult, SOVResult, GrowthGapResult, Project, ActionableInsights, BrandContext } from './types';
import { calculateMetrics, getRankedKeywords, getBrandKeywords, getTrends, exportToCSV, getBrandContext } from './services/api';
import { getProjects, saveProject, deleteProject } from './services/projectStorage';
import { useTheme } from './contexts/ThemeContext';
import type { TrendsData } from './services/api';
import { generateActionableInsights } from './lib/actionableInsights';

type ViewMode = 'dashboard' | 'analysis' | 'project';
type AnalysisTab = 'overview' | 'quick-wins' | 'hidden-gems' | 'categories' | 'competitors' | 'cannibalization' | 'content-gaps' | 'actions';

function App() {
  const { toggleTheme, isDark } = useTheme();

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [analysisTab, setAnalysisTab] = useState<AnalysisTab>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [, setCurrentProject] = useState<Project | null>(null);

  // Analysis state
  const [brandKeywords, setBrandKeywords] = useState<BrandKeyword[]>([]);
  const [rankedKeywords, setRankedKeywords] = useState<RankedKeyword[]>([]);
  const [sosResult, setSosResult] = useState<SOSResult | null>(null);
  const [sovResult, setSovResult] = useState<SOVResult | null>(null);
  const [gapResult, setGapResult] = useState<GrowthGapResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brandName, setBrandName] = useState<string>('');
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [currentDomain, setCurrentDomain] = useState<string>('');
  const [currentLocation, setCurrentLocation] = useState<{ code: number; name: string }>({ code: 2276, name: 'Germany' });
  const [currentLanguage, setCurrentLanguage] = useState<string>('de');
  const [actualCompetitors, setActualCompetitors] = useState<string[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brandContext, setBrandContext] = useState<BrandContext | undefined>(undefined);

  // Custom metric overrides from table filters
  const [customSOS, setCustomSOS] = useState<{ sos: number; brandVolume: number; totalVolume: number } | null>(null);
  const [customSOV, setCustomSOV] = useState<{ sov: number; visibleVolume: number; totalVolume: number } | null>(null);

  // Load projects on mount
  useEffect(() => {
    setProjects(getProjects());
  }, []);

  // Handler for SOS changes from KeywordTable competitor selection
  const handleSOSChange = (_selectedBrands: string[], sos: number, brandVolume: number, totalVolume: number) => {
    setCustomSOS({ sos, brandVolume, totalVolume });
  };

  // Handler for SOV changes from KeywordTable category filter
  const handleSOVChange = (filteredSOV: number, visibleVolume: number, totalVolume: number) => {
    if (filteredSOV === 0 && visibleVolume === 0 && totalVolume === 0) {
      setCustomSOV(null);
    } else {
      setCustomSOV({ sov: filteredSOV, visibleVolume, totalVolume });
    }
  };

  // Calculate effective metrics
  const effectiveSOS = customSOS?.sos ?? sosResult?.shareOfSearch ?? 0;
  const effectiveSOV = customSOV?.sov ?? sovResult?.shareOfVoice ?? 0;
  const effectiveGap = Math.round((effectiveSOV - effectiveSOS) * 10) / 10;

  // Generate actionable insights (with brand context for recommendations)
  const actionableInsights: ActionableInsights | null = useMemo(() => {
    if (rankedKeywords.length === 0 || brandKeywords.length === 0) return null;
    return generateActionableInsights(rankedKeywords, brandKeywords, brandContext);
  }, [rankedKeywords, brandKeywords, brandContext]);

  // Handle new analysis
  const handleAnalyze = async (config: {
    domain: string;
    locationCode: number;
    locationName: string;
    languageCode: string;
    customCompetitors?: string[];
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      setTrendsData(null);
      setCustomSOS(null);
      setCustomSOV(null);
      setCurrentDomain(config.domain);
      setCurrentLocation({ code: config.locationCode, name: config.locationName });
      setCurrentLanguage(config.languageCode);
      setBrandContext(undefined);

      const [rankedData, brandData] = await Promise.all([
        getRankedKeywords(
          config.domain,
          config.locationCode,
          config.languageCode,
          100
        ),
        getBrandKeywords(
          config.domain,
          config.locationCode,
          config.languageCode,
          config.customCompetitors
        )
      ]);

      setBrandKeywords(brandData.brandKeywords);
      setBrandName(brandData.brandName);
      setActualCompetitors(brandData.competitors || []);

      const calcResults = await calculateMetrics(brandData.brandKeywords, rankedData.results);

      // Fetch brand context for personalized recommendations (non-blocking)
      const topKeywords = rankedData.results
        .sort((a: RankedKeyword, b: RankedKeyword) => b.searchVolume - a.searchVolume)
        .slice(0, 10)
        .map((k: RankedKeyword) => k.keyword);
      const avgPos = rankedData.results.reduce((sum: number, k: RankedKeyword) => sum + k.position, 0) / rankedData.results.length;

      getBrandContext({
        domain: config.domain,
        brandName: brandData.brandName,
        topKeywords,
        competitors: brandData.competitors || [],
        avgPosition: Math.round(avgPos * 10) / 10,
        keywordCount: rankedData.results.length,
        sosValue: calcResults.sos.shareOfSearch,
        sovValue: calcResults.sov.shareOfVoice
      })
        .then(context => setBrandContext(context))
        .catch(() => {}); // Silently fail - recommendations will work without context
      setSosResult(calcResults.sos);
      setSovResult(calcResults.sov);
      setGapResult(calcResults.gap);
      setRankedKeywords(calcResults.sov.keywordBreakdown);

      const newProject = saveProject({
        domain: config.domain,
        brandName: brandData.brandName,
        locationCode: config.locationCode,
        locationName: config.locationName,
        languageCode: config.languageCode,
        competitors: brandData.competitors || [],
        sos: calcResults.sos,
        sov: calcResults.sov,
        gap: calcResults.gap,
        brandKeywords: brandData.brandKeywords,
        rankedKeywords: calcResults.sov.keywordBreakdown
      });

      setCurrentProject(newProject);
      setProjects(getProjects());
      setViewMode('analysis');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze domain');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProject = (project: Project) => {
    setCurrentProject(project);
    setBrandKeywords(project.brandKeywords);
    setRankedKeywords(project.rankedKeywords);
    setSosResult(project.sos);
    setSovResult(project.sov);
    setGapResult(project.gap);
    setBrandName(project.brandName);
    setCurrentDomain(project.domain);
    setCurrentLocation({ code: project.locationCode, name: project.locationName });
    setCurrentLanguage(project.languageCode);
    setActualCompetitors(project.competitors);
    setTrendsData(null);
    setCustomSOS(null);
    setCustomSOV(null);
    setViewMode('project');
  };

  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
    setProjects(getProjects());
  };

  const handleBackToDashboard = () => {
    setViewMode('dashboard');
    setCurrentProject(null);
    setSosResult(null);
    setSovResult(null);
    setGapResult(null);
    setBrandKeywords([]);
    setRankedKeywords([]);
    setTrendsData(null);
    setError(null);
    setMobileMenuOpen(false);
  };

  const handleFetchTrends = async () => {
    if (!currentDomain) return;

    try {
      setTrendsLoading(true);
      const trends = await getTrends(
        currentDomain,
        currentLocation.code,
        currentLanguage,
        actualCompetitors.length > 0 ? actualCompetitors : undefined
      );
      setTrendsData(trends);
    } catch (err) {
      console.error('Failed to fetch trends:', err);
    } finally {
      setTrendsLoading(false);
    }
  };

  const handleExport = () => {
    if (sosResult && sovResult && gapResult) {
      exportToCSV(
        brandKeywords,
        rankedKeywords,
        sosResult.shareOfSearch,
        sovResult.shareOfVoice,
        gapResult.gap
      );
    }
  };

  const getGapInterpretation = (interpretation: string) => {
    switch (interpretation) {
      case 'growth_potential':
        return { type: 'growth_potential' as const, message: 'Growth Potential' };
      case 'missing_opportunities':
        return { type: 'missing_opportunities' as const, message: 'Missing Opportunities' };
      default:
        return { type: 'balanced' as const, message: 'Balanced' };
    }
  };

  const getGapColor = (gap: number): 'emerald' | 'orange' | 'red' | 'blue' => {
    if (gap > 2) return 'emerald';
    if (gap < -2) return 'red';
    return 'blue';
  };

  // Theme Toggle Button - using render function to avoid React recreation on each render
  const renderThemeToggle = () => (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
        </svg>
      )}
    </button>
  );

  // Render Dashboard View
  const renderDashboard = () => (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Welcome Section */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to SearchShare Pro</h2>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto text-sm sm:text-base">
          Analyze your brand's Share of Search and Share of Voice to understand your market position
          and identify growth opportunities.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Column - New Analysis Form */}
        <div className="lg:col-span-1 order-1 lg:order-1">
          <AnalysisForm onAnalyze={handleAnalyze} isLoading={isLoading} />
        </div>

        {/* Right Column - Projects */}
        <div className="lg:col-span-2 order-2 lg:order-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Analyses</h3>
            {projects.length > 0 && (
              <span className="text-sm text-gray-500 dark:text-gray-400">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 sm:p-12 text-center">
              <svg className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No analyses yet</h4>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Enter a domain in the form to start your first analysis</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {projects.map(project => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onView={handleViewProject}
                  onDelete={handleDeleteProject}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-8 sm:mt-12">
        <FAQ />
      </div>
    </main>
  );

  // Tab configuration
  const analysisTabs: { id: AnalysisTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'quick-wins',
      label: 'Quick Wins',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" />
        </svg>
      ),
      badge: actionableInsights?.quickWins.length
    },
    {
      id: 'hidden-gems',
      label: 'Hidden Gems',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        </svg>
      ),
      badge: actionableInsights?.hiddenGems.length
    },
    {
      id: 'categories',
      label: 'Categories',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      badge: actionableInsights?.categoryBreakdown.length
    },
    {
      id: 'competitors',
      label: 'Competitors',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      badge: actionableInsights?.competitorStrengths.length
    },
    {
      id: 'cannibalization',
      label: 'Cannibalization',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      badge: actionableInsights?.cannibalizationIssues.length
    },
    {
      id: 'content-gaps',
      label: 'Content Gaps',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      badge: actionableInsights?.contentGaps.length
    },
    {
      id: 'actions',
      label: 'Actions',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      badge: actionableInsights?.actionList.length
    }
  ];

  // Render Analysis/Project View
  const renderAnalysis = () => (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Back Button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={handleBackToDashboard}
            className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">{currentDomain}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{currentLocation.name} • {brandName}</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 text-sm sm:text-base"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Insights Summary Banner */}
      {actionableInsights && (
        <div className="mb-6 p-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-lg">Actionable Insights Available</h3>
              <p className="text-indigo-100 text-sm">
                {actionableInsights.quickWins.length} quick wins • {actionableInsights.hiddenGems.length} hidden gems • {actionableInsights.cannibalizationIssues.length} cannibalization issues • +{actionableInsights.summary.totalQuickWinPotential.toLocaleString()} clicks potential
              </p>
            </div>
            <button
              onClick={() => setAnalysisTab('actions')}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
            >
              View Action Plan
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {analysisTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAnalysisTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${
                analysisTab === tab.id
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                  analysisTab === tab.id
                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {analysisTab === 'overview' && (
        <>
          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <MetricCard
              title={customSOS ? "Share of Search (Filtered)" : "Share of Search"}
              value={sosResult ? `${customSOS?.sos ?? sosResult.shareOfSearch}%` : '—'}
              subtitle={customSOS ? "Based on selected competitors" : "Brand awareness in search"}
              borderColor="emerald"
              tooltip="SOS = Your Brand Search Volume / Total Brand Search Volumes × 100"
              details={sosResult ? [
                { label: 'Your Brand Volume', value: (customSOS?.brandVolume ?? sosResult.brandVolume).toLocaleString() },
                { label: 'Total Brand Volume', value: (customSOS?.totalVolume ?? sosResult.totalBrandVolume).toLocaleString() }
              ] : undefined}
              insight={sosResult ? {
                summary: effectiveSOS >= 30
                  ? `Strong brand awareness! ${brandName || 'Your brand'} captures a significant portion of branded searches.`
                  : effectiveSOS >= 15
                  ? `Good brand presence. ${brandName || 'Your brand'} has moderate visibility among competitors.`
                  : `Room for growth. Consider brand marketing to increase awareness.`,
                explanation: 'SOS measures how often people search for your brand compared to all brand searches in your industry.'
              } : undefined}
            />

            <MetricCard
              title={customSOV ? "Share of Voice (Filtered)" : "Share of Voice"}
              value={sovResult ? `${customSOV?.sov ?? sovResult.shareOfVoice}%` : '—'}
              subtitle={customSOV ? "Based on selected filters" : "Visibility-weighted market share"}
              borderColor="orange"
              tooltip="SOV = Sum(Keyword Volume × CTR at Position) / Total Market Volume × 100"
              details={sovResult ? [
                { label: 'Visible Volume', value: (customSOV?.visibleVolume ?? sovResult.visibleVolume).toLocaleString() },
                { label: 'Total Market Volume', value: (customSOV?.totalVolume ?? sovResult.totalMarketVolume).toLocaleString() }
              ] : undefined}
              insight={sovResult ? {
                summary: effectiveSOV >= 25
                  ? `Excellent visibility! Your site captures a large share of organic clicks.`
                  : effectiveSOV >= 10
                  ? `Decent organic presence. There's potential to improve rankings.`
                  : `Low visibility. Focus on SEO to rank higher for valuable keywords.`,
                explanation: 'SOV shows your actual visibility in search results, weighted by click probability based on position.'
              } : undefined}
            />

            <MetricCard
              title={customSOS || customSOV ? "Growth Gap (Filtered)" : "Growth Gap"}
              value={gapResult ? `${effectiveGap > 0 ? '+' : ''}${effectiveGap}pp` : '—'}
              subtitle={customSOS || customSOV ? "Based on filtered metrics" : "SOV - SOS differential"}
              borderColor={gapResult ? getGapColor(effectiveGap) : 'blue'}
              tooltip="Gap = SOV - SOS. Positive gap indicates growth potential. Negative gap suggests missing opportunities."
              interpretation={gapResult ? getGapInterpretation(
                effectiveGap > 2 ? 'growth_potential' : effectiveGap < -2 ? 'missing_opportunities' : 'balanced'
              ) : undefined}
              insight={gapResult ? {
                summary: effectiveGap > 2
                  ? `Growth Potential! Your visibility exceeds brand awareness - opportunity to convert searches into loyalty.`
                  : effectiveGap < -2
                  ? `Missing Opportunities. Your brand awareness exceeds visibility - focus on SEO improvements.`
                  : `Balanced performance. Brand awareness and visibility are well-aligned.`,
                explanation: effectiveGap > 2
                  ? 'Invest in brand marketing to convert search visibility into lasting brand awareness.'
                  : effectiveGap < -2
                  ? 'Prioritize SEO to ensure customers who know your brand can find you organically.'
                  : 'Maintain your balanced approach while looking for opportunities to grow both metrics.'
              } : undefined}
            />
          </div>

          {/* Trends Section */}
          {sosResult && sovResult && (
            <div className="mb-6 sm:mb-8">
              {!trendsData && !trendsLoading && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Historical Trends Available</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        See how your Share of Search and Share of Voice have changed over the past 12 months
                      </p>
                    </div>
                    <button
                      onClick={handleFetchTrends}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                      Load Historical Trends
                    </button>
                  </div>
                </div>
              )}
              <TrendsPanel data={trendsData} isLoading={trendsLoading} />
            </div>
          )}

          {/* Tables */}
          <div className="space-y-6">
            {brandKeywords.length > 0 && (
              <KeywordTable
                type="sos"
                keywords={brandKeywords}
                onSelectedCompetitorsChange={handleSOSChange}
              />
            )}

            {sovResult && (
              <KeywordTable
                type="sov"
                keywords={sovResult.keywordBreakdown}
                onFilteredSOVChange={handleSOVChange}
              />
            )}
          </div>
        </>
      )}

      {analysisTab === 'quick-wins' && actionableInsights && (
        <QuickWinsPanel quickWins={actionableInsights.quickWins} />
      )}

      {analysisTab === 'hidden-gems' && actionableInsights && (
        <HiddenGemsPanel hiddenGems={actionableInsights.hiddenGems} />
      )}

      {analysisTab === 'categories' && actionableInsights && (
        <CategoryBreakdownPanel categories={actionableInsights.categoryBreakdown} />
      )}

      {analysisTab === 'competitors' && actionableInsights && (
        <CompetitorStrengthPanel
          competitors={actionableInsights.competitorStrengths}
          yourBrand={brandName}
        />
      )}

      {analysisTab === 'cannibalization' && actionableInsights && (
        <CannibalizationPanel issues={actionableInsights.cannibalizationIssues} />
      )}

      {analysisTab === 'content-gaps' && actionableInsights && (
        <ContentGapsPanel contentGaps={actionableInsights.contentGaps} />
      )}

      {analysisTab === 'actions' && actionableInsights && (
        <ActionListPanel actions={actionableInsights.actionList} />
      )}
    </main>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo & Brand */}
            <button
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">SearchShare Pro</h1>
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={handleBackToDashboard}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'dashboard'
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </span>
              </button>
              <button
                onClick={() => setShowMethodology(true)}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Methodology
                </span>
              </button>
              {renderThemeToggle()}
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              {renderThemeToggle()}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {mobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-gray-200 dark:border-gray-700">
              <nav className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    handleBackToDashboard();
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium text-left transition-colors ${
                    viewMode === 'dashboard'
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Dashboard
                  </span>
                </button>
                <button
                  onClick={() => {
                    setShowMethodology(true);
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-left text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Methodology
                  </span>
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      {viewMode === 'dashboard' ? renderDashboard() : renderAnalysis()}

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-8 sm:mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <p className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            SearchShare Pro - Share of Search & Share of Voice Analytics
          </p>
        </div>
      </footer>

      {/* Methodology Modal */}
      {showMethodology && <MethodologyPage onClose={() => setShowMethodology(false)} />}
    </div>
  );
}

export default App;
