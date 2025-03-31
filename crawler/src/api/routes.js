const express = require('express');
const controllers = require('./controllers');

const router = express.Router();

// 크롤링 관련 라우트
router.post('/crawl/:platform', controllers.triggerCrawling);
router.get('/status', controllers.getCrawlerStatus);

// 플랫폼별 소설 데이터 조회 라우트 추가
router.get('/novels/:platform', controllers.getPlatformNovels);

// 인기 소설 조회 라우트 추가
router.get('/popular', controllers.getPopularNovels);
// 디버그 로그 조회
router.get('/debug', controllers.getDebugLogs);

module.exports = router;
