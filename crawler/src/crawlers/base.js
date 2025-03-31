const { createPage } = require('../utils/browser');
const logger = require('../config/logger');
const database = require('../utils/database');
const config = require('../config/config');

class BaseCrawler {
    constructor(platform) {
        this.platform = platform;
        this.baseUrl = config.platforms[platform]?.baseUrl;
        this.retryCount = config.crawler.retryCount;
        this.requestDelay = config.crawler.requestDelay;
    }

    async initialize() {
        logger.info(`${this.platform} 크롤러 초기화 중`);
        this.page = await createPage();
        this.connection = await database.getConnection();

        await this.logCrawlingStart();
    }

    // 인간의 행동 흉내내기
    async simulateHumanBehavior() {
        // 랜덤 스크롤
        const scrollSteps = Math.floor(Math.random() * 3) + 2; // 2-4회 스크롤

        for (let i = 0; i < scrollSteps; i++) {
            const scrollY = Math.floor(Math.random() * 500) + 300; // 300-800px 스크롤
            await this.page.evaluate((scrollY) => {
                window.scrollBy(0, scrollY);
            }, scrollY);

            // 스크롤 간 지연 - waitForTimeout 대신 setTimeout 사용
            await new Promise((resolve) =>
                setTimeout(resolve, Math.floor(Math.random() * 500) + 200)
            );
        }
    }

    // Promise 기반 타임아웃 - waitForTimeout 대체
    async delay(ms) {
        return new Promise((resolve) =>
            setTimeout(resolve, ms || this.requestDelay)
        );
    }

    async navigateTo(url, waitForSelector) {
        let retries = 0;
        const maxRetries = this.retryCount + 2; // 추가 재시도 횟수

        while (retries < maxRetries) {
            try {
                logger.info(`페이지 이동: ${url}`);

                // 무작위 지연 추가 (봇 감지 회피)
                const randomDelay = Math.floor(Math.random() * 1000) + 1000;
                await new Promise((resolve) =>
                    setTimeout(resolve, randomDelay)
                );

                // 네트워크 타임아웃 증가
                await this.page.goto(url, {
                    waitUntil: 'networkidle2', // 네트워크 요청이 2개 이하로 줄어들 때까지 대기
                    timeout: 60000, // 1분으로 타임아웃 증가
                });

                // 더 자연스러운 사용자 행동 흉내내기 - 스크롤
                await this.simulateHumanBehavior();

                if (waitForSelector) {
                    await this.page.waitForSelector(waitForSelector, {
                        timeout: 20000, // 20초로 증가
                    });
                } else {
                    // 기본 대기 시간 추가
                    await new Promise((resolve) => setTimeout(resolve, 3000));
                }

                return true;
            } catch (error) {
                retries++;
                logger.error(
                    `페이지 이동 오류 (시도 ${retries}/${maxRetries}): ${error.message}`
                );

                if (retries >= maxRetries) {
                    // 최대 시도 횟수에 도달했을 때
                    if (
                        error.message.includes('ERR_NAME_NOT_RESOLVED') ||
                        error.message.includes('ERR_CONNECTION_RESET') ||
                        error.message.includes('ERR_NETWORK_CHANGED')
                    ) {
                        logger.warn(`네트워크 문제로 인해 건너뜁니다: ${url}`);
                        return false; // 성공하지 못했음을 알림
                    }
                    throw error;
                }

                // 네트워크 오류에 따라 지연 시간 조정
                const backoffDelay = this.requestDelay * Math.pow(2, retries);
                await new Promise((resolve) =>
                    setTimeout(resolve, backoffDelay)
                );
            }
        }
    }
    // 인간의 행동 흉내내기
    async simulateHumanBehavior() {
        // 랜덤 스크롤
        const scrollSteps = Math.floor(Math.random() * 3) + 2; // 2-4회 스크롤

        for (let i = 0; i < scrollSteps; i++) {
            const scrollY = Math.floor(Math.random() * 500) + 300; // 300-800px 스크롤
            await this.page.evaluate((scrollY) => {
                window.scrollBy(0, scrollY);
            }, scrollY);

            // 스크롤 간 지연
            await this.delay(Math.floor(Math.random() * 500) + 200);
        }
    }

    async logCrawlingStart() {
        const [result] = await this.connection.execute(
            'INSERT INTO crawler_logs (platform_name, start_time, status) VALUES (?, NOW(), ?)',
            [this.platform, 'IN_PROGRESS']
        );
        this.crawlLogId = result.insertId;
        logger.info(
            `${this.platform} 크롤링 시작 (로그 ID: ${this.crawlLogId})`
        );
    }

    async logCrawlingEnd(
        status,
        novelsFetched,
        chaptersUpdated,
        errorMessage = null
    ) {
        await this.connection.execute(
            'UPDATE crawler_logs SET end_time = NOW(), status = ?, novels_fetched = ?, chapters_updated = ?, error_message = ? WHERE id = ?',
            [
                status,
                novelsFetched,
                chaptersUpdated,
                errorMessage,
                this.crawlLogId,
            ]
        );
        logger.info(`${this.platform} 크롤링 완료, 상태: ${status}`);
    }

    // base.js 파일

    async saveNovel(novelData) {
        try {
            // 트랜잭션 시작
            await this.connection.beginTransaction();

            // 디버깅 로그
            logger.debug(
                `saveNovel 시작 - 데이터: ${JSON.stringify(novelData)}`
            );

            // NULL 대신 기본값 설정으로 오류 방지 (안전한 데이터 객체 생성)
            const safeData = {
                title: novelData.title || ' ',
                author: novelData.author || '작가 미상',
                description: novelData.description || '',
                coverImageUrl: novelData.coverImageUrl || '',
                status: novelData.status || 'ONGOING',
                popularity: novelData.popularity || 0,
                externalId: novelData.externalId || '',
                url: novelData.url || '',
                viewCount: novelData.viewCount || 0,
                rating: novelData.rating || 0,
                reviewCount: novelData.reviewCount || 0,
                isPaid: novelData.isPaid ? 1 : 0,
                price: novelData.price || 0,
                platformGenre: novelData.platformGenre || '',
                genres: novelData.genres || [],
            };

            // 정규화된 제목과 작가명 생성
            const normalizedTitle = this.normalizeText(safeData.title);
            const normalizedAuthor = this.normalizeText(safeData.author);

            logger.debug(
                `정규화된 제목: ${normalizedTitle}, 작가: ${normalizedAuthor}`
            );

            // 기존 소설 확인
            const [novels] = await this.connection.execute(
                'SELECT id FROM novels WHERE normalized_title = ? AND normalized_author = ?',
                [normalizedTitle, normalizedAuthor]
            );

            let novelId;

            if (novels.length > 0) {
                // 기존 소설 업데이트
                novelId = novels[0].id;
                logger.debug(`기존 소설 발견 (ID: ${novelId}), 업데이트 시작`);

                await this.connection.execute(
                    `UPDATE novels SET 
                description = ?,
                cover_image_url = ?,
                status = ?,
                popularity = ?,
                last_crawled_at = NOW()
              WHERE id = ?`,
                    [
                        safeData.description,
                        safeData.coverImageUrl,
                        safeData.status,
                        safeData.popularity,
                        novelId,
                    ]
                );

                logger.debug(`소설 기본 정보 업데이트 완료`);
            } else {
                // 새 소설 생성
                logger.debug(`새 소설 생성 시작`);

                const [result] = await this.connection.execute(
                    `INSERT INTO novels (
                title, normalized_title, author, normalized_author, 
                description, cover_image_url, status, popularity,
                last_crawled_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        safeData.title,
                        normalizedTitle,
                        safeData.author,
                        normalizedAuthor,
                        safeData.description,
                        safeData.coverImageUrl,
                        safeData.status,
                        safeData.popularity,
                    ]
                );

                novelId = result.insertId;
                logger.debug(`새 소설 생성 완료 (ID: ${novelId})`);

                // 장르 처리
                if (safeData.genres && safeData.genres.length > 0) {
                    logger.debug(
                        `장르 처리 시작: ${safeData.genres.join(', ')}`
                    );

                    for (const genreName of safeData.genres) {
                        const normalizedGenre = this.normalizeText(genreName);

                        // 장르 찾기 또는 생성
                        const [genres] = await this.connection.execute(
                            'SELECT id FROM genres WHERE normalized_name = ?',
                            [normalizedGenre]
                        );

                        let genreId;
                        if (genres.length > 0) {
                            genreId = genres[0].id;
                            logger.debug(
                                `기존 장르 발견: ${genreName} (ID: ${genreId})`
                            );
                        } else {
                            const [genreResult] = await this.connection.execute(
                                'INSERT INTO genres (name, normalized_name) VALUES (?, ?)',
                                [genreName, normalizedGenre]
                            );
                            genreId = genreResult.insertId;
                            logger.debug(
                                `새 장르 생성: ${genreName} (ID: ${genreId})`
                            );
                        }

                        // 소설-장르 연결
                        await this.connection.execute(
                            'INSERT INTO novel_genres (novel_id, genre_id) VALUES (?, ?)',
                            [novelId, genreId]
                        );
                    }

                    logger.debug(`장르 처리 완료`);
                }
            }

            // 플랫폼 정보 추가
            logger.debug(`플랫폼 정보 처리 시작: ${this.platform}`);

            const [platforms] = await this.connection.execute(
                'SELECT id FROM platform_infos WHERE novel_id = ? AND platform_name = ?',
                [novelId, this.platform]
            );

            if (platforms.length > 0) {
                logger.debug(
                    `기존 플랫폼 정보 업데이트 (ID: ${platforms[0].id})`
                );

                await this.connection.execute(
                    `UPDATE platform_infos SET 
                external_id = ?, url = ?, view_count = ?, 
                rating = ?, review_count = ?, is_paid = ?,
                price = ?, platform_genre = ?, last_update_at = NOW()
              WHERE id = ?`,
                    [
                        safeData.externalId,
                        safeData.url,
                        safeData.viewCount,
                        safeData.rating,
                        safeData.reviewCount,
                        safeData.isPaid,
                        safeData.price,
                        safeData.platformGenre,
                        platforms[0].id,
                    ]
                );
            } else {
                logger.debug(`새 플랫폼 정보 생성`);

                await this.connection.execute(
                    `INSERT INTO platform_infos (
                novel_id, platform_name, external_id, url,
                view_count, rating, review_count, is_paid,
                price, platform_genre, last_update_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                        novelId,
                        this.platform,
                        safeData.externalId,
                        safeData.url,
                        safeData.viewCount,
                        safeData.rating,
                        safeData.reviewCount,
                        safeData.isPaid,
                        safeData.price,
                        safeData.platformGenre,
                    ]
                );
            }

            logger.debug(`플랫폼 정보 처리 완료`);

            // 트랜잭션 커밋
            await this.connection.commit();
            logger.debug(`트랜잭션 커밋 완료`);

            return novelId;
        } catch (error) {
            // 오류 발생 시 롤백
            logger.error(`saveNovel 오류: ${error.message}`);
            logger.error(`오류 스택: ${error.stack}`);

            try {
                await this.connection.rollback();
                logger.debug(`트랜잭션 롤백 완료`);
            } catch (rollbackError) {
                logger.error(`롤백 오류: ${rollbackError.message}`);
            }

            throw error;
        }
    }

    async updateNovel(novelId, novelData) {
        // 소설 정보 업데이트 로직 구현
        await this.connection.execute(
            `UPDATE novels SET 
        description = COALESCE(?, description),
        cover_image_url = COALESCE(?, cover_image_url),
        status = COALESCE(?, status),
        popularity = COALESCE(?, popularity),
        last_crawled_at = NOW()
      WHERE id = ?`,
            [
                novelData.description,
                novelData.coverImageUrl,
                novelData.status,
                novelData.popularity,
                novelId,
            ]
        );

        logger.info(`소설 업데이트 완료: ${novelData.title} (ID: ${novelId})`);
        return novelId;
    }

    async saveChapters(novelId, chapters) {
        let chaptersUpdated = 0;

        for (const chapter of chapters) {
            try {
                // 기존 챕터 확인
                const [existingChapters] = await this.connection.execute(
                    'SELECT id FROM chapters WHERE novel_id = ? AND chapter_number = ?',
                    [novelId, chapter.chapterNumber]
                );

                let chapterId;

                if (existingChapters.length > 0) {
                    // 기존 챕터 업데이트
                    chapterId = existingChapters[0].id;
                    await this.connection.execute(
                        `UPDATE chapters SET 
              title = ?,
              external_id = ?,
              publish_date = ?,
              is_paid = ?,
              price = ?,
              last_crawled_at = NOW()
            WHERE id = ?`,
                        [
                            chapter.title,
                            chapter.externalId || '',
                            chapter.publishDate,
                            chapter.isPaid ? 1 : 0,
                            chapter.price || 0,
                            chapterId,
                        ]
                    );
                } else {
                    // 새 챕터 추가
                    const [result] = await this.connection.execute(
                        `INSERT INTO chapters (
              novel_id, title, chapter_number, external_id,
              publish_date, is_paid, price, last_crawled_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                        [
                            novelId,
                            chapter.title,
                            chapter.chapterNumber,
                            chapter.externalId || '',
                            chapter.publishDate,
                            chapter.isPaid ? 1 : 0,
                            chapter.price || 0,
                        ]
                    );

                    chapterId = result.insertId;
                }

                // 챕터 플랫폼 링크 추가
                if (chapter.url) {
                    await this.connection.execute(
                        'INSERT INTO chapter_platform_links (chapter_id, platform, url) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE url = ?',
                        [chapterId, this.platform, chapter.url, chapter.url]
                    );
                }

                chaptersUpdated++;
            } catch (error) {
                logger.error(`챕터 저장 오류: ${error.message}`);
            }
        }

        return chaptersUpdated;
    }

    normalizeText(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w\s가-힣]/g, '')
            .trim();
    }

    async cleanup() {
        if (this.page) {
            await this.page.close();
        }

        if (this.connection) {
            this.connection.release();
        }
    }
}

module.exports = BaseCrawler;
