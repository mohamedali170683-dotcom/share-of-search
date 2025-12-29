import { useState, useMemo, useCallback } from 'react';
import type { BrandKeyword, RankedKeyword, SOSResult, SOVResult, GrowthGapResult, Project, ActionableInsights } from '../types';
import { calculateMetrics, getRankedKeywords, getBrandKeywords, getTrends, type TrendsData } from '../services/api';
import { saveProject, getProjects } from '../services/projectStorage';
import { generateActionableInsights } from '../lib/actionableInsights';

export interface AnalysisState {
  brandKeywords: BrandKeyword[];
  rankedKeywords: RankedKeyword[];
  sosResult: SOSResult | null;
  sovResult: SOVResult | null;
  gapResult: GrowthGapResult | null;
  brandName: string;
  currentDomain: string;
  currentLocation: { code: number; name: string };
  currentLanguage: string;
  actualCompetitors: string[];
  trendsData: TrendsData | null;
  trendsLoading: boolean;
  isLoading: boolean;
  error: string | null;
  customSOS: { sos: number; brandVolume: number; totalVolume: number } | null;
  customSOV: { sov: number; visibleVolume: number; totalVolume: number } | null;
}

export interface AnalysisConfig {
  domain: string;
  locationCode: number;
  locationName: string;
  languageCode: string;
  customCompetitors?: string[];
}

const initialState: AnalysisState = {
  brandKeywords: [],
  rankedKeywords: [],
  sosResult: null,
  sovResult: null,
  gapResult: null,
  brandName: '',
  currentDomain: '',
  currentLocation: { code: 2276, name: 'Germany' },
  currentLanguage: 'de',
  actualCompetitors: [],
  trendsData: null,
  trendsLoading: false,
  isLoading: false,
  error: null,
  customSOS: null,
  customSOV: null,
};

export function useAnalysis(onProjectSaved?: () => void) {
  const [state, setState] = useState<AnalysisState>(initialState);

  // Effective metrics with custom overrides
  const effectiveSOS = state.customSOS?.sos ?? state.sosResult?.shareOfSearch ?? 0;
  const effectiveSOV = state.customSOV?.sov ?? state.sovResult?.shareOfVoice ?? 0;
  const effectiveGap = Math.round((effectiveSOV - effectiveSOS) * 10) / 10;

  // Generate actionable insights
  const actionableInsights: ActionableInsights | null = useMemo(() => {
    if (state.rankedKeywords.length === 0 || state.brandKeywords.length === 0) return null;
    return generateActionableInsights(state.rankedKeywords, state.brandKeywords);
  }, [state.rankedKeywords, state.brandKeywords]);

  // Handler for SOS changes from KeywordTable competitor selection
  const handleSOSChange = useCallback((_selectedBrands: string[], sos: number, brandVolume: number, totalVolume: number) => {
    setState(prev => ({
      ...prev,
      customSOS: { sos, brandVolume, totalVolume }
    }));
  }, []);

  // Handler for SOV changes from KeywordTable category filter
  const handleSOVChange = useCallback((filteredSOV: number, visibleVolume: number, totalVolume: number) => {
    if (filteredSOV === 0 && visibleVolume === 0 && totalVolume === 0) {
      setState(prev => ({ ...prev, customSOV: null }));
    } else {
      setState(prev => ({
        ...prev,
        customSOV: { sov: filteredSOV, visibleVolume, totalVolume }
      }));
    }
  }, []);

  // Handle new analysis
  const handleAnalyze = useCallback(async (config: AnalysisConfig): Promise<Project | null> => {
    try {
      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        trendsData: null,
        customSOS: null,
        customSOV: null,
        currentDomain: config.domain,
        currentLocation: { code: config.locationCode, name: config.locationName },
        currentLanguage: config.languageCode,
      }));

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

      const calcResults = await calculateMetrics(brandData.brandKeywords, rankedData.results);

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

      setState(prev => ({
        ...prev,
        brandKeywords: brandData.brandKeywords,
        brandName: brandData.brandName,
        actualCompetitors: brandData.competitors || [],
        sosResult: calcResults.sos,
        sovResult: calcResults.sov,
        gapResult: calcResults.gap,
        rankedKeywords: calcResults.sov.keywordBreakdown,
        isLoading: false,
      }));

      onProjectSaved?.();
      return newProject;
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Failed to analyze domain',
        isLoading: false,
      }));
      return null;
    }
  }, [onProjectSaved]);

  // Load project data
  const loadProject = useCallback((project: Project) => {
    setState({
      brandKeywords: project.brandKeywords,
      rankedKeywords: project.rankedKeywords,
      sosResult: project.sos,
      sovResult: project.sov,
      gapResult: project.gap,
      brandName: project.brandName,
      currentDomain: project.domain,
      currentLocation: { code: project.locationCode, name: project.locationName },
      currentLanguage: project.languageCode,
      actualCompetitors: project.competitors,
      trendsData: null,
      trendsLoading: false,
      isLoading: false,
      error: null,
      customSOS: null,
      customSOV: null,
    });
  }, []);

  // Fetch trends
  const fetchTrends = useCallback(async () => {
    if (!state.currentDomain) return;

    try {
      setState(prev => ({ ...prev, trendsLoading: true }));
      const trends = await getTrends(
        state.currentDomain,
        state.currentLocation.code,
        state.currentLanguage,
        state.actualCompetitors.length > 0 ? state.actualCompetitors : undefined
      );
      setState(prev => ({ ...prev, trendsData: trends, trendsLoading: false }));
    } catch (err) {
      console.error('Failed to fetch trends:', err);
      setState(prev => ({ ...prev, trendsLoading: false }));
    }
  }, [state.currentDomain, state.currentLocation.code, state.currentLanguage, state.actualCompetitors]);

  // Reset state
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    effectiveSOS,
    effectiveSOV,
    effectiveGap,
    actionableInsights,
    handleSOSChange,
    handleSOVChange,
    handleAnalyze,
    loadProject,
    fetchTrends,
    reset,
  };
}

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);

  const loadProjects = useCallback(() => {
    setProjects(getProjects());
  }, []);

  const refreshProjects = useCallback(() => {
    setProjects(getProjects());
  }, []);

  return {
    projects,
    loadProjects,
    refreshProjects,
    setProjects,
  };
}
