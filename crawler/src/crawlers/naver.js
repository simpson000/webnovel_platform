// naver.js - 네이버 시리즈 웹소설 크롤러 수정 버전
const BaseCrawler = require('./base');
const logger = require('../config/logger');
const config = require('../config/config');

class NaverSeriesCrawler extends BaseCrawler {
    constructor() {
        super('naver');
        this.genreUrl = `${this.baseUrl}/novel/home.series`;
    }

    async crawl(debug = false) {
        try {
            await this.initialize();

            // 디버깅 모드 추가 - 문제 진단을 위한 용도
            if (debug) {
                await this.page.screenshot({ path: 'debug_home.png' });
                logger.info('디버깅 모드: 홈페이지 스크린샷 저장됨');

                // 페이지 DOM 구조 로깅
                const pageStructure = await this.page.evaluate(() => {
                    return {
                        bodyHTML: document.body.innerHTML.substring(0, 1000), // 처음 1000자만 로깅
                        possibleGenreElements: Array.from(
                            document.querySelectorAll('a')
                        )
                            .filter(
                                (a) =>
                                    a.href.includes('categoryTypeCode=genre') ||
                                    a.textContent.includes('로맨스') ||
                                    a.textContent.includes('판타지')
                            )
                            .map((a) => ({
                                text: a.textContent.trim(),
                                href: a.href,
                            }))
                            .slice(0, 10), // 처음 10개만
                    };
                });

                logger.info(
                    `페이지 구조 분석: ${JSON.stringify(pageStructure)}`
                );
            }

            // 크롤링 통계 초기화
            let novelsFetched = 0;
            let chaptersUpdated = 0;

            // 장르 목록 가져오기
            const genres = await this.getGenres();
            logger.info(
                `네이버 시리즈에서 ${
                    genres.length
                }개의 장르를 찾았습니다: ${genres
                    .map((g) => g.name)
                    .join(', ')}`
            );

            // 디버깅 모드에서 첫 장르 페이지 스크린샷
            if (debug && genres.length > 0) {
                await this.navigateTo(genres[0].url);
                await this.page.screenshot({ path: 'debug_genre.png' });
                logger.info(
                    `디버깅 모드: 장르 "${genres[0].name}" 페이지 스크린샷 저장됨`
                );
            }

            // 각 장르별로 소설 가져오기 (처음 1-2개 장르만 테스트용으로 처리)
            for (const genre of genres.slice(0, 2)) {
                logger.info(`장르 크롤링 중: ${genre.name}`);

                // 장르 페이지로 이동 - 선택자 업데이트
                await this.navigateTo(
                    genre.url,
                    '.end_section, .end_head, .lst_item'
                );

                // 페이지 로딩에 충분한 시간 부여
                await new Promise((resolve) => setTimeout(resolve, 3000));

                // 현재 장르 페이지에서 소설 목록 가져오기
                const novels = await this.getNovelsList(genre.name);
                logger.info(
                    `${genre.name} 장르에서 ${novels.length}개의 소설을 찾았습니다`
                );

                // 각 소설 처리 (테스트용으로 처음 5개만 처리)
                for (const novelPreview of novels.slice(0, 5)) {
                    try {
                        // 소설 상세 정보 가져오기
                        const novelDetail = await this.getNovelDetail(
                            novelPreview
                        );

                        // 소설 저장
                        const novelId = await this.saveNovel({
                            ...novelPreview,
                            ...novelDetail,
                            genres: [genre.name],
                        });

                        // 챕터 목록 가져오기
                        const chapters = await this.getNovelChapters(
                            novelPreview.externalId
                        );
                        logger.info(
                            `소설 "${novelPreview.title}"에서 ${chapters.length}개의 챕터를 찾았습니다`
                        );

                        // 챕터 저장
                        chaptersUpdated += await this.saveChapters(
                            novelId,
                            chapters
                        );
                        novelsFetched++;

                        // 요청 간 지연 시간 증가 (3-5초)
                        await this.delay(3000 + Math.random() * 2000);
                    } catch (error) {
                        logger.error(
                            `소설 "${novelPreview.title}" 처리 중 오류: ${error.message}`
                        );
                        // 오류 발생 시 더 긴 지연 시간 적용
                        await this.delay(5000);
                        continue;
                    }
                }
            }

            // 크롤링 완료 로그 업데이트
            await this.logCrawlingEnd(
                'COMPLETED',
                novelsFetched,
                chaptersUpdated
            );
        } catch (error) {
            logger.error(`크롤링 실패: ${error.message}`);
            await this.logCrawlingEnd('FAILED', 0, 0, error.message);
        } finally {
            await this.cleanup();
        }
    }

    async getGenres() {
        await this.navigateTo(this.genreUrl);

        // 페이지 로드 시간 추가
        await this.delay(3000);

        return await this.page.evaluate(() => {
            const genres = [];

            // 업데이트된 선택자 - 여러 선택자 시도
            // 추천 장르 링크 추출 (로맨스, 로판, 판타지 등)
            // 수정된 선택자: 추천장르 섹션 관련 선택자 추가
            let genreElements = document.querySelectorAll(
                '.tab_category_wrap a.category_type_link, .LocalNav a[href*="genre"], .Local_Navigation_Bar a[href*="genre"], .추천장르 li a, a[href*="categoryCode="]'
            );

            if (genreElements && genreElements.length > 0) {
                genreElements.forEach((element) => {
                    if (element && element.textContent) {
                        genres.push({
                            name: element.textContent.trim(),
                            url: element.href,
                        });
                    }
                });
            }

            if (genres.length === 0) {
                // 기본 장르 정보 하드코딩
                const defaultGenres = [
                    {
                        name: '로맨스',
                        url: 'https://series.naver.com/novel/categoryList.series?categoryTypeCode=genre&categoryCode=romance',
                    },
                    {
                        name: '로판',
                        url: 'https://series.naver.com/novel/categoryList.series?categoryTypeCode=genre&categoryCode=rofan',
                    },
                    {
                        name: '판타지',
                        url: 'https://series.naver.com/novel/categoryList.series?categoryTypeCode=genre&categoryCode=fantasy',
                    },
                ];
                genres.push(...defaultGenres);
            }
            // 메인 카테고리 링크도 추출 (백업 방식)
            if (genres.length === 0) {
                genreElements = document.querySelectorAll(
                    '.category_tab_list li a, .LocalNav a[href*="category"], .end_category a'
                );
                genreElements.forEach((link) => {
                    const name = link.textContent.trim();
                    if (name && name.length > 0) {
                        genres.push({
                            name: name,
                            url: link.href,
                        });
                    }
                });
            }

            // 장르 목록이 여전히 비어있다면, 페이지에서 장르명 키워드를 포함한 모든 링크 추출
            if (genres.length === 0) {
                const allLinks = document.querySelectorAll('a');
                const genreKeywords = [
                    '로맨스',
                    '판타지',
                    '무협',
                    'SF',
                    '미스터리',
                    '로판',
                    '현판',
                    '드라마',
                    '스릴러',
                ];

                allLinks.forEach((link) => {
                    const text = link.textContent.trim();
                    if (
                        text &&
                        genreKeywords.some((keyword) =>
                            text.includes(keyword)
                        ) &&
                        link.href.includes('series.naver.com')
                    ) {
                        genres.push({
                            name: text,
                            url: link.href,
                        });
                    }
                });
            }

            // 중복 제거 및 정렬
            const uniqueGenres = [];
            const seenUrls = new Set();

            genres.forEach((genre) => {
                if (!seenUrls.has(genre.url)) {
                    seenUrls.add(genre.url);
                    uniqueGenres.push(genre);
                }
            });

            return uniqueGenres;
        });
    }

    // 누락되었던 getNovelsList 함수 구현
    async getNovelsList(genreName) {
        // 페이지 로딩 대기
        await this.delay(3000);

        return await this.page.evaluate((genreName) => {
            const novels = [];

            // 성공한 선택자 활용 - a[href*="detail.series"] 포함
            const novelElements = document.querySelectorAll(
                'a[href*="detail.series"]'
            );

            novelElements.forEach((element) => {
                try {
                    // 제목 추출
                    const titleElement = element.querySelector(
                        '.title, strong, .text'
                    );
                    // 작가 추출
                    const authorElement =
                        element.querySelector('.author, .writer');

                    if (titleElement) {
                        novels.push({
                            title: titleElement.textContent.trim(),
                            author: authorElement
                                ? authorElement.textContent.trim()
                                : '작가 미상',
                            url: element.href,
                            externalId:
                                element.href.match(/productNo=(\d+)/)?.[1] ||
                                '',
                            platformGenre: genreName,
                        });
                    }
                } catch (error) {
                    console.error('소설 항목 파싱 오류:', error);
                }
            });

            return novels;
        }, genreName);
    }
}
module.exports = NaverSeriesCrawler;
