import axios from 'axios';

// API 기본 설정
const api = axios.create({
    baseURL: 'http://localhost:8080/api', // 스프링 부트 백엔드 주소
    timeout: 10000,

    headers: {
        'Content-Type': 'application/json',
    },
});

// API 함수들
export default {
    // // 소설 목록 조회
    // getNovelList(genre, page = 0, size = 10) {
    //     let url = `/novels?page=${page}&size=${size}`;
    //     if (genre) url += `&genre=${genre}`;
    //     return api.get(url);
    // },

    // // 소설 상세 조회
    // getNovelDetail(id) {
    //     return api.get(`/novels/${id}`);
    // },

    // // 인기 소설 조회 (플랫폼 지정 가능)
    // getPopularNovels(platform = 'munpia') {
    //     return api.get(`/popular?platform=${platform}`);
    // },

    // // 장르 목록 조회
    // getGenres() {
    //     return api.get('/genres');
    // },
    // // 플랫폼별 소설 조회 (문피아 중점)
    // getPlatformNovels(platform = 'munpia', page = 0, limit = 20) {
    //     return api.get(`/novels/${platform}?page=${page}&limit=${limit}`);
    // },

    // // 크롤러 관련 API
    // triggerCrawling(platform) {
    //     return api.post(`/admin/crawler/trigger/${platform}`);
    // },

    // getCrawlerStatus() {
    //     return api.get('/admin/crawler/status');
    // },
    // // 디버그 로그 조회 (추가된 메서드)
    // getDebugLogs() {
    //     return api.get('/debug');
    // },

    // 문피아 소설 목록 가져오기
    // 문피아 소설 목록 가져오기
    getMunpiaNovels() {
        return api.get('/novels/platform/munpia');
    },

    // 크롤링 시작하기
    startCrawling(platform) {
        return api.post(`/admin/crawler/trigger/${platform}`);
    },

    // 크롤링 상태 확인하기
    getCrawlingStatus() {
        return apiClient.get('/status');
    },
};
