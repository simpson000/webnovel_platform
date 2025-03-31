<template>
    <div class="munpia-dashboard">
        <h1>문피아 웹소설 대시보드</h1>

        <div class="action-panel">
            <button
                @click="startCrawling"
                :disabled="isCrawling"
                class="crawl-button"
            >
                <span v-if="isCrawling">크롤링 진행 중...</span>
                <span v-else>문피아 크롤링 시작</span>
            </button>

            <div class="status-display" v-if="crawlingStatus">
                <p>
                    상태: <span :class="statusClass">{{ crawlingStatus }}</span>
                </p>
                <p v-if="lastCrawled">
                    마지막 크롤링: {{ formatDate(lastCrawled) }}
                </p>
            </div>
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

            <div v-else-if="novels.length === 0" class="no-data">
                소설 데이터가 없습니다. 크롤링을 실행해 주세요.
            </div>

            <div v-else class="novel-grid">
                <div
                    v-for="novel in novels"
                    :key="novel.id"
                    class="novel-card"
                    @click="openNovelPage(novel.url)"
                >
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
                        <h3 class="title">{{ novel.title }}</h3>
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
                        <div class="novel-link">
                            <a
                                :href="novel.url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="link-button"
                                @click.stop
                            >
                                원작 보기
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import axios from 'axios';
import api from '@/api'; // 또는 정확한 경로

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
            // 상태 체크를 위한 타이머
            statusCheckInterval: null,
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

                // 백엔드 API 호출하여 크롤링 시작
                const response = await axios.post(
                    'http://localhost:3001/api/crawl/munpia?debug=true'
                );

                this.addLog(
                    'success',
                    `크롤링 요청 성공: ${
                        response.data.message || '크롤링이 시작되었습니다.'
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
                    'http://localhost:3001/api/status'
                );

                if (response.data && response.data.length > 0) {
                    // 문피아 플랫폼 로그 찾기
                    const munpiaLog = response.data.find(
                        (log) => log.platform_name.toLowerCase() === 'munpia'
                    );

                    if (munpiaLog) {
                        // 상태 업데이트
                        const status = munpiaLog.status;
                        const prevStatus = this.crawlingStatus;

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

                const response = await api.getMunpiaNovels();

                console.log('API 응답:', response.data); // 실제 응답 구조 확인

                // API 응답 구조에 맞게 처리
                this.novels = response.data.novels || response.data || [];
                this.error = null;

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

        // 소설 페이지 열기 메서드 추가
        openNovelPage(url) {
            if (url) {
                // 새 탭에서 열기
                window.open(url, '_blank');
            } else {
                // URL이 없는 경우 알림
                this.addLog('error', '이 소설의 원본 URL 정보가 없습니다.');
            }
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

.crawl-button {
    padding: 12px 24px;
    background-color: #3498db;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
}

.crawl-button:hover:not(:disabled) {
    background-color: #2980b9;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.crawl-button:disabled {
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

.novel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 20px;
}

.novel-card {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: white;
    cursor: pointer;
    transition: transform 0.3s, box-shadow 0.3s;
}

.novel-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
}
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

.cover-container {
    height: 270px;
    overflow: hidden;
}

.cover-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.novel-info {
    padding: 15px;
    flex-grow: 1;
    display: flex;
    flex-direction: column;
}

.title {
    font-size: 16px;
    margin-bottom: 5px;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    overflow: hidden;
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

@media (max-width: 768px) {
    .novel-grid {
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    }

    .cover-container {
        height: 220px;
    }

    .title {
        font-size: 14px;
    }

    .log-container {
        height: 150px;
    }
}
</style>
