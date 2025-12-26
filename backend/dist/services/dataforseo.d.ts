import { RankedKeyword } from '../types/index.js';
interface SearchVolumeResult {
    keyword: string;
    search_volume: number;
}
export declare class DataForSEOClient {
    private auth;
    private baseUrl;
    constructor(login: string, password: string);
    private request;
    getSearchVolume(keywords: string[], locationCode: number, languageCode: string): Promise<SearchVolumeResult[]>;
    getRankedKeywords(domain: string, locationCode: number, languageCode: string, limit?: number): Promise<RankedKeyword[]>;
}
export {};
//# sourceMappingURL=dataforseo.d.ts.map