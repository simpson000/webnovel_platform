// controllers.js - 문피아 크롤링 및 데이터 조회 기능 강화
const logger = require('../config/logger');
const database = require('../utils/database');
const NaverCrawler = require('../crawlers/naver');
const KakaoCrawler = require('../crawlers/kakao');
const MunpiaCrawler = require('../crawlers/munpia');

// 크롤링 작업 트리거
async function triggerCrawling(req, res) {
    const { platform } = req.params;
    const debug = req.query.debug === 'true'; // URL 쿼리 파라미터로 디버깅 모드 지정 가능

    logger.info(
        `${platform} 크롤링 작업 요청 받음 (디버깅 모드: ${
            debug ? '활성화' : '비활성화'
        })`
    );

    try {
        let crawler;

        // 플랫폼에 따른 크롤러 선택
        switch (platform.toLowerCase()) {
            case 'naver':
                crawler = new NaverCrawler();
                break;
            case 'kakao':
                crawler = new KakaoCrawler();
                break;
            case 'munpia':
                crawler = new MunpiaCrawler();
                break;
            default:
                return res
                    .status(400)
                    .json({ error: `지원하지 않는 플랫폼: ${platform}` });
        }

        // 크롤링 비동기로 시작 - 디버깅 모드 전달
        crawler.crawl(debug).catch((err) => {
            logger.error(`크롤링 오류: ${err.message}`);
        });

        return res.status(202).json({
            message: `${platform} 크롤링 작업이 시작되었습니다`,
            debug_mode: debug,
        });
    } catch (error) {
        logger.error(`크롤링 시작 실패: ${error.message}`);
        return res.status(500).json({ error: '크롤링 시작에 실패했습니다' });
    }
}

// 크롤링 상태 조회
async function getCrawlerStatus(req, res) {
    try {
        const connection = await database.getConnection();

        const [logs] = await connection.execute(
            'SELECT * FROM crawler_logs ORDER BY start_time DESC LIMIT 10'
        );

        connection.release();

        return res.json(logs);
    } catch (error) {
        logger.error(`크롤러 상태 조회 실패: ${error.message}`);
        return res
            .status(500)
            .json({ error: '크롤러 상태 조회에 실패했습니다' });
    }
}

// 플랫폼별 소설 데이터 조회 (문피아 중점 개선)
async function getPlatformNovels(req, res) {
    try {
        const { platform } = req.params;
        const limit = parseInt(req.query.limit) || 20; // 더 많은 데이터 표시
        const page = parseInt(req.query.page) || 0;
        const offset = page * limit;

        const connection = await database.getConnection();

        // 특정 플랫폼의 소설 정보 조회 (더 많은 정보 포함)
        const [novels] = await connection.execute(
            `SELECT n.*, pi.rating, pi.view_count, pi.platform_genre, pi.url, pi.review_count, pi.is_paid
             FROM novels n
             JOIN platform_infos pi ON n.id = pi.novel_id
             WHERE pi.platform_name = ?
             ORDER BY n.last_crawled_at DESC, pi.view_count DESC
             LIMIT ? OFFSET ?`,
            [platform, limit, offset]
        );

        // 각 소설의 장르 정보 가져오기
        for (const novel of novels) {
            const [genres] = await connection.execute(
                `SELECT g.name
                 FROM genres g
                 JOIN novel_genres ng ON g.id = ng.genre_id
                 WHERE ng.novel_id = ?`,
                [novel.id]
            );
            novel.genres = genres.map((g) => g.name);

            // 빈 값 처리
            if (!novel.cover_image_url) {
                novel.cover_image_url = '/placeholder-cover.png';
            }
        }

        // 마지막 크롤링 시간 정보 가져오기
        const [lastCrawlingInfo] = await connection.execute(
            `SELECT end_time FROM crawler_logs 
             WHERE platform_name = ? AND status = 'COMPLETED'
             ORDER BY end_time DESC LIMIT 1`,
            [platform]
        );

        connection.release();

        return res.json({
            platform,
            page,
            limit,
            total: novels.length,
            last_crawled:
                lastCrawlingInfo.length > 0
                    ? lastCrawlingInfo[0].end_time
                    : null,
            novels,
        });
    } catch (error) {
        logger.error(`플랫폼 소설 조회 실패: ${error.message}`);
        return res
            .status(500)
            .json({ error: '플랫폼 소설 조회에 실패했습니다' });
    }
}

// 인기 소설 데이터 조회 (문피아 중점)
async function getPopularNovels(req, res) {
    try {
        const platform = req.query.platform || 'munpia'; // 기본값으로 문피아 설정
        const limit = parseInt(req.query.limit) || 10;

        const connection = await database.getConnection();

        // 특정 플랫폼의 인기 소설 정보 조회
        const [novels] = await connection.execute(
            `SELECT n.*, pi.rating, pi.view_count, pi.platform_genre, pi.url
             FROM novels n
             JOIN platform_infos pi ON n.id = pi.novel_id
             WHERE pi.platform_name = ?
             ORDER BY pi.view_count DESC, pi.rating DESC
             LIMIT ?`,
            [platform, limit]
        );

        // 각 소설의 장르 정보 가져오기
        for (const novel of novels) {
            const [genres] = await connection.execute(
                `SELECT g.name
                 FROM genres g
                 JOIN novel_genres ng ON g.id = ng.genre_id
                 WHERE ng.novel_id = ?`,
                [novel.id]
            );
            novel.genres = genres.map((g) => g.name);
        }

        connection.release();

        return res.json(novels);
    } catch (error) {
        logger.error(`인기 소설 조회 실패: ${error.message}`);
        return res.status(500).json({ error: '인기 소설 조회에 실패했습니다' });
    }
}

// 디버그 로그 조회
async function getDebugLogs(req, res) {
    try {
        const connection = await database.getConnection();

        const [logs] = await connection.execute(
            'SELECT * FROM debug_logs ORDER BY created_at DESC LIMIT 100'
        );

        connection.release();

        return res.json(logs);
    } catch (error) {
        logger.error(`디버그 로그 조회 실패: ${error.message}`);
        return res
            .status(500)
            .json({ error: '디버그 로그 조회에 실패했습니다' });
    }
}

module.exports = {
    triggerCrawling,
    getCrawlerStatus,
    getPlatformNovels,
    getPopularNovels, // 추가된 인기 소설 조회 함수
    getDebugLogs,
};
