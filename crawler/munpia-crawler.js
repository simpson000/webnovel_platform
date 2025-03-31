// test/munpia-test.js
const MunpiaCrawler = require('../crawlers/munpia');
const logger = require('../config/logger');
const assert = require('assert');

/**
 * 문피아 크롤러 단위 테스트
 *
 * 다음 기능들을 테스트합니다:
 * 1. 페이지 접속
 * 2. 소설 목록 추출
 * 3. 소설 상세 정보 추출
 */
async function runTests() {
    logger.info('문피아 크롤러 단위 테스트 시작');

    try {
        // 크롤러 인스턴스 생성
        const crawler = new MunpiaCrawler();

        // 테스트 초기화
        await crawler.initialize();
        logger.info('크롤러 초기화 성공');

        // 테스트 1: 페이지 접속
        await testPageAccess(crawler);

        // 테스트 2: 소설 목록 추출
        const novels = await testNovelList(crawler);

        // 테스트 3: 소설 상세 정보 추출 (첫 번째 소설만)
        if (novels.length > 0) {
            await testNovelDetail(crawler, novels[0]);
        } else {
            logger.warn('소설 목록이 없어 상세 정보 테스트를 건너뜁니다.');
        }

        logger.info('모든 테스트 완료!');
    } catch (error) {
        logger.error(`테스트 실패: ${error.message}`);
        logger.error(error.stack);
    } finally {
        // 크롤러 정리
        if (crawler && crawler.cleanup) {
            await crawler.cleanup();
        }
        logger.info('테스트 종료');
    }
}

/**
 * 테스트 1: 페이지 접속
 */
async function testPageAccess(crawler) {
    logger.info('테스트 1: 페이지 접속');

    try {
        // 베스트 페이지로 이동
        await crawler.navigateTo(crawler.bestUrl);

        // 페이지 로드 대기
        await crawler.page.waitForTimeout(3000);

        // 페이지 제목 확인
        const title = await crawler.page.title();
        logger.info(`페이지 제목: ${title}`);

        // 페이지 URL 확인
        const url = crawler.page.url();
        logger.info(`현재 URL: ${url}`);

        // 기본 검증: URL에 'munpia.com'이 포함되어 있어야 함
        assert(url.includes('munpia.com'), '문피아 도메인이 아닙니다');

        // 디버그용 스크린샷 저장
        await crawler.page.screenshot({ path: 'test_page_access.png' });
        logger.info('페이지 접속 테스트 성공');

        return true;
    } catch (error) {
        logger.error(`페이지 접속 테스트 실패: ${error.message}`);
        throw error;
    }
}

/**
 * 테스트 2: 소설 목록 추출
 */
async function testNovelList(crawler) {
    logger.info('테스트 2: 소설 목록 추출');

    try {
        // 소설 목록 추출
        const novels = await crawler.getBestNovelsList();

        // 결과 로깅
        logger.info(`추출된 소설 수: ${novels.length}`);

        if (novels.length > 0) {
            // 첫 번째 소설의 제목, 작가, URL 정보 로깅
            logger.info(
                `첫 번째 소설: ${novels[0].title} (작가: ${novels[0].author})`
            );
            logger.info(`URL: ${novels[0].url}`);

            // 기본 검증: 소설 제목과 작가가 있어야 함
            assert(
                novels[0].title && novels[0].title !== '제목 없음',
                '첫 번째 소설의 제목이 없습니다'
            );
            assert(novels[0].author, '첫 번째 소설의 작가가 없습니다');
        } else {
            logger.warn('소설 목록이 비어 있습니다. 선택자를 확인하세요.');

            // 대체 선택자 시도
            logger.info('대체 선택자 시도 중...');
            const selectors = await crawler.tryAlternativeSelectors();
            logger.info(`대체 선택자 결과: ${JSON.stringify(selectors)}`);
        }

        logger.info('소설 목록 추출 테스트 완료');
        return novels;
    } catch (error) {
        logger.error(`소설 목록 추출 테스트 실패: ${error.message}`);
        throw error;
    }
}

/**
 * 테스트 3: 소설 상세 정보 추출
 */
async function testNovelDetail(crawler, novel) {
    logger.info(`테스트 3: 소설 상세 정보 추출 - "${novel.title}"`);

    try {
        // 소설 상세 페이지로 이동 및 정보 추출
        const details = await crawler.getNovelDetail(novel);

        // 결과 로깅
        logger.info('소설 상세 정보 추출 결과:');
        logger.info(
            `- 설명: ${
                details.description
                    ? details.description.substring(0, 50) + '...'
                    : '없음'
            }`
        );
        logger.info(`- 조회수: ${details.viewCount || 0}`);
        logger.info(`- 평점: ${details.rating || 0}`);
        logger.info(`- 리뷰 수: ${details.reviewCount || 0}`);
        logger.info(`- 유료 여부: ${details.isPaid ? '유료' : '무료'}`);
        logger.info(`- 상태: ${details.status || '알 수 없음'}`);

        // 디버그용 스크린샷 저장
        await crawler.page.screenshot({ path: 'test_novel_detail.png' });

        logger.info('소설 상세 정보 추출 테스트 완료');
        return details;
    } catch (error) {
        logger.error(`소설 상세 정보 추출 테스트 실패: ${error.message}`);
        throw error;
    }
}

// 테스트 실행
let crawler;
runTests().catch((err) => {
    logger.error(`테스트 실행 오류: ${err.message}`);
});
// test/test-page-access.js
const MunpiaCrawler = require('../crawlers/munpia');
const logger = require('../config/logger');

/**
 * 페이지 접속 테스트
 *
 * 문피아 베스트 페이지에 접속하고 페이지가 올바르게 로드되는지 확인합니다.
 */
async function testPageAccess() {
    let crawler;

    try {
        logger.info('페이지 접속 테스트 시작');

        // 크롤러 인스턴스 생성 및 초기화
        crawler = new MunpiaCrawler();
        await crawler.initialize();

        // 베스트 페이지로 이동
        await crawler.navigateTo(crawler.bestUrl);
        logger.info('문피아 베스트 페이지로 이동 완료');

        // 페이지 로드 대기
        await crawler.page.waitForTimeout(3000);

        // 페이지 제목 확인
        const title = await crawler.page.title();
        logger.info(`페이지 제목: ${title}`);

        // 현재 URL 확인
        const url = crawler.page.url();
        logger.info(`현재 URL: ${url}`);

        if (url.includes('munpia.com')) {
            logger.info('✅ 테스트 성공: 문피아 도메인에 접속됨');
        } else {
            logger.error('❌ 테스트 실패: 문피아 도메인이 아님');
        }

        // 페이지 내용 확인
        const hasContent = await crawler.page.evaluate(() => {
            return document.body.innerText.length > 0;
        });

        if (hasContent) {
            logger.info('✅ 테스트 성공: 페이지에 내용이 있음');
        } else {
            logger.error('❌ 테스트 실패: 페이지에 내용이 없음');
        }

        // 스크린샷 저장
        await crawler.page.screenshot({ path: 'page_access_test.png' });
        logger.info('스크린샷 저장됨: page_access_test.png');

        logger.info('페이지 접속 테스트 완료');
    } catch (error) {
        logger.error(`페이지 접속 테스트 실패: ${error.message}`);
        logger.error(error.stack);
    } finally {
        // 크롤러 정리
        if (crawler) {
            await crawler.cleanup();
        }
    }
}

// 테스트 실행
testPageAccess();

// test/test-novel-list.js
const MunpiaCrawler = require('../crawlers/munpia');
const logger = require('../config/logger');

/**
 * 소설 목록 추출 테스트
 *
 * 문피아 베스트 페이지에서 소설 목록을 추출하고 결과를 확인합니다.
 */
async function testNovelList() {
    let crawler;

    try {
        logger.info('소설 목록 추출 테스트 시작');

        // 크롤러 인스턴스 생성 및 초기화
        crawler = new MunpiaCrawler();
        await crawler.initialize();

        // 베스트 페이지로 이동
        await crawler.navigateTo(crawler.bestUrl);
        logger.info('문피아 베스트 페이지로 이동 완료');

        // 페이지 로드 대기
        await crawler.page.waitForTimeout(3000);

        // 소설 목록 추출
        const novels = await crawler.getBestNovelsList();
        logger.info(`추출된 소설 수: ${novels.length}`);

        if (novels.length > 0) {
            logger.info('✅ 테스트 성공: 소설 목록이 추출됨');

            // 첫 3개 소설 정보 출력 (있는 경우)
            const sampleSize = Math.min(novels.length, 3);
            logger.info(`첫 ${sampleSize}개 소설 정보:`);

            for (let i = 0; i < sampleSize; i++) {
                const novel = novels[i];
                logger.info(`${i + 1}. ${novel.title} (작가: ${novel.author})`);
                logger.info(`   장르: ${novel.genre || '미분류'}`);
                logger.info(`   URL: ${novel.url || '없음'}`);
                logger.info(
                    `   커버: ${novel.coverImageUrl ? '있음' : '없음'}`
                );
                logger.info('---');
            }

            // 소설 속성 검증
            const hasValidTitles = novels.every(
                (novel) => novel.title && novel.title !== '제목 없음'
            );
            const hasValidAuthors = novels.every((novel) => novel.author);

            logger.info(`유효한 제목 여부: ${hasValidTitles ? '✅' : '❌'}`);
            logger.info(`유효한 작가 여부: ${hasValidAuthors ? '✅' : '❌'}`);
        } else {
            logger.warn('❌ 테스트 실패: 소설 목록이 비어 있음');

            // 대체 선택자 시도
            logger.info('대체 선택자 정보 수집 중...');
            const selectors = await crawler.tryAlternativeSelectors();

            // 결과 로깅
            logger.info('페이지 구조 분석 결과:');
            for (const [selector, exists] of Object.entries(selectors)) {
                if (typeof exists === 'boolean') {
                    logger.info(
                        `${selector}: ${exists ? '존재함' : '존재하지 않음'}`
                    );
                } else if (typeof exists === 'number') {
                    logger.info(`${selector}: ${exists}`);
                }
            }

            // 스크린샷 저장
            await crawler.page.screenshot({ path: 'novel_list_test_fail.png' });
            logger.info('스크린샷 저장됨: novel_list_test_fail.png');
        }

        logger.info('소설 목록 추출 테스트 완료');
    } catch (error) {
        logger.error(`소설 목록 추출 테스트 실패: ${error.message}`);
        logger.error(error.stack);
    } finally {
        // 크롤러 정리
        if (crawler) {
            await crawler.cleanup();
        }
    }
}

// 테스트 실행
testNovelList();

// test/test-novel-detail.js
const MunpiaCrawler = require('../crawlers/munpia');
const logger = require('../config/logger');

/**
 * 소설 상세 정보 추출 테스트
 *
 * 특정 URL의 소설 상세 페이지에서 정보를 추출하고 결과를 확인합니다.
 * 테스트 URL이 유효하지 않을 경우 베스트 목록에서 첫 번째 소설을 사용합니다.
 */
async function testNovelDetail(testUrl) {
    let crawler;

    try {
        logger.info('소설 상세 정보 추출 테스트 시작');

        // 크롤러 인스턴스 생성 및 초기화
        crawler = new MunpiaCrawler();
        await crawler.initialize();

        let novelPreview;

        // 테스트 URL이 없으면 베스트 목록에서 첫 번째 소설 사용
        if (!testUrl) {
            logger.info('테스트 URL이 없음. 베스트 목록에서 소설 가져오기...');

            // 베스트 페이지로 이동
            await crawler.navigateTo(crawler.bestUrl);
            await crawler.page.waitForTimeout(3000);

            // 소설 목록 가져오기
            const novels = await crawler.getBestNovelsList();

            if (novels.length === 0) {
                throw new Error(
                    '소설 목록이 비어 있어 테스트를 진행할 수 없습니다.'
                );
            }

            novelPreview = novels[0];
            logger.info(
                `테스트할 소설: "${novelPreview.title}" (작가: ${novelPreview.author})`
            );
        } else {
            // 테스트 URL 사용
            novelPreview = {
                title: '테스트 소설',
                url: testUrl,
            };
            logger.info(`테스트 URL 사용: ${testUrl}`);
        }

        // 소설 상세 정보 추출
        const details = await crawler.getNovelDetail(novelPreview);

        // 결과 확인
        logger.info('소설 상세 정보 추출 결과:');

        // 설명
        if (details.description) {
            const previewText =
                details.description.length > 100
                    ? details.description.substring(0, 100) + '...'
                    : details.description;
            logger.info(`✅ 설명: ${previewText}`);
        } else {
            logger.warn('❌ 설명: 추출 실패');
        }

        // 조회수
        if (details.viewCount > 0) {
            logger.info(`✅ 조회수: ${details.viewCount.toLocaleString()}`);
        } else {
            logger.warn('❌ 조회수: 추출 실패 또는 0');
        }

        // 평점
        if (details.rating > 0) {
            logger.info(`✅ 평점: ${details.rating.toFixed(2)}`);
        } else {
            logger.warn('❌ 평점: 추출 실패 또는 0');
        }

        // 리뷰/댓글 수
        if (details.reviewCount > 0) {
            logger.info(`✅ 리뷰 수: ${details.reviewCount.toLocaleString()}`);
        } else {
            logger.warn('❌ 리뷰 수: 추출 실패 또는 0');
        }

        // 유료 여부
        logger.info(`✅ 유료 여부: ${details.isPaid ? '유료' : '무료'}`);

        // 상태
        logger.info(`✅ 상태: ${details.status || '알 수 없음'}`);

        // 스크린샷 저장
        await crawler.page.screenshot({ path: 'novel_detail_test.png' });
        logger.info('스크린샷 저장됨: novel_detail_test.png');

        logger.info('소설 상세 정보 추출 테스트 완료');
    } catch (error) {
        logger.error(`소설 상세 정보 추출 테스트 실패: ${error.message}`);
        logger.error(error.stack);
    } finally {
        // 크롤러 정리
        if (crawler) {
            await crawler.cleanup();
        }
    }
}

// 테스트 실행 (선택적으로 테스트 URL 제공 가능)
const testUrl = process.argv[2]; // 명령줄 인수로 URL 전달 가능
testNovelDetail(testUrl);
