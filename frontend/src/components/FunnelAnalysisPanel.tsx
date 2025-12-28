import React, { useState } from 'react';
import type { FunnelStageAnalysis, IntentOpportunity, FunnelStage, SearchIntent } from '../types';

interface FunnelAnalysisPanelProps {
  funnelAnalysis: FunnelStageAnalysis[];
  intentOpportunities: IntentOpportunity[];
}

const getStageConfig = (stage: FunnelStage) => {
  switch (stage) {
    case 'awareness':
      return {
        icon: '👁️',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20',
        borderColor: 'border-blue-200 dark:border-blue-800',
        gradient: 'from-blue-500 to-blue-600'
      };
    case 'consideration':
      return {
        icon: '🤔',
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        gradient: 'from-amber-500 to-amber-600'
      };
    case 'decision':
      return {
        icon: '💰',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-200 dark:border-green-800',
        gradient: 'from-green-500 to-green-600'
      };
  }
};

const getIntentConfig = (intent: SearchIntent) => {
  switch (intent) {
    case 'informational':
      return { label: 'Informational', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' };
    case 'navigational':
      return { label: 'Navigational', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/30' };
    case 'commercial':
      return { label: 'Commercial', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' };
    case 'transactional':
      return { label: 'Transactional', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30' };
  }
};

const getStrategicValueConfig = (value: 'high' | 'medium' | 'low') => {
  switch (value) {
    case 'high':
      return { label: 'High Value', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30', icon: '⭐' };
    case 'medium':
      return { label: 'Medium Value', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: '◆' };
    case 'low':
      return { label: 'Low Value', color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-800', icon: '○' };
  }
};

export const FunnelAnalysisPanel: React.FC<FunnelAnalysisPanelProps> = ({
  funnelAnalysis,
  intentOpportunities
}) => {
  const [selectedStage, setSelectedStage] = useState<FunnelStage | 'all'>('all');
  const [showOpportunities, setShowOpportunities] = useState(true);

  // Calculate totals
  const totalVolume = funnelAnalysis.reduce((sum, s) => sum + s.totalVolume, 0);
  const totalKeywords = funnelAnalysis.reduce((sum, s) => sum + s.keywordCount, 0);

  // Filter opportunities by selected stage
  const filteredOpportunities = selectedStage === 'all'
    ? intentOpportunities
    : intentOpportunities.filter(o => o.funnelStage === selectedStage);

  // High value opportunities
  const highValueOpps = filteredOpportunities.filter(o => o.strategicValue === 'high');

  if (funnelAnalysis.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8">
        <div className="text-center">
          <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h18M3 8h18M3 12h12M3 16h12M3 20h12" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Intent Analysis Loading</h3>
          <p className="text-gray-500 dark:text-gray-400">
            Search intent data is being loaded. This analysis shows how your keywords map to the buyer journey funnel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Buyer Journey Analysis
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Keywords mapped to awareness, consideration, and decision stages
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOpportunities(!showOpportunities)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                showOpportunities
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {showOpportunities ? 'Showing Opportunities' : 'Show Opportunities'}
            </button>
          </div>
        </div>
      </div>

      {/* Funnel Stage Overview */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {funnelAnalysis.map((stage) => {
            const config = getStageConfig(stage.stage);
            const percentage = totalVolume > 0 ? Math.round((stage.totalVolume / totalVolume) * 100) : 0;

            return (
              <button
                key={stage.stage}
                onClick={() => setSelectedStage(selectedStage === stage.stage ? 'all' : stage.stage)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedStage === stage.stage
                    ? `${config.borderColor} ${config.bgColor} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800`
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{config.icon}</span>
                    <div className="text-left">
                      <div className={`font-semibold ${config.color}`}>{stage.stageLabel}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{stage.keywordCount} keywords</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">{percentage}%</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">of volume</div>
                  </div>
                </div>

                {/* Volume bar */}
                <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${config.gradient}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="text-left">
                    <span className="text-gray-500 dark:text-gray-400">Avg Position</span>
                    <p className="font-semibold text-gray-900 dark:text-white">#{stage.avgPosition}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500 dark:text-gray-400">SOV</span>
                    <p className={`font-semibold ${config.color}`}>{stage.sov}%</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Stage Details or All Stages */}
      {selectedStage !== 'all' && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          {funnelAnalysis.filter(s => s.stage === selectedStage).map((stage) => {
            const config = getStageConfig(stage.stage);
            return (
              <div key={stage.stage}>
                {/* Description */}
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{stage.description}</p>

                {/* Strategic Insights */}
                <div className={`p-4 rounded-lg ${config.bgColor} border ${config.borderColor} mb-4`}>
                  <h4 className={`font-semibold ${config.color} mb-2 flex items-center gap-2`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                    </svg>
                    Strategic Insights
                  </h4>
                  <ul className="space-y-1">
                    {stage.strategicInsights.map((insight, idx) => (
                      <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <span className="text-gray-400">•</span>
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Top Keywords */}
                {stage.topKeywords.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Top Keywords</h4>
                    <div className="space-y-2">
                      {stage.topKeywords.map((kw, idx) => {
                        const intentConfig = getIntentConfig(kw.intent);
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-0.5 rounded ${intentConfig.bg} ${intentConfig.color}`}>
                                {intentConfig.label}
                              </span>
                              <span className="font-medium text-gray-900 dark:text-white text-sm">{kw.keyword}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-500 dark:text-gray-400">#{kw.position}</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{kw.searchVolume.toLocaleString()}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* High Value Opportunities */}
      {showOpportunities && highValueOpps.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <span className="text-yellow-500">⭐</span>
            High Strategic Value Opportunities
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
              ({highValueOpps.length} keywords)
            </span>
          </h4>
          <div className="space-y-3">
            {highValueOpps.slice(0, 10).map((opp, idx) => {
              const stageConfig = getStageConfig(opp.funnelStage);
              const intentConfig = getIntentConfig(opp.intent);

              return (
                <div key={idx} className="p-3 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${stageConfig.bgColor} ${stageConfig.color}`}>
                        {stageConfig.icon} {opp.funnelStage}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${intentConfig.bg} ${intentConfig.color}`}>
                        {intentConfig.label}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 dark:text-white">{opp.keyword}</h5>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{opp.strategicReasoning}</p>
                      {opp.brandRelevance && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          {opp.brandRelevance}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-gray-900 dark:text-white">#{opp.position}</p>
                        <p className="text-xs text-gray-500">Position</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-900 dark:text-white">{opp.searchVolume.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Volume</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Opportunities List */}
      {showOpportunities && filteredOpportunities.length > 0 && (
        <div className="px-6 py-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
            {selectedStage === 'all' ? 'All Intent Opportunities' : `${funnelAnalysis.find(s => s.stage === selectedStage)?.stageLabel} Opportunities`}
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              ({filteredOpportunities.length} total)
            </span>
          </h4>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-2 font-medium">Keyword</th>
                  <th className="pb-2 font-medium">Stage</th>
                  <th className="pb-2 font-medium">Intent</th>
                  <th className="pb-2 font-medium text-right">Position</th>
                  <th className="pb-2 font-medium text-right">Volume</th>
                  <th className="pb-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredOpportunities.slice(0, 20).map((opp, idx) => {
                  const stageConfig = getStageConfig(opp.funnelStage);
                  const intentConfig = getIntentConfig(opp.intent);
                  const valueConfig = getStrategicValueConfig(opp.strategicValue);

                  return (
                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-2">
                        <div className="font-medium text-gray-900 dark:text-white">{opp.keyword}</div>
                        <div className="text-xs text-gray-500 truncate max-w-[200px]" title={opp.strategicReasoning}>
                          {opp.strategicReasoning}
                        </div>
                      </td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${stageConfig.bgColor} ${stageConfig.color}`}>
                          {opp.funnelStage}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${intentConfig.bg} ${intentConfig.color}`}>
                          {intentConfig.label}
                        </span>
                      </td>
                      <td className="py-2 text-right text-gray-900 dark:text-white">#{opp.position}</td>
                      <td className="py-2 text-right font-medium text-gray-900 dark:text-white">
                        {opp.searchVolume.toLocaleString()}
                      </td>
                      <td className="py-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${valueConfig.bg} ${valueConfig.color}`}>
                          {valueConfig.icon} {valueConfig.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredOpportunities.length > 20 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
              Showing 20 of {filteredOpportunities.length} opportunities
            </p>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalKeywords}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Keywords</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalVolume.toLocaleString()}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Volume</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{highValueOpps.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">High Value Opps</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{intentOpportunities.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Opportunities</p>
          </div>
        </div>
      </div>
    </div>
  );
};
