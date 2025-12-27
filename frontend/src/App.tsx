import { useState, useEffect } from 'react';
import { MetricCard, KeywordTable, TrendsPanel, MethodologyPage, FAQ, ProjectCard, AnalysisForm } from './components';
import type { BrandKeyword, RankedKeyword, SOSResult, SOVResult, GrowthGapResult, Project } from './types';
import { calculateMetrics, getRankedKeywords, getBrandKeywords, getTrends, exportToCSV } from './services/api';
import { getProjects, saveProject, deleteProject } from './services/projectStorage';
import type { TrendsData } from './services/api';

type ViewMode = 'dashboard' | 'analysis' | 'project';

function App() {
  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
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

      // Fetch both ranked keywords and brand keywords in parallel
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

      // Calculate metrics
      const calcResults = await calculateMetrics(brandData.brandKeywords, rankedData.results);
      setSosResult(calcResults.sos);
      setSovResult(calcResults.sov);
      setGapResult(calcResults.gap);
      setRankedKeywords(calcResults.sov.keywordBreakdown);

      // Save as project
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

  // View a saved project
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

  // Delete a project
  const handleDeleteProject = (projectId: string) => {
    deleteProject(projectId);
    setProjects(getProjects());
  };

  // Go back to dashboard
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
  };

  // Fetch trends
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

  // Export to CSV
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

  // Render Dashboard View
  const renderDashboard = () => (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to SearchShare Pro</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Analyze your brand's Share of Search and Share of Voice to understand your market position
          and identify growth opportunities.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - New Analysis Form */}
        <div className="lg:col-span-1">
          <AnalysisForm onAnalyze={handleAnalyze} isLoading={isLoading} />
        </div>

        {/* Right Column - Projects */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Your Analyses</h3>
            {projects.length > 0 && (
              <span className="text-sm text-gray-500">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No analyses yet</h4>
              <p className="text-gray-500">Enter a domain in the form to start your first analysis</p>
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
      <div className="mt-12">
        <FAQ />
      </div>
    </main>
  );

  // Render Analysis/Project View
  const renderAnalysis = () => (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button & Title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToDashboard}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{currentDomain}</h2>
            <p className="text-sm text-gray-500">{currentLocation.name} • {brandName}</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        <div className="mb-8">
          {!trendsData && !trendsLoading && (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <div className="flex flex-col items-center gap-4">
                <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Historical Trends Available</h3>
                  <p className="text-sm text-gray-500 mb-4">
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
    </main>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={handleBackToDashboard}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">SearchShare Pro</h1>
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMethodology(true)}
                className="px-4 py-2 text-purple-600 border border-purple-300 rounded-lg hover:bg-purple-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Methodology
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {viewMode === 'dashboard' ? renderDashboard() : renderAnalysis()}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-gray-500">
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
