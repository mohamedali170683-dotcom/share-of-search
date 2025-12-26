import axios from 'axios';
import { RankedKeyword } from '../types/index.js';

interface SearchVolumeResult {
  keyword: string;
  search_volume: number;
}

export class DataForSEOClient {
  private auth: string;
  private baseUrl = 'https://api.dataforseo.com/v3';

  constructor(login: string, password: string) {
    this.auth = Buffer.from(`${login}:${password}`).toString('base64');
  }

  private async request<T>(endpoint: string, data: unknown[]): Promise<T> {
    try {
      const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json'
        }
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`DataForSEO API Error: ${error.response?.data?.status_message || error.message}`);
      }
      throw error;
    }
  }

  // Get search volume for brand keywords (for SOS)
  async getSearchVolume(keywords: string[], locationCode: number, languageCode: string): Promise<SearchVolumeResult[]> {
    interface TaskResponse {
      tasks: Array<{
        result: Array<{
          keyword: string;
          search_volume: number;
        }> | null;
      }>;
    }

    const response = await this.request<TaskResponse>('/keywords_data/google_ads/search_volume/live', [{
      keywords,
      location_code: locationCode,
      language_code: languageCode
    }]);

    return response.tasks[0]?.result || [];
  }

  // Get ranked keywords for a domain (for SOV)
  async getRankedKeywords(
    domain: string,
    locationCode: number,
    languageCode: string,
    limit = 1000
  ): Promise<RankedKeyword[]> {
    interface RankedKeywordItem {
      keyword_data: {
        keyword: string;
        keyword_info: {
          search_volume: number;
        };
      };
      ranked_serp_element: {
        serp_item: {
          rank_group: number;
          relative_url: string;
        };
      };
    }

    interface TaskResponse {
      tasks: Array<{
        result: Array<{
          items: RankedKeywordItem[] | null;
        }> | null;
      }>;
    }

    const response = await this.request<TaskResponse>('/dataforseo_labs/google/ranked_keywords/live', [{
      target: domain,
      location_code: locationCode,
      language_code: languageCode,
      item_types: ['organic'],
      limit,
      filters: [
        ['keyword_data.keyword_info.search_volume', '>', 0],
        'and',
        ['ranked_serp_element.serp_item.rank_group', '<=', 20]
      ],
      order_by: ['keyword_data.keyword_info.search_volume,desc']
    }]);

    const items = response.tasks[0]?.result?.[0]?.items || [];
    return items.map((item: RankedKeywordItem) => ({
      keyword: item.keyword_data.keyword,
      searchVolume: item.keyword_data.keyword_info.search_volume || 0,
      position: item.ranked_serp_element.serp_item.rank_group,
      url: item.ranked_serp_element.serp_item.relative_url
    }));
  }
}
