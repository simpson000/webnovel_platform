// munpia.js - 문피아 웹소설 크롤러 개선
const BaseCrawler = require('./base');
const logger = require('../config/logger');
const config = require('../config/config');

class MunpiaCrawler extends BaseCrawler {
    constructor() {
        super('munpia');
        this.bestUrl =
            'https://www.munpia.com/page/j/view/w/best/today?displayType=GRID';
        this.latestUrl =
            'https://www.munpia.com/page/j/view/w/golden?displayType=GRID'; // 최신작
    }
    // 추가: enableDebugMode 함수 정의
    enableDebugMode() {
        console.log('Debug mode enabled for Munpia crawler');
        // 추가 디버깅 설정을 여기에 구현할 수 있음
    }
    // 지연 메서드 재정의
    async delay(ms) {
        return new Promise((resolve) =>
            setTimeout(resolve, ms || this.requestDelay)
        );
    }
    // munpia.js 파일

    async crawl(debug = false) {
        try {
            await this.initialize();

            // 디버깅 설정 및 로깅
            if (debug) this.enableDebugMode();

            logger.info('문피아 베스트 페이지 크롤링 시작');

            // 변수 선언
            let allNovels = [];
            let pageCount = 5; // 크롤링할 페이지 수 (각 페이지에 약 10-12개 작품)

            // 여러 페이지 크롤링
            for (let page = 1; page <= pageCount; page++) {
                // 페이지 URL 설정 (페이지 번호 파라미터 추가)
                const pageUrl = `${this.bestUrl}&page=${page}`;

                logger.info(`페이지 이동: ${pageUrl} (${page}/${pageCount})`);
                await this.navigateTo(pageUrl);
                await this.delay(3000); // 페이지 로딩 대기

                // 소설 목록 가져오기
                const novels = await this.getBestNovelsList();
                logger.info(
                    `페이지 ${page}에서 ${novels.length}개의 소설을 찾았습니다`
                );

                // 이미 크롤링된 소설과 중복 제거
                const newNovels = novels.filter(
                    (novel) =>
                        !allNovels.some(
                            (existing) =>
                                existing.title === novel.title &&
                                existing.author === novel.author
                        )
                );

                allNovels = [...allNovels, ...newNovels];
                logger.info(
                    `현재까지 총 ${allNovels.length}개의 고유한 소설을 찾았습니다`
                );

                // 목표 개수에 도달하면 중단
                if (allNovels.length >= 50) {
                    logger.info(
                        `목표 소설 수(50)에 도달했습니다. 크롤링을 중단합니다.`
                    );
                    break;
                }

                // 과부하 방지를 위한 지연
                if (page < pageCount) {
                    await this.delay(2000);
                }
            }
            // 50개가 안 되면 최신작도 크롤링
            if (allNovels.length < 50) {
                logger.info('문피아 최신작 크롤링 시작');
                for (let page = 1; page <= pageCount; page++) {
                    if (allNovels.length >= 50) break;

                    const pageUrl = `${this.latestUrl}&page=${page}`;
                    await this.navigateTo(pageUrl);
                    await this.delay(3000);

                    const novels = await this.getBestNovelsList();

                    // 중복 제거
                    const newNovels = novels.filter(
                        (novel) =>
                            !allNovels.some(
                                (existing) =>
                                    existing.title === novel.title &&
                                    existing.author === novel.author
                            )
                    );

                    allNovels = [...allNovels, ...newNovels];
                    logger.info(
                        `최신작 페이지 ${page}에서 ${newNovels.length}개의 새로운 소설을 찾았습니다. 총: ${allNovels.length}`
                    );

                    if (allNovels.length >= 50) break;
                    await this.delay(2000);
                }
            }
            let novelCount = 0;
            let chapterCount = 0;
            const novelsToProcess = allNovels.slice(0, 50);
            const uniqueNovels = this.removeDuplicates(allNovels);

            for (const novelPreview of novels) {
                try {
                    // 소설 상세 정보 가져오기 (있는 경우)
                    let novelDetail = {};
                    if (novelPreview.url) {
                        novelDetail = await this.getNovelDetail(novelPreview);
                    }

                    // 소설 저장
                    const novelData = {
                        ...novelPreview,
                        ...novelDetail,
                    };

                    const novelId = await this.saveNovel(novelData);
                    novelCount++;

                    // 각 소설의 로그 기록
                    logger.info(
                        `소설 저장 완료: ${novelPreview.title} (${novelCount}/${novelsToProcess.length})`
                    );

                    // 필요한 경우 챕터 정보도 처리
                    // 임시 지연 추가 (서버 부하 감소)
                    await this.delay(1000);
                } catch (error) {
                    logger.error(
                        `소설 "${novelPreview.title}" 처리 중 오류: ${error.message}`
                    );
                }
            }

            // 크롤링 로그 업데이트
            await this.logCrawlingEnd('COMPLETED', novelCount, chapterCount);

            // 결과 반환
            return { novelCount, chapterCount };
        } catch (error) {
            logger.error(`문피아 크롤링 실패: ${error.message}`);
            await this.logCrawlingEnd('FAILED', 0, 0, error.message);
            throw error;
        } finally {
            await this.cleanup();
        }
    }
    // 중복 제거 헬퍼 함수 추가
    removeDuplicates(novels) {
        const uniqueNovels = [];
        const seen = new Set();

        for (const novel of novels) {
            const key = `${novel.title}-${novel.author}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueNovels.push(novel);
            }
        }

        return uniqueNovels;
    }

    async getBestNovelsList() {
        try {
            // 문피아 베스트 페이지에서 소설 정보 추출 (여러 선택자 시도)
            const novels = await this.page.evaluate(() => {
                // 다양한 선택자 시도
                const selectors = [
                    '.item.zoom',
                    '.best_list li',
                    '.ranking_list_wrap li',
                    '.list-item',
                    '.section-item',
                    '.novel-item',
                    'a[href*="/novel/"]',
                ];

                let novelItems = [];

                // 각 선택자로 시도
                for (const selector of selectors) {
                    const items = document.querySelectorAll(selector);
                    if (items && items.length > 0) {
                        novelItems = items;
                        console.log(
                            `선택자 '${selector}'로 ${items.length}개 항목 찾음`
                        );
                        break;
                    }
                }

                // 아이템이 없다면 fallback으로 모든 링크 중 소설 관련 링크 검색
                if (novelItems.length === 0) {
                    const allLinks =
                        document.querySelectorAll('a[href*="/novel/"]');
                    novelItems = Array.from(allLinks).filter((link) => {
                        // 부모나 자식 요소에 이미지가 있는 링크만 선택 (소설 카드일 가능성 높음)
                        return (
                            link.querySelector('img') ||
                            link.closest('div')?.querySelector('img')
                        );
                    });
                }

                const results = [];
                for (let i = 0; i < novelItems.length; i++) {
                    try {
                        const item = novelItems[i];

                        // 소설 정보 추출 (다양한 구조 지원)
                        // 제목 찾기
                        let title = '';
                        const titleEl = item.querySelector(
                            '.title, .subject, h3, h4, strong'
                        );
                        if (titleEl) {
                            title = titleEl.textContent.trim();
                        } else if (item.title) {
                            title = item.title.trim();
                        } else if (item.alt) {
                            title = item.alt.trim();
                        } else if (item.textContent) {
                            // 간단한 휴리스틱: 짧은 텍스트는 제목일 가능성 높음
                            const text = item.textContent.trim();
                            if (text.length < 50) title = text;
                        }

                        // 저자 찾기
                        let author = '';
                        const authorEl = item.querySelector(
                            '.author, .writer, .user_name'
                        );
                        if (authorEl) {
                            author = authorEl.textContent.trim();
                        }

                        // 장르 찾기
                        let genre = '';
                        const genreEl = item.querySelector('.genre, .category');
                        if (genreEl) {
                            genre = genreEl.textContent.trim();
                        }

                        // 이미지 찾기
                        let imgSrc = '';
                        const imgElement =
                            item.querySelector('img') ||
                            item.closest('div')?.querySelector('img');
                        if (imgElement) {
                            imgSrc = imgElement.src || '';
                        }

                        // 링크 찾기
                        let link = '';
                        if (item.href) {
                            link = item.href;
                        } else if (item.querySelector('a')) {
                            link = item.querySelector('a').href;
                        } else if (item.closest('a')) {
                            link = item.closest('a').href;
                        }

                        // 상황에 따라 제목 처리
                        if (!title && link) {
                            // URL에서 제목 추출 시도
                            const matches = link.match(/\/novel\/([^\/]+)/);
                            if (matches && matches[1]) {
                                title = decodeURIComponent(matches[1]).replace(
                                    /-/g,
                                    ' '
                                );
                            }
                        }

                        // 제목이 있는 항목만 추가
                        if (title) {
                            // 외부 ID 추출 (URL에서)
                            const externalId = link.split('/').pop() || '';

                            // 객체에 저장
                            results.push({
                                title: title,
                                author: author || '작가 미상',
                                genre: genre || '기타',
                                coverImageUrl: imgSrc,
                                url: link,
                                externalId: externalId,
                                platform: '문피아',
                                description: '', // 기본값 설정
                            });
                        }
                    } catch (err) {
                        console.error('소설 항목 처리 중 오류:', err);
                    }
                }

                return results;
            });

            return novels;
        } catch (error) {
            logger.error(`소설 목록 추출 오류: ${error.message}`);
            return [];
        }
    }

    // munpia.js 파일 수정

    // munpia.js 파일

    // 소설 상세 정보 가져오기 함수
    async getNovelDetail(novelPreview) {
        try {
            logger.info(`소설 상세 정보 가져오기: ${novelPreview.title}`);

            // 소설 상세 페이지로 이동
            await this.navigateTo(novelPreview.url);

            // 페이지 로딩 대기
            await this.delay(2000);

            // 상세 정보 추출
            const details = await this.page.evaluate(() => {
                // 설명 찾기
                let description = '';
                const descSelectors = [
                    '.story_box',
                    '.book_intro',
                    '.synopsis',
                    '.description',
                ];
                for (const selector of descSelectors) {
                    const el = document.querySelector(selector);
                    if (el) {
                        description = el.textContent.trim();
                        break;
                    }
                }

                // 조회수 찾기
                let viewCount = 0;
                const viewSelectors = [
                    '.num_total',
                    '.view_count',
                    '.hit',
                    '.count',
                ];
                for (const selector of viewSelectors) {
                    const el = document.querySelector(selector);
                    if (el) {
                        const text = el.textContent.replace(/[^0-9]/g, '');
                        viewCount = parseInt(text) || 0;
                        break;
                    }
                }

                // 평점 찾기
                let rating = 0;
                const ratingSelectors = [
                    '.total_score',
                    '.rating',
                    '.star_score',
                ];
                for (const selector of ratingSelectors) {
                    const el = document.querySelector(selector);
                    if (el) {
                        const text = el.textContent.replace(/[^0-9.]/g, '');
                        rating = parseFloat(text) || 0;
                        break;
                    }
                }

                return {
                    description: description || '',
                    viewCount: viewCount || 0,
                    rating: rating || 0,
                    isPaid: false, // 기본값
                    price: 0, // 기본값
                };
            });

            return details;
        } catch (error) {
            logger.error(
                `소설 상세 정보 추출 오류 (${novelPreview.title}): ${error.message}`
            );
            // 오류 발생 시 기본값 반환
            return {
                description: '',
                viewCount: 0,
                rating: 0,
                isPaid: false,
                price: 0,
            };
        }
    }
}

module.exports = MunpiaCrawler;
