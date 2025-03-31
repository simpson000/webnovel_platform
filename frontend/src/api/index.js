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
// api/index.js
export default {
    // 문피아 소설 데이터 조회
    getMunpiaNovels() {
        return api.get('/novels/platform/munpia');
    },

    // 크롤링 작업 시작
    startCrawling(platform) {
        return api.post(`/crawler/trigger/${platform}`);
    },

    // 크롤링 상태 확인
    getCrawlingStatus() {
        return api.get('/crawler/status');
    },
    // 크롤링 시작 함수 추가
    triggerCrawling(platform) {
        return axios.post(`/crawler/trigger/${platform}`);
    },

    // 크롤링 상태 조회 함수 추가
    getCrawlerStatus() {
        return axios.get('/api/crawler/status');
    },
};
