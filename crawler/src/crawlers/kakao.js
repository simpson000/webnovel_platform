const BaseCrawler = require('./base');
const logger = require('../config/logger');
const config = require('../config/config');

class KakaoCrawler extends BaseCrawler {
    constructor() {
        super('kakao');
        this.genreUrl = `${this.baseUrl}/home?categoryUid=10`;
    }

    async crawl() {
        try {
            await this.initialize();

            logger.info('카카오페이지 크롤링 시작');

            // 아직 구현되지 않음
            logger.info('카카오페이지 크롤러는 아직 구현되지 않았습니다');

            await this.logCrawlingEnd('PARTIAL_SUCCESS', 0, 0, '크롤러 미구현');
        } catch (error) {
            logger.error(`크롤링 실패: ${error.message}`);
            await this.logCrawlingEnd('FAILED', 0, 0, error.message);
        } finally {
            await this.cleanup();
        }
    }
}

module.exports = KakaoCrawler;
