<template>
    <div class="munpia-dashboard">
        <h1>문피아 웹소설 대시보드</h1>

        <div class="action-panel">
            <button
                @click="triggerCrawling"
                :disabled="isCrawling"
                class="crawl-button"
            >
                <span v-if="isCrawling">크롤링 진행 중...</span>
                <span v-else>문피아 크롤링 시작</span>
            </button>

            <button
                @click="fetchNovels"
                :disabled="loading"
                class="refresh-button"
            >
                <span v-if="loading">데이터 로딩 중...</span>
                <span v-else>데이터 새로고침</span>
            </button>
        </div>

        <div class="debug-panel">
            <h3>크롤링 로그</h3>
            <div class="log-container">
                <div
                    v-for="(log, index) in crawlingLogs"
                    :key="index"
                    :class="['log-entry', log.type]"
                >
                    <span class="log-time">{{ formatTime(log.time) }}</span>
                    <span class="log-message">{{ log.message }}</span>
                </div>
                <div v-if="crawlingLogs.length === 0" class="no-logs">
                    크롤링을 시작하면 여기에 로그가 표시됩니다.
                </div>
            </div>
        </div>

        <div class="result-section">
            <h2>크롤링된 웹소설 ({{ novels.length }})</h2>

            <div v-if="loading" class="loading">데이터를 불러오는 중...</div>

            <div v-else-if="error" class="error">
                {{ error }}
            </div>

            <div
                v-if="novels.length === 0 && !loading && !error"
                class="no-data"
            >
                <div class="empty-state">
                    <!-- 이미지 태그 제거 -->
                    <h3>소설 데이터가 없습니다</h3>
                    <p>
                        아직 크롤링된 소설 데이터가 없습니다. 크롤링을
                        시작해보세요.
                    </p>
                    <button @click="triggerCrawling" class="primary-btn">
                        크롤링 시작하기
                    </button>
                </div>
            </div>

            <div class="novel-grid">
                <div v-for="novel in novels" :key="novel.id" class="novel-card">
                    <div class="cover-container">
                        <img
                            :src="
                                novel.cover_image_url ||
                                '/placeholder-cover.png'
                            "
                            :alt="novel.title"
                            class="cover-image"
                            @error="handleImageError"
                        />
                    </div>
                    <div class="novel-info">
                        <h3 class="title" :title="novel.title">
                            {{ novel.title }}
                        </h3>
                        <p class="author">{{ novel.author }}</p>

                        <div
                            class="genres"
                            v-if="novel.genres && novel.genres.length"
                        >
                            <span
                                v-for="(genre, index) in novel.genres"
                                :key="index"
                                class="genre-tag"
                            >
                                {{ genre }}
                            </span>
                        </div>

                        <div class="stats">
                            <span v-if="novel.rating" class="rating">
                                <i class="icon-star"></i>
                                {{ novel.rating.toFixed(1) }}
                            </span>
                            <span v-if="novel.view_count" class="views">
                                <i class="icon-eye"></i>
                                {{ formatNumber(novel.view_count) }}
                            </span>
                        </div>

                        <div class="actions">
                            <a
                                :href="novel.url"
                                target="_blank"
                                class="view-btn"
                                >원작 보기</a
                            >
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import axios from 'axios';

export default {
    name: 'MunpiaDashboard',
    data() {
        return {
            novels: [],
            loading: false,
            error: null,
            isCrawling: false,
            crawlingStatus: null,
            lastCrawled: null,
            crawlingLogs: [],

            // 페이지네이션 관련 상태
            currentPage: 1,
            pageSize: 20,

            // 상태 체크를 위한 타이머
            statusCheckInterval: null,
            lastCheckedStatus: null,
        };
    },
    computed: {
        statusClass() {
            if (!this.crawlingStatus) return '';

            const status = this.crawlingStatus.toLowerCase();
            if (status.includes('완료') || status.includes('completed'))
                return 'status-success';
            if (status.includes('진행') || status.includes('progress'))
                return 'status-progress';
            if (status.includes('실패') || status.includes('failed'))
                return 'status-error';
            return '';
        },

        // 페이지네이션 계산
        totalPages() {
            return Math.ceil(this.novels.length / this.pageSize);
        },

        // 현재 페이지에 표시할 소설 목록
        paginatedNovels() {
            const start = (this.currentPage - 1) * this.pageSize;
            const end = start + this.pageSize;
            return this.novels.slice(start, end);
        },

        // 표시할 페이지 번호 목록
        displayedPages() {
            const pages = [];
            const maxPages = 5; // 표시할 최대 페이지 번호 수

            let startPage = Math.max(
                1,
                this.currentPage - Math.floor(maxPages / 2)
            );
            let endPage = startPage + maxPages - 1;

            if (endPage > this.totalPages) {
                endPage = this.totalPages;
                startPage = Math.max(1, endPage - maxPages + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }

            return pages;
        },
    },
    mounted() {
        // 컴포넌트 마운트 시 소설 목록 로드
        this.fetchNovels();

        // 크롤링 상태 확인
        this.checkCrawlingStatus();
    },
    beforeUnmount() {
        // 컴포넌트 제거 시 타이머 정리
        this.clearStatusCheckInterval();
    },
    methods: {
        // 크롤링 시작
        async startCrawling() {
            try {
                this.isCrawling = true;
                this.addLog('info', '문피아 크롤링 작업 시작 요청...');

                // 백엔드 API를 통한 호출로 수정
                const response = await axios.post(
                    'http://localhost:8080/api/crawler/trigger/munpia'
                );

                this.addLog(
                    'success',
                    `크롤링 요청 성공: ${
                        response.data || '크롤링이 시작되었습니다.'
                    }`
                );

                // 크롤링 상태 모니터링 시작
                this.startStatusChecking();
            } catch (error) {
                console.error('크롤링 시작 실패:', error);
                this.addLog('error', `크롤링 요청 실패: ${error.message}`);
                this.isCrawling = false;
            }
        },

        // 상태 체크 간격 시작
        startStatusChecking() {
            // 기존 인터벌 정리
            this.clearStatusCheckInterval();

            // 5초마다 상태 확인
            this.statusCheckInterval = setInterval(() => {
                this.checkCrawlingStatus();
            }, 5000);
        },

        // 상태 체크 간격 정리
        clearStatusCheckInterval() {
            if (this.statusCheckInterval) {
                clearInterval(this.statusCheckInterval);
                this.statusCheckInterval = null;
            }
        },

        // 크롤링 상태 확인
        async checkCrawlingStatus() {
            try {
                const response = await axios.get(
                    'http://localhost:8080/api/crawler/status'
                );
                const logs = response.data;

                if (logs && logs.length > 0) {
                    // 문피아 플랫폼 로그 찾기
                    const munpiaLog = logs.find(
                        (log) => log.platform_name.toLowerCase() === 'munpia'
                    );

                    if (munpiaLog) {
                        // 상태 업데이트
                        const prevStatus = this.crawlingStatus;
                        let status = munpiaLog.status;

                        // 상태 변경 시 로그 추가
                        if (status !== prevStatus) {
                            let statusText = '';

                            switch (status) {
                                case 'COMPLETED':
                                    statusText = '완료됨';
                                    this.addLog(
                                        'success',
                                        `크롤링 완료! ${
                                            munpiaLog.novels_fetched || 0
                                        }개의 소설이 수집되었습니다.`
                                    );
                                    this.isCrawling = false;
                                    this.fetchNovels(); // 결과 불러오기
                                    this.clearStatusCheckInterval(); // 모니터링 중지
                                    break;
                                case 'IN_PROGRESS':
                                    statusText = '진행 중';
                                    this.addLog(
                                        'info',
                                        '크롤링이 진행 중입니다...'
                                    );
                                    break;
                                case 'FAILED':
                                    statusText = '실패';
                                    this.addLog(
                                        'error',
                                        `크롤링 실패: ${
                                            munpiaLog.error_message ||
                                            '알 수 없는 오류'
                                        }`
                                    );
                                    this.isCrawling = false;
                                    this.clearStatusCheckInterval(); // 모니터링 중지
                                    break;
                                default:
                                    statusText = status;
                            }

                            this.crawlingStatus = statusText;
                        }

                        // 마지막 크롤링 시간 설정
                        if (munpiaLog.end_time) {
                            this.lastCrawled = new Date(munpiaLog.end_time);
                        }
                    }
                }
            } catch (error) {
                console.error('크롤링 상태 확인 실패:', error);
                this.addLog('error', `상태 확인 실패: ${error.message}`);
            }
        },

        // 소설 목록 가져오기
        async fetchNovels() {
            try {
                this.loading = true;
                this.addLog('info', '문피아 소설 데이터 로드 중...');

                const response = await axios.get(
                    'http://localhost:8080/api/novels/platform/munpia'
                );

                // API 응답 구조에 유연하게 대응
                this.novels = response.data.novels || response.data || [];
                this.error = null;

                // 데이터가 있는 경우 페이지네이션 초기화
                if (this.novels.length > 0) {
                    this.currentPage = 1;
                }

                this.addLog(
                    'success',
                    `${this.novels.length}개의 소설 데이터 로드 완료`
                );
            } catch (error) {
                console.error('소설 데이터를 불러오는데 실패했습니다:', error);
                this.error =
                    '소설 데이터를 불러오는데 실패했습니다. 다시 시도해주세요.';
                this.addLog('error', `데이터 로드 실패: ${error.message}`);
            } finally {
                this.loading = false;
            }
        },

        // 소설 페이지 열기 메서드
        openNovelPage(url) {
            if (url) {
                // 새 탭에서 열기
                window.open(url, '_blank');
            } else {
                // URL이 없는 경우 알림
                this.addLog('error', '이 소설의 원본 URL 정보가 없습니다.');
            }
        },

        // 페이지 변경
        changePage(page) {
            if (page >= 1 && page <= this.totalPages) {
                this.currentPage = page;
                // 페이지 상단으로 스크롤
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        },

        // 페이지 크기 변경 시 페이지네이션 업데이트
        updatePagination() {
            this.currentPage = 1; // 첫 페이지로 리셋
        },

        // 로그 추가
        addLog(type, message) {
            this.crawlingLogs.unshift({
                type,
                message,
                time: new Date(),
            });

            // 로그가 너무 많아지면 오래된 것 제거
            if (this.crawlingLogs.length > 100) {
                this.crawlingLogs = this.crawlingLogs.slice(0, 100);
            }

            console.log(`[${type}] ${message}`);
        },

        // 이미지 로드 오류 처리
        handleImageError(e) {
            e.target.src = '/placeholder-cover.png';
        },

        // 숫자 포맷팅
        formatNumber(num) {
            if (!num) return '0';
            return num > 10000
                ? (num / 10000).toFixed(1) + '만'
                : num.toLocaleString();
        },

        // 날짜 포맷팅
        formatDate(date) {
            if (!date) return '';
            return new Date(date).toLocaleString();
        },

        // 시간 포맷팅
        formatTime(date) {
            if (!date) return '';
            return new Date(date).toLocaleTimeString();
        },
    },
};
</script>

<style scoped>
.munpia-dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

h1,
h2,
h3 {
    color: #333;
    text-align: center;
}

h1 {
    margin-bottom: 30px;
}

h2 {
    margin: 30px 0 20px;
}

.action-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 30px;
    padding: 20px;
    background: #f9f9f9;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.crawl-button,
.refresh-button {
    padding: 12px 24px;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
    margin: 5px;
    min-width: 200px;
}

.refresh-button {
    background-color: #2ecc71;
}

.crawl-button:hover:not(:disabled),
.refresh-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.crawl-button:hover:not(:disabled) {
    background-color: #2980b9;
}

.refresh-button:hover:not(:disabled) {
    background-color: #27ae60;
}

.crawl-button:disabled,
.refresh-button:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
}

.status-display {
    margin-top: 15px;
    text-align: center;
}

.status-success {
    color: #27ae60;
    font-weight: bold;
}

.status-error {
    color: #e74c3c;
    font-weight: bold;
}

.status-progress {
    color: #f39c12;
    font-weight: bold;
}

.debug-panel {
    margin-bottom: 30px;
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
}

.debug-panel h3 {
    margin: 0;
    padding: 10px;
    background: #f0f0f0;
    border-bottom: 1px solid #ddd;
}

.log-container {
    height: 200px;
    overflow-y: auto;
    padding: 10px;
    background: #f8f8f8;
    font-family: monospace;
    font-size: 14px;
}

.log-entry {
    margin-bottom: 4px;
    padding: 4px;
    border-radius: 3px;
}

.log-time {
    color: #666;
    margin-right: 10px;
}

.log-entry.info {
    background-color: #e8f4f8;
}

.log-entry.success {
    background-color: #e8f8e8;
    color: #27ae60;
}

.log-entry.error {
    background-color: #f8e8e8;
    color: #e74c3c;
}

.no-logs {
    color: #888;
    font-style: italic;
    text-align: center;
    padding: 20px;
}

/* 소설 그리드 스타일 */
.novel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
}

.novel-card {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s, box-shadow 0.3s;
    background: white;
    cursor: pointer;
}

.novel-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}

.cover-container {
    height: 250px;
    overflow: hidden;
}

.cover-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.novel-info {
    padding: 15px;
}

.title {
    font-size: 16px;
    font-weight: bold;
    margin-bottom: 5px;
    line-height: 1.3;
    height: 42px;
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
}

.author {
    color: #666;
    font-size: 14px;
    margin-bottom: 8px;
}

.genres {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 8px;
}

.genre-tag {
    background: #f0f0f0;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 12px;
}

.stats {
    display: flex;
    justify-content: space-between;
    margin-top: auto;
    color: #666;
    font-size: 13px;
}

.icon-star::before {
    content: '★';
    color: #f1c40f;
}

.icon-eye::before {
    content: '👁';
}

.loading,
.error,
.no-data {
    text-align: center;
    margin: 50px 0;
    padding: 20px;
    background: #f9f9f9;
    border-radius: 8px;
}

.error {
    color: #e74c3c;
}

/* 빈 상태 스타일 */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    margin: 20px 0;
    background-color: #f8f9fa;
    border-radius: 8px;
    text-align: center;
}

.empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
    color: #6c757d;
}

.empty-state h3 {
    font-size: 24px;
    margin-bottom: 8px;
    color: #343a40;
}

.empty-state p {
    color: #6c757d;
    margin-bottom: 20px;
    max-width: 400px;
}

.primary-btn {
    padding: 10px 20px;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    transition: background-color 0.3s;
}

.primary-btn:hover {
    background-color: #2980b9;
}

/* 링크 버튼 스타일 */
.novel-link {
    margin-top: 15px;
    text-align: center;
}

.link-button {
    display: inline-block;
    padding: 8px 16px;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    text-decoration: none;
    font-size: 14px;
    transition: background-color 0.3s;
}

.link-button:hover {
    background-color: #2980b9;
}

/* 페이지네이션 스타일 */
.pagination-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 20px 0;
}

.pagination-controls.bottom {
    margin-top: 30px;
}

.page-size {
    display: flex;
    align-items: center;
}

.page-size select {
    margin-left: 10px;
    padding: 5px 10px;
    border-radius: 4px;
    border: 1px solid #ddd;
}

.page-navigation {
    display: flex;
    align-items: center;
    gap: 10px;
}

.page-btn {
    padding: 5px 15px;
    background-color: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
    background-color: #e9ecef;
}

.page-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.page-info {
    font-size: 14px;
    color: #6c757d;
}

.page-numbers {
    display: flex;
    gap: 5px;
}

.page-number {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
}

.page-number.active {
    background-color: #3498db;
    color: white;
    border-color: #3498db;
}

@media (max-width: 768px) {
    .novel-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }

    .cover-container {
        height: 220px;
    }

    .title {
        font-size: 14px;
        height: 36px;
    }

    .pagination-controls {
        flex-direction: column;
        gap: 10px;
    }
}
</style>
