"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataForSEOClient = void 0;
const axios_1 = __importDefault(require("axios"));
class DataForSEOClient {
    constructor(login, password) {
        this.baseUrl = 'https://api.dataforseo.com/v3';
        this.auth = Buffer.from(`${login}:${password}`).toString('base64');
    }
    async request(endpoint, data) {
        try {
            const response = await axios_1.default.post(`${this.baseUrl}${endpoint}`, data, {
                headers: {
                    'Authorization': `Basic ${this.auth}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                throw new Error(`DataForSEO API Error: ${error.response?.data?.status_message || error.message}`);
            }
            throw error;
        }
    }
    // Get search volume for brand keywords (for SOS)
    async getSearchVolume(keywords, locationCode, languageCode) {
        const response = await this.request('/keywords_data/google_ads/search_volume/live', [{
                keywords,
                location_code: locationCode,
                language_code: languageCode
            }]);
        return response.tasks[0]?.result || [];
    }
    // Get ranked keywords for a domain (for SOV)
    async getRankedKeywords(domain, locationCode, languageCode, limit = 1000) {
        const response = await this.request('/dataforseo_labs/google/ranked_keywords/live', [{
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
        return items.map((item) => ({
            keyword: item.keyword_data.keyword,
            searchVolume: item.keyword_data.keyword_info.search_volume || 0,
            position: item.ranked_serp_element.serp_item.rank_group,
            url: item.ranked_serp_element.serp_item.relative_url
        }));
    }
}
exports.DataForSEOClient = DataForSEOClient;
//# sourceMappingURL=dataforseo.js.map