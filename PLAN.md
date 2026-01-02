# Implementation Plan: YouTube SOV & Paid Ads Tabs

## Overview
Replace the broken Social (Apify-based) tab with two new tabs powered by DataForSEO APIs:
1. **YouTube Tab** - YouTube video rankings & SOV
2. **Paid Ads Tab** - Google Ads visibility & advertiser analysis

---

## Tab 1: YouTube SOV

### Data Source
- **API Endpoint**: `POST https://api.dataforseo.com/v3/serp/youtube/organic/live/advanced`
- **Cost**: Per SERP (every 20 results = 1 billing unit)

### Input Parameters
```json
{
  "keyword": "brand name",
  "location_code": 2840,
  "language_code": "en",
  "device": "desktop",
  "depth": 40
}
```

### Response Data Used
- `youtube_video`: title, URL, video_id, channel_id, channel_name, views_count, duration, published_date
- `rank_group`, `rank_absolute` for positioning

### SOV Calculation for YouTube
- Search for brand name → count videos from brand's channel in top 20
- Search for competitor names → count their videos
- **YouTube SOV** = (Brand videos in top 20 / Total top 20 positions across all searches) × 100
- **Engagement Weight**: Factor in view counts for weighted SOV

### UI Components
- Video cards showing ranking position, views, channel
- SOV comparison chart (brand vs competitors)
- Top performing videos list

---

## Tab 2: Paid Ads SOV

### Data Sources

#### 1. Competitors Domain (Paid metrics)
- **Endpoint**: `POST https://api.dataforseo.com/v3/dataforseo_labs/google/competitors_domain/live`
- **Returns**: Paid search competitors with `etv` (estimated traffic), position distributions, ad spend estimates

#### 2. Google Ads Advertisers (optional enrichment)
- **Endpoint**: `POST https://api.dataforseo.com/v3/serp/google/ads_advertisers/live/advanced`
- **Returns**: Advertiser details, verification status, ad formats used

#### 3. Google Ads Search
- **Endpoint**: `POST https://api.dataforseo.com/v3/serp/google/ads_search/live/advanced`
- **Returns**: Specific ads by domain/advertiser with creative details, dates shown

### SOV Calculation for Paid Ads
From competitors_domain endpoint:
- **Paid SOV** = (Your domain's paid ETV / Sum of all competitors' paid ETV) × 100
- **Ad Impression Share** = Based on position distributions (pos_1 through pos_10)

### UI Components
- Paid SOV percentage with competitor breakdown
- Ad spend estimates comparison
- Top advertisers in your space
- Ad format breakdown (text, image, video)

---

## Files to Create

### Backend (Vercel serverless functions)
1. `frontend/api/youtube-sov.ts` - YouTube SERP API integration
2. `frontend/api/paid-ads.ts` - Paid ads data from DataForSEO Labs

### Frontend Components
3. `frontend/src/components/YouTubeSOVPanel.tsx` - YouTube tab UI
4. `frontend/src/components/PaidAdsPanel.tsx` - Paid Ads tab UI

### Modifications
5. `frontend/src/App.tsx` - Add 'youtube' and 'paidAds' tabs, remove 'social'
6. `frontend/src/services/api.ts` - Add API client functions
7. `frontend/src/types/index.ts` - Add new type definitions

---

## Implementation Order

1. **Create `youtube-sov.ts` API endpoint**
   - Fetch YouTube SERP for brand + competitors
   - Calculate video presence and engagement-weighted SOV
   - Return structured response

2. **Create `YouTubeSOVPanel.tsx` component**
   - Loading state, error handling
   - Video cards with thumbnails, views, rankings
   - SOV comparison visualization

3. **Create `paid-ads.ts` API endpoint**
   - Fetch competitors_domain with paid metrics
   - Calculate paid SOV from ETV data
   - Return ad spend estimates and position data

4. **Create `PaidAdsPanel.tsx` component**
   - Paid SOV metric card
   - Competitor ad spend comparison
   - Position distribution chart

5. **Update `App.tsx`**
   - Replace 'social' tab with 'youtube' and 'paidAds'
   - Wire up new components

6. **Update `api.ts` service**
   - Add `getYouTubeSOV()` and `getPaidAds()` functions

7. **Remove deprecated files**
   - Delete `social-mentions.ts`
   - Delete `SocialSOVPanel.tsx`

---

## Type Definitions

```typescript
// YouTube types
interface YouTubeVideo {
  videoId: string;
  title: string;
  url: string;
  channelId: string;
  channelName: string;
  viewsCount: number;
  duration: string;
  publishedDate: string;
  rank: number;
  thumbnail?: string;
}

interface YouTubeSOVResponse {
  yourBrand: {
    videos: YouTubeVideo[];
    totalVideosInTop20: number;
    totalViews: number;
  };
  competitors: Array<{
    name: string;
    videos: YouTubeVideo[];
    totalVideosInTop20: number;
    totalViews: number;
  }>;
  sov: {
    byCount: number;      // % of top 20 positions
    byViews: number;      // engagement-weighted %
  };
  timestamp: string;
}

// Paid Ads types
interface PaidCompetitor {
  domain: string;
  paidETV: number;           // estimated traffic value
  paidKeywordsCount: number;
  estimatedAdSpend: number;
  avgPosition: number;
  positionDistribution: {
    pos1: number;
    pos2_3: number;
    pos4_10: number;
  };
}

interface PaidAdsResponse {
  yourDomain: PaidCompetitor;
  competitors: PaidCompetitor[];
  sov: {
    byTraffic: number;    // ETV-based SOV
    byKeywords: number;   // keyword count SOV
  };
  topAdvertisers: Array<{
    domain: string;
    adCount: number;
    formats: string[];
  }>;
  timestamp: string;
}
```

---

## Estimated API Costs

### YouTube SOV
- 1 search per brand/competitor × 5 entities = 5 SERP calls
- ~$0.005 per call = ~$0.025 per analysis

### Paid Ads
- 1 competitors_domain call = ~$0.02
- Total: ~$0.02 per analysis

**Combined**: ~$0.045 per full analysis (much cheaper than Apify!)
