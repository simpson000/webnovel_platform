const express = require('express');
const cors = require('cors');
const schedule = require('node-schedule');
const logger = require('./config/logger');
const config = require('./config/config');
const database = require('./utils/database');
const routes = require('./api/routes');
const NaverCrawler = require('./crawlers/naver');
const KakaoCrawler = require('./crawlers/kakao');
const MunpiaCrawler = require('./crawlers/munpia');

// Express 앱 생성
const app = express();

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// API 라우트 설정
app.use('/api', routes);

// 서버 시작
async function startServer() {
    try {
        // 데이터베이스 연결 확인
        const isConnected = await database.checkConnection();
        if (!isConnected) {
            logger.error(
                '데이터베이스 연결에 실패했습니다. 서버를 종료합니다.'
            );
            process.exit(1);
        }

        // 서버 시작
        app.listen(config.server.port, () => {
            logger.info(
                `크롤러 서버가 포트 ${config.server.port}에서 실행 중입니다`
            );
        });

        // 크롤링 작업 스케줄링
        scheduleJobs();
    } catch (error) {
        logger.error(`서버 시작 실패: ${error.message}`);
        process.exit(1);
    }
}

// 크롤링 작업 스케줄링
function scheduleJobs() {
    // 네이버 시리즈 크롤링 (매일 새벽 3시)
    schedule.scheduleJob('0 3 * * *', async () => {
        logger.info('스케줄된 네이버 시리즈 크롤링 시작');
        const crawler = new NaverCrawler();
        await crawler.crawl();
    });

    // 카카오페이지 크롤링 (매일 새벽 4시)
    schedule.scheduleJob('0 4 * * *', async () => {
        logger.info('스케줄된 카카오페이지 크롤링 시작');
        const crawler = new KakaoCrawler();
        await crawler.crawl();
    });

    // 문피아 크롤링 (매일 새벽 5시)
    schedule.scheduleJob('0 5 * * *', async () => {
        logger.info('스케줄된 문피아 크롤링 시작');
        const crawler = new MunpiaCrawler();
        await crawler.crawl();
    });

    logger.info('크롤링 작업이 스케줄링되었습니다');
}

// 서버 시작
startServer();

// 프로세스 종료 처리
process.on('SIGINT', async () => {
    logger.info('서버 종료 중...');
    process.exit(0);
});
