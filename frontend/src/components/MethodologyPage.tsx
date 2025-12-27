import React from 'react';

interface MethodologyPageProps {
  onClose: () => void;
}

export const MethodologyPage: React.FC<MethodologyPageProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-4 rounded-t-xl flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Understanding Share of Search & Share of Voice</h1>
              <p className="text-sm text-gray-500">A guide for brands and stakeholders</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-8 py-6 space-y-12">
            {/* Table of Contents */}
            <nav className="bg-gray-50 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium text-emerald-600 mb-2">Share of Search (SOS)</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li><a href="#sos-what" className="hover:text-emerald-600">What is Share of Search?</a></li>
                    <li><a href="#sos-calculate" className="hover:text-emerald-600">How We Calculate It</a></li>
                    <li><a href="#sos-interpret" className="hover:text-emerald-600">How to Read Your SOS</a></li>
                    <li><a href="#sos-drivers" className="hover:text-emerald-600">What Drives SOS?</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-medium text-orange-600 mb-2">Share of Voice (SOV)</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li><a href="#sov-what" className="hover:text-orange-600">What is Share of Voice?</a></li>
                    <li><a href="#sov-calculate" className="hover:text-orange-600">How We Calculate It</a></li>
                    <li><a href="#sov-interpret" className="hover:text-orange-600">How to Read Your SOV</a></li>
                    <li><a href="#sov-drivers" className="hover:text-orange-600">What Drives SOV?</a></li>
                  </ul>
                </div>
                <div className="md:col-span-2">
                  <h3 className="font-medium text-blue-600 mb-2">Growth Gap & Strategy</h3>
                  <ul className="space-y-1 text-sm text-gray-600">
                    <li><a href="#gap" className="hover:text-blue-600">The Growth Gap Formula</a></li>
                    <li><a href="#actions" className="hover:text-blue-600">Actionable Takeaways</a></li>
                  </ul>
                </div>
              </div>
            </nav>

            {/* SHARE OF SEARCH SECTION */}
            <section id="sos-what">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Share of Search (SOS)</h2>
              </div>

              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 mb-6">
                <p className="text-emerald-800 font-medium">
                  SOS answers the question: "When people search for brands in my category, what percentage are searching specifically for MY brand?"
                </p>
              </div>

              <div className="prose prose-gray max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">The Origin: Les Binet's Discovery</h3>
                <p className="text-gray-600 mb-4">
                  Share of Search was introduced by <strong>Les Binet</strong>, one of the world's leading marketing effectiveness experts, at EffWorks Global 2020. His research showed that:
                </p>
                <ul className="space-y-2 text-gray-600 mb-6">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">&#10003;</span>
                    <span><strong>SOS correlates strongly with market share</strong> (83% average correlation)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">&#10003;</span>
                    <span><strong>SOS predicts future market share</strong> - changes in SOS lead changes in sales</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-500 mt-1">&#10003;</span>
                    <span><strong>SOS is free and fast</strong> - uses Google search data, updated weekly</span>
                  </li>
                </ul>

                <blockquote className="border-l-4 border-emerald-300 pl-4 italic text-gray-600 mb-6">
                  "Share of Search is a powerful, cheap metric to measure what people are actually doing online, rather than what they say they are doing." - Les Binet
                </blockquote>
              </div>
            </section>

            {/* SOS Calculation */}
            <section id="sos-calculate" className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">How We Calculate SOS</h3>

              <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-center mb-6">
                Share of Search = Your Brand Search Volume / Total Category Brand Volumes × 100
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-emerald-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Component</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">What It Measures</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2 font-medium">Your Brand Volume</td>
                      <td className="border border-gray-200 px-4 py-2">Monthly searches for your brand name</td>
                      <td className="border border-gray-200 px-4 py-2">13,880 searches/month</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2 font-medium">Total Category Brand Volumes</td>
                      <td className="border border-gray-200 px-4 py-2">Searches for ALL brands in your category</td>
                      <td className="border border-gray-200 px-4 py-2">81,680 searches/month</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2 font-medium">Share of Search</td>
                      <td className="border border-gray-200 px-4 py-2">Your share of brand demand</td>
                      <td className="border border-gray-200 px-4 py-2 text-emerald-600 font-bold">17.0%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">The Predictive Power</h4>
                <p className="text-blue-800 text-sm">
                  If your Share of Search goes UP today, your market share will likely follow in the coming months (6-12 months depending on industry).
                  If it goes DOWN, that's an early warning signal.
                </p>
              </div>
            </section>

            {/* SOS Interpretation */}
            <section id="sos-interpret" className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">How to Read Your SOS Number</h3>

              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-emerald-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">SOS Range</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Interpretation</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Market Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2 font-bold text-emerald-600">40%+</td>
                      <td className="border border-gray-200 px-4 py-2">Category Leader</td>
                      <td className="border border-gray-200 px-4 py-2">You own the category in consumers' minds</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2 font-bold text-emerald-600">25-40%</td>
                      <td className="border border-gray-200 px-4 py-2">Major Player</td>
                      <td className="border border-gray-200 px-4 py-2">Strong brand, top 2-3 in category</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2 font-bold text-yellow-600">15-25%</td>
                      <td className="border border-gray-200 px-4 py-2">Established</td>
                      <td className="border border-gray-200 px-4 py-2">Recognized brand with solid demand</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2 font-bold text-orange-600">8-15%</td>
                      <td className="border border-gray-200 px-4 py-2">Challenger</td>
                      <td className="border border-gray-200 px-4 py-2">Growing brand, building awareness</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2 font-bold text-red-600">&lt;8%</td>
                      <td className="border border-gray-200 px-4 py-2">Emerging</td>
                      <td className="border border-gray-200 px-4 py-2">Early stage, low brand awareness</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-emerald-800 mb-2">What SOS Tells You</h4>
                  <ul className="text-sm text-emerald-700 space-y-1">
                    <li>&#10003; Measures DEMAND - How much people actively want your brand</li>
                    <li>&#10003; Reflects AWARENESS - People can't search for a brand they don't know</li>
                    <li>&#10003; Shows CONSIDERATION - Searchers are actively considering your brand</li>
                    <li>&#10003; Indicates FUTURE SALES - Today's searches become tomorrow's purchases</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">SOS in the Funnel</h4>
                  <p className="text-sm text-gray-600">
                    SOS sits at the <strong>CONSIDERATION</strong> stage. Someone searching for your brand has moved beyond passive awareness - they are researching, comparing, and intending to potentially purchase.
                  </p>
                </div>
              </div>
            </section>

            {/* SOS Drivers */}
            <section id="sos-drivers" className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">What Drives Share of Search?</h3>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Advertising & Media</h4>
                  <p className="text-sm text-gray-600">TV, Radio, Digital, OOH, PR - Brand campaigns drive short-term spikes and long-term base level.</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Word of Mouth</h4>
                  <p className="text-sm text-gray-600">Social media, reviews, influencers, PR coverage - Viral moments create spikes, sustained buzz builds base.</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center mb-3">
                    <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">Product Experience</h4>
                  <p className="text-sm text-gray-600">Quality, satisfaction, innovation - Slow but sustainable, most durable driver of SOS.</p>
                </div>
              </div>
            </section>

            {/* SHARE OF VOICE SECTION */}
            <section id="sov-what" className="border-t-4 border-orange-200 pt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Share of Voice (SOV)</h2>
              </div>

              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6">
                <p className="text-orange-800 font-medium">
                  SOV answers the question: "When people search for topics related to my industry, how often do they actually see and click on MY website?"
                </p>
              </div>

              <div className="prose prose-gray max-w-none">
                <p className="text-gray-600 mb-4">
                  <strong>Share of Voice (SOV)</strong> measures how much of the available organic search visibility your brand captures compared to the total market opportunity.
                </p>
              </div>
            </section>

            {/* SOV Calculation */}
            <section id="sov-calculate" className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">How We Calculate SOV</h3>

              <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-center mb-6">
                Share of Voice = Your Visible Volume / Total Market Volume × 100
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-orange-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Component</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">What It Measures</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2 font-medium">Your Visible Volume</td>
                      <td className="border border-gray-200 px-4 py-2">Estimated clicks you receive based on your rankings</td>
                      <td className="border border-gray-200 px-4 py-2">4,500 clicks/month</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2 font-medium">Total Market Volume</td>
                      <td className="border border-gray-200 px-4 py-2">Total searches for all tracked keywords</td>
                      <td className="border border-gray-200 px-4 py-2">50,000 searches/month</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2 font-medium">Share of Voice</td>
                      <td className="border border-gray-200 px-4 py-2">Your share of the "clickable" opportunity</td>
                      <td className="border border-gray-200 px-4 py-2 text-orange-600 font-bold">9%</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-yellow-800 mb-2">The Key Insight: Position Matters!</h4>
                <p className="text-yellow-700 text-sm mb-3">
                  <strong>Not all rankings are equal.</strong> A Position 1 ranking is worth ~19x more than Position 10.
                  We weight each keyword by its Click-Through Rate (CTR) based on SERP position:
                </p>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-200 px-3 py-2 text-center">Position</th>
                      <th className="border border-gray-200 px-3 py-2 text-center">CTR</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">What It Means</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-emerald-50">
                      <td className="border border-gray-200 px-3 py-2 text-center font-bold">#1</td>
                      <td className="border border-gray-200 px-3 py-2 text-center text-emerald-600 font-bold">28%</td>
                      <td className="border border-gray-200 px-3 py-2">28 out of 100 searchers click</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-3 py-2 text-center font-bold">#2</td>
                      <td className="border border-gray-200 px-3 py-2 text-center">15%</td>
                      <td className="border border-gray-200 px-3 py-2">15 out of 100 searchers click</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-200 px-3 py-2 text-center font-bold">#3</td>
                      <td className="border border-gray-200 px-3 py-2 text-center">9%</td>
                      <td className="border border-gray-200 px-3 py-2">9 out of 100 searchers click</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-3 py-2 text-center font-bold">#4</td>
                      <td className="border border-gray-200 px-3 py-2 text-center">6%</td>
                      <td className="border border-gray-200 px-3 py-2">6 out of 100 searchers click</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-200 px-3 py-2 text-center font-bold">#5</td>
                      <td className="border border-gray-200 px-3 py-2 text-center">4%</td>
                      <td className="border border-gray-200 px-3 py-2">4 out of 100 searchers click</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-3 py-2 text-center">#6-10</td>
                      <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">3% → 1.5%</td>
                      <td className="border border-gray-200 px-3 py-2 text-gray-500">Rapidly declining clicks</td>
                    </tr>
                    <tr className="bg-red-50">
                      <td className="border border-gray-200 px-3 py-2 text-center text-red-600">#11-20</td>
                      <td className="border border-gray-200 px-3 py-2 text-center text-red-600">&lt;1.5%</td>
                      <td className="border border-gray-200 px-3 py-2 text-red-600">Very few clicks (Page 2 = invisible)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Calculation Example</h4>
                <p className="text-blue-800 text-sm mb-2">
                  <strong>Keyword: "naturkosmetik"</strong> - Monthly Search Volume: 22,200 | Your Position: #4 | CTR at Position 4: 6%
                </p>
                <p className="text-blue-800 text-sm">
                  <strong>Your Visible Volume</strong> = 22,200 × 6% = <strong>1,332 estimated clicks</strong>
                </p>
                <p className="text-blue-700 text-sm mt-2">
                  If you ranked Position #1 instead: 22,200 × 28% = <strong className="text-blue-900">6,216 clicks (4.7x more!)</strong>
                </p>
              </div>
            </section>

            {/* SOV Interpretation */}
            <section id="sov-interpret" className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">How to Read Your SOV Number</h3>

              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-orange-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">SOV Range</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Interpretation</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">What It Means</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2 font-bold text-emerald-600">30%+</td>
                      <td className="border border-gray-200 px-4 py-2">Market Leader</td>
                      <td className="border border-gray-200 px-4 py-2">You dominate search visibility in your category</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2 font-bold text-emerald-600">20-30%</td>
                      <td className="border border-gray-200 px-4 py-2">Strong Position</td>
                      <td className="border border-gray-200 px-4 py-2">You're a major player with room to grow</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2 font-bold text-yellow-600">10-20%</td>
                      <td className="border border-gray-200 px-4 py-2">Competitive</td>
                      <td className="border border-gray-200 px-4 py-2">You're visible but competitors capture more</td>
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2 font-bold text-orange-600">5-10%</td>
                      <td className="border border-gray-200 px-4 py-2">Developing</td>
                      <td className="border border-gray-200 px-4 py-2">You have presence but significant opportunity exists</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2 font-bold text-red-600">&lt;5%</td>
                      <td className="border border-gray-200 px-4 py-2">Emerging</td>
                      <td className="border border-gray-200 px-4 py-2">You're barely visible in organic search</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-orange-800 mb-2">What SOV Tells You</h4>
                  <ul className="text-sm text-orange-700 space-y-1">
                    <li>&#10003; Measures VISIBILITY - How often searchers see your brand</li>
                    <li>&#10003; Weighted by QUALITY - Higher rankings count more</li>
                    <li>&#10003; Shows OPPORTUNITY - Gap to 100% is uncaptured potential</li>
                  </ul>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">SOV vs SOS</h4>
                  <p className="text-sm text-gray-600">
                    <strong>SOS</strong> = Brand DEMAND (people searching for you)<br/>
                    <strong>SOV</strong> = Brand VISIBILITY (people finding you for category terms)
                  </p>
                </div>
              </div>
            </section>

            {/* SOV Drivers */}
            <section id="sov-drivers" className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Three Levers to Improve SOV</h3>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border-2 border-orange-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-500 mb-2">1</div>
                  <h4 className="font-semibold text-gray-900 mb-2">Improve Rankings</h4>
                  <p className="text-sm text-gray-600 mb-2">Highest Impact - Moving from #5 to #1 increases visibility by 7x for that keyword.</p>
                  <div className="text-xs text-gray-500">
                    #10 → #5 = +167%<br/>
                    #5 → #3 = +125%<br/>
                    #3 → #1 = +211%
                  </div>
                </div>
                <div className="bg-white border-2 border-orange-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-500 mb-2">2</div>
                  <h4 className="font-semibold text-gray-900 mb-2">Target High-Volume Keywords</h4>
                  <p className="text-sm text-gray-600">
                    Ranking #1 for a 100-volume keyword = 28 clicks<br/>
                    Ranking #1 for a 10,000-volume keyword = 2,800 clicks
                  </p>
                </div>
                <div className="bg-white border-2 border-orange-200 rounded-lg p-4">
                  <div className="text-2xl font-bold text-orange-500 mb-2">3</div>
                  <h4 className="font-semibold text-gray-900 mb-2">Expand Coverage</h4>
                  <p className="text-sm text-gray-600">
                    More keywords ranked = More total visible volume. Identify gaps where competitors rank but you don't.
                  </p>
                </div>
              </div>
            </section>

            {/* GROWTH GAP SECTION */}
            <section id="gap" className="border-t-4 border-blue-200 pt-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">The Growth Gap</h2>
              </div>

              <div className="bg-gray-900 text-white p-4 rounded-lg font-mono text-center mb-6">
                Growth Gap = Share of Voice - Share of Search
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="border border-gray-200 px-4 py-2 text-left">Gap</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Situation</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Meaning</th>
                      <th className="border border-gray-200 px-4 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-emerald-50">
                      <td className="border border-gray-200 px-4 py-2 font-bold text-emerald-600">SOV &gt; SOS (Positive)</td>
                      <td className="border border-gray-200 px-4 py-2">Over-Indexing</td>
                      <td className="border border-gray-200 px-4 py-2">You're more visible than your brand demand suggests</td>
                      <td className="border border-gray-200 px-4 py-2">Growth potential! Visibility should drive future demand</td>
                    </tr>
                    <tr className="bg-red-50">
                      <td className="border border-gray-200 px-4 py-2 font-bold text-red-600">SOV &lt; SOS (Negative)</td>
                      <td className="border border-gray-200 px-4 py-2">Under-Indexing</td>
                      <td className="border border-gray-200 px-4 py-2">People want your brand but can't find you easily</td>
                      <td className="border border-gray-200 px-4 py-2">Fix SEO! You're losing potential customers</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-200 px-4 py-2 font-bold text-blue-600">SOV ≈ SOS (Balanced)</td>
                      <td className="border border-gray-200 px-4 py-2">Equilibrium</td>
                      <td className="border border-gray-200 px-4 py-2">Visibility matches demand</td>
                      <td className="border border-gray-200 px-4 py-2">Maintain position, focus on efficiency</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Real Example</h4>
                <p className="text-blue-800 text-sm mb-2">
                  <strong>Brand: Lavera (Natural Cosmetics)</strong>
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>Share of Search: 17.2% - 17.2% of brand searches in the category are for "Lavera"</li>
                  <li>Share of Voice: 12.8% - Lavera captures 12.8% of organic clicks for category keywords</li>
                  <li>Growth Gap: -4.4pp - Lavera is UNDER-INDEXING</li>
                </ul>
                <p className="text-blue-800 text-sm mt-3 italic">
                  "People are searching for Lavera (17.2% brand demand), but when they search for general category terms like 'naturkosmetik', Lavera only captures 12.8% of the clicks. They're missing potential customers who search for the category but don't specifically search for the brand."
                </p>
              </div>
            </section>

            {/* ACTIONABLE TAKEAWAYS */}
            <section id="actions" className="border-t border-gray-200 pt-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Actionable Takeaways</h3>

              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">If SOV &lt; SOS (Under-Indexing)</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>1. Audit your rankings - Where do you rank #4-20?</li>
                    <li>2. Prioritize by volume - Focus on high-volume keywords first</li>
                    <li>3. Create content - Target keywords where you don't rank at all</li>
                    <li>4. Technical SEO - Fix issues hurting your rankings</li>
                  </ul>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                  <h4 className="font-semibold text-emerald-800 mb-2">If SOV &gt; SOS (Over-Indexing)</h4>
                  <ul className="text-sm text-emerald-700 space-y-1">
                    <li>1. Protect your positions - Monitor for competitor gains</li>
                    <li>2. Convert visibility to brand - Ensure UX converts visitors</li>
                    <li>3. Expand carefully - Don't spread resources too thin</li>
                    <li>4. Build on strength - Double down on what's working</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-2">If SOV ≈ SOS (Balanced)</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>1. Identify efficiency gains - Move #4-10 keywords to Top 3</li>
                    <li>2. Monitor competitors - Watch for threats to your position</li>
                    <li>3. Strategic expansion - Selectively add new keywords</li>
                    <li>4. Focus on conversion - Maximize value from existing traffic</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* SUMMARY */}
            <section className="border-t border-gray-200 pt-8">
              <div className="bg-gray-900 text-white p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Key Metrics Cheat Sheet</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="px-3 py-2 text-left">Metric</th>
                        <th className="px-3 py-2 text-left">Formula</th>
                        <th className="px-3 py-2 text-left">What It Answers</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-800">
                        <td className="px-3 py-2 font-semibold text-emerald-400">Share of Search</td>
                        <td className="px-3 py-2 text-gray-300">Brand Volume ÷ All Brand Volumes</td>
                        <td className="px-3 py-2">"How much do people WANT my brand?"</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="px-3 py-2 font-semibold text-orange-400">Share of Voice</td>
                        <td className="px-3 py-2 text-gray-300">Visible Volume ÷ Total Market Volume</td>
                        <td className="px-3 py-2">"How much do people SEE my brand?"</td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="px-3 py-2 font-semibold text-blue-400">Growth Gap</td>
                        <td className="px-3 py-2 text-gray-300">SOV - SOS</td>
                        <td className="px-3 py-2">"Am I visible enough for my demand level?"</td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-semibold text-purple-400">Visible Volume</td>
                        <td className="px-3 py-2 text-gray-300">Keyword Volume × CTR at Position</td>
                        <td className="px-3 py-2">"How many clicks does this ranking bring?"</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* References */}
            <section className="border-t border-gray-200 pt-8 text-sm text-gray-500">
              <h4 className="font-semibold text-gray-700 mb-2">References</h4>
              <ul className="space-y-1">
                <li>Les Binet, "Share of Search as a Predictive Measure" - EffWorks Global 2020</li>
                <li>Binet & Field, "The Long and the Short of It" - IPA</li>
                <li>Share of Search Council - myshareofsearch.com</li>
              </ul>
            </section>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-8 py-4 bg-gray-50 rounded-b-xl">
            <p className="text-center text-sm text-gray-500">
              SearchShare Pro - Making Search Metrics Actionable
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
