import React, { useState } from 'react';

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

const faqItems: FAQItem[] = [
  {
    question: 'What is Share of Search (SOS)?',
    answer: (
      <div className="space-y-2">
        <p>
          Share of Search measures what percentage of brand searches in your category are for YOUR brand.
          It was introduced by <strong>Les Binet</strong> at EffWorks Global 2020 and correlates strongly (83% average) with market share.
        </p>
        <div className="bg-gray-100 p-3 rounded font-mono text-sm">
          SOS = Your Brand Search Volume / Total Category Brand Volumes × 100
        </div>
        <p className="text-sm text-gray-600">
          If your SOS goes UP today, your market share will likely follow in the coming months (6-12 months depending on industry).
        </p>
      </div>
    )
  },
  {
    question: 'What is Share of Voice (SOV)?',
    answer: (
      <div className="space-y-2">
        <p>
          Share of Voice measures how much of the available organic search visibility your brand captures.
          It's weighted by position - a #1 ranking is worth ~19x more than #10.
        </p>
        <div className="bg-gray-100 p-3 rounded font-mono text-sm">
          SOV = Your Visible Volume / Total Market Volume × 100
        </div>
        <p className="text-sm text-gray-600">
          Position #1 gets ~28% CTR, #2 gets ~15%, #3 gets ~9%. Page 2 is essentially invisible (&lt;1.5% CTR).
        </p>
      </div>
    )
  },
  {
    question: 'What is the Growth Gap?',
    answer: (
      <div className="space-y-3">
        <p>
          The Growth Gap is the difference between your Share of Voice and Share of Search (SOV - SOS).
        </p>
        <div className="grid gap-2">
          <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded">
            <span className="font-bold text-emerald-600">SOV &gt; SOS (Positive):</span>
            <span className="text-sm">Growth potential! Your visibility exceeds brand awareness.</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
            <span className="font-bold text-red-600">SOV &lt; SOS (Negative):</span>
            <span className="text-sm">Missing opportunities. People want your brand but can't find you.</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
            <span className="font-bold text-blue-600">SOV ≈ SOS (Balanced):</span>
            <span className="text-sm">Equilibrium. Your visibility matches brand demand.</span>
          </div>
        </div>
      </div>
    )
  },
  {
    question: 'How should I interpret my SOS percentage?',
    answer: (
      <div className="space-y-2">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b">
              <td className="py-2 font-bold text-emerald-600">40%+</td>
              <td className="py-2">Category Leader - You own the category in consumers' minds</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-bold text-emerald-600">25-40%</td>
              <td className="py-2">Major Player - Strong brand, top 2-3 in category</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-bold text-yellow-600">15-25%</td>
              <td className="py-2">Established - Recognized brand with solid demand</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-bold text-orange-600">8-15%</td>
              <td className="py-2">Challenger - Growing brand, building awareness</td>
            </tr>
            <tr>
              <td className="py-2 font-bold text-red-600">&lt;8%</td>
              <td className="py-2">Emerging - Early stage, low brand awareness</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  },
  {
    question: 'How can I improve my Share of Voice?',
    answer: (
      <div className="space-y-3">
        <p>There are three main levers to improve SOV:</p>
        <div className="grid gap-2">
          <div className="p-3 border rounded">
            <span className="font-bold text-orange-600">1. Improve Rankings</span>
            <p className="text-sm text-gray-600 mt-1">Moving from #5 to #1 increases visibility by 7x for that keyword.</p>
          </div>
          <div className="p-3 border rounded">
            <span className="font-bold text-orange-600">2. Target High-Volume Keywords</span>
            <p className="text-sm text-gray-600 mt-1">Ranking #1 for a 10,000-volume keyword = 2,800 clicks vs 28 clicks for a 100-volume keyword.</p>
          </div>
          <div className="p-3 border rounded">
            <span className="font-bold text-orange-600">3. Expand Coverage</span>
            <p className="text-sm text-gray-600 mt-1">More keywords ranked = more total visible volume. Identify gaps where competitors rank but you don't.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    question: 'What drives Share of Search?',
    answer: (
      <div className="space-y-2">
        <p>SOS is driven by brand demand, which comes from:</p>
        <ul className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">●</span>
            <span><strong>Advertising & Media:</strong> TV, Radio, Digital, OOH, PR - drives short-term spikes and long-term base level</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">●</span>
            <span><strong>Word of Mouth:</strong> Social media, reviews, influencers - viral moments create spikes, sustained buzz builds base</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-1">●</span>
            <span><strong>Product Experience:</strong> Quality, satisfaction, innovation - slow but sustainable, most durable driver</span>
          </li>
        </ul>
      </div>
    )
  }
];

export const FAQ: React.FC = () => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    setOpenItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h2>
        <p className="text-sm text-gray-500 mt-1">Learn about Share of Search and Share of Voice metrics</p>
      </div>
      <div className="divide-y divide-gray-200">
        {faqItems.map((item, index) => (
          <div key={index} className="px-6">
            <button
              type="button"
              onClick={() => toggleItem(index)}
              className="w-full py-4 flex items-center justify-between text-left hover:text-emerald-600 transition-colors"
            >
              <span className="font-medium text-gray-900">{item.question}</span>
              <svg
                className={`w-5 h-5 text-gray-500 transition-transform ${openItems.has(index) ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openItems.has(index) && (
              <div className="pb-4 text-gray-600">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
