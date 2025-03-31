// munpia.js - 문피아 웹소설 크롤러 개선
const BaseCrawler = require('./base');
const logger = require('../config/logger');
const config = require('../config/config');

class MunpiaCrawler extends BaseCrawler {
    constructor() {
        super('munpia');
        this.baseUrl = `${this.baseUrl || 'https://www.munpia.com'}`;
        this.bestUrl = `${this.baseUrl}/page/best`;
        this.freeUrl = `${this.baseUrl}/free`;
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

            if (debug) {
                await this.page.screenshot({ path: 'debug_munpia_home.png' });
                logger.info('디버깅 모드: 홈페이지 스크린샷 저장됨');
            }

            // 크롤링 통계 초기화
            let novelsFetched = 0;
            let chaptersUpdated = 0;

            logger.info('문피아 베스트 페이지 크롤링 시작');

            // 베스트 페이지로 이동
            await this.navigateTo(this.bestUrl);

            // waitForTimeout 대신 setTimeout 사용
            await new Promise((resolve) => setTimeout(resolve, 3000));

            if (debug) {
                await this.page.screenshot({ path: 'debug_munpia_best.png' });
                logger.info('디버깅 모드: 베스트 페이지 스크린샷 저장됨');
            }

            // 베스트 소설 목록 가져오기
            const bestNovels = await this.getBestNovelsList();
            logger.info(
                `문피아 베스트에서 ${bestNovels.length}개의 소설을 찾았습니다`
            );

            // 각 소설 처리
            for (const novelPreview of bestNovels) {
                try {
                    // 소설 상세 정보 가져오기
                    let novelDetail = {};
                    if (novelPreview.url) {
                        novelDetail = await this.getNovelDetail(novelPreview);
                    }

                    // 저장할 데이터 객체 - undefined 값 방지를 위한 기본값 설정
                    const safeData = {
                        title: novelPreview.title || '제목 없음',
                        author: novelPreview.author || '작가 미상',
                        genre: novelPreview.genre || '기타',
                        coverImageUrl: novelPreview.coverImageUrl || '',
                        url: novelPreview.url || '',
                        externalId: novelPreview.externalId || '',
                        platform: this.platform,
                        description: novelDetail.description || '',
                        viewCount: novelDetail.viewCount || 0,
                        rating: novelDetail.rating || 0,
                        reviewCount: novelDetail.reviewCount || 0,
                        isPaid: novelDetail.isPaid || false,
                        price: novelDetail.price || 0,
                        platformGenre: novelPreview.genre || '',
                        status: 'ONGOING',
                        popularity: novelDetail.viewCount || 0,
                    };

                    // 소설 저장
                    const novelId = await this.saveNovel(safeData);
                    logger.info(
                        `소설 저장 완료: ${safeData.title} (ID: ${novelId})`
                    );
                    novelsFetched++;

                    // waitForTimeout 대신 setTimeout 사용
                    await new Promise((resolve) =>
                        setTimeout(resolve, 2000 + Math.random() * 1000)
                    );
                } catch (error) {
                    logger.error(
                        `소설 "${novelPreview.title}" 처리 중 오류: ${error.message}`
                    );
                    continue;
                }
            }

            // 크롤링 완료 로그 업데이트
            await this.logCrawlingEnd(
                'COMPLETED',
                novelsFetched,
                chaptersUpdated
            );
        } catch (error) {
            logger.error(`문피아 크롤링 실패: ${error.message}`);
            await this.logCrawlingEnd('FAILED', 0, 0, error.message);
        } finally {
            await this.cleanup();
        }
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

    async getNovelDetail(novelPreview) {
        try {
            logger.info(`소설 상세 정보 가져오기: ${novelPreview.title}`);

            // 소설 상세 페이지로 이동
            await this.navigateTo(novelPreview.url);

            // waitForTimeout 대신 setTimeout 사용
            await new Promise((resolve) => setTimeout(resolve, 2000));

            // 상세 정보 추출
            const details = await this.page.evaluate(() => {
                // 설명 찾기 (여러 선택자 시도)
                let description = '';
                const descSelectors = [
                    '.story_box',
                    '.book_intro',
                    '.synopsis',
                    '.description',
                    '.summary',
                    '#bookIntro',
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
                    '.score',
                ];
                for (const selector of ratingSelectors) {
                    const el = document.querySelector(selector);
                    if (el) {
                        const text = el.textContent.replace(/[^0-9.]/g, '');
                        rating = parseFloat(text) || 0;
                        break;
                    }
                }

                // 리뷰수 찾기
                let reviewCount = 0;
                const reviewSelectors = [
                    '.count_cmt',
                    '.review_count',
                    '.comment_count',
                ];
                for (const selector of reviewSelectors) {
                    const el = document.querySelector(selector);
                    if (el) {
                        const text = el.textContent.replace(/[^0-9]/g, '');
                        reviewCount = parseInt(text) || 0;
                        break;
                    }
                }

                // 유료 여부 및 가격
                let isPaid = false;
                let price = 0;

                const priceSelectors = [
                    '.price_info',
                    '.coin_info',
                    '.payment',
                ];
                for (const selector of priceSelectors) {
                    if (document.querySelector(selector)) {
                        isPaid = true;
                        break;
                    }
                }

                const priceNumberSelectors = [
                    '.price_num',
                    '.coin_num',
                    '.price',
                ];
                for (const selector of priceNumberSelectors) {
                    const el = document.querySelector(selector);
                    if (el) {
                        const text = el.textContent.replace(/[^0-9]/g, '');
                        price = parseInt(text) || 0;
                        break;
                    }
                }

                // 기본값 설정으로 undefined 방지
                return {
                    description: description || '',
                    viewCount: viewCount || 0,
                    rating: rating || 0,
                    reviewCount: reviewCount || 0,
                    isPaid: isPaid || false,
                    price: price || 0,
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
                reviewCount: 0,
                isPaid: false,
                price: 0,
            };
        }
    }
}

module.exports = MunpiaCrawler;
