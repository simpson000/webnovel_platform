// test-munpia-simple.js

// 크롤러가 다른 경로에 있다면 경로 수정
const MunpiaCrawler = require('./crawlers/munpia');

// logger가 없는 경우 간단한 로깅 함수로 대체
const logger = {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
};

// 간단한 테스트 함수
async function testMunpiaCrawler() {
    logger.info('문피아 크롤러 간단 테스트 시작');

    try {
        // 크롤러 인스턴스 생성
        const crawler = new MunpiaCrawler();

        // 디버그 모드로 크롤링 실행
        logger.info('문피아 크롤러 실행 중...');
        await crawler.crawl(true);

        logger.info('문피아 크롤러 테스트 완료');
    } catch (error) {
        logger.error(`문피아 크롤러 테스트 실패: ${error.message}`);
        console.error(error);
    } finally {
        logger.info('테스트 종료');
    }
}

// 테스트 실행
testMunpiaCrawler()
    .then(() => {
        logger.info('테스트 스크립트 완료');
    })
    .catch((err) => {
        logger.error(`예상치 못한 오류: ${err.message}`);
    });
