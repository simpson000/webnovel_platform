<template>
    <div class="platform-novels">
        <h2>{{ platformTitle }} 베스트 웹소설</h2>

        <div class="platform-selector">
            <button
                v-for="platform in platforms"
                :key="platform.id"
                :class="[
                    'platform-btn',
                    { active: currentPlatform === platform.id },
                ]"
                @click="changePlatform(platform.id)"
            >
                {{ platform.name }}
            </button>
        </div>

        <div class="controls">
            <button
                class="refresh-btn"
                @click="triggerCrawling"
                :disabled="crawling"
            >
                <span v-if="crawling">크롤링 진행 중...</span>
                <span v-else>최신 데이터 가져오기</span>
            </button>
        </div>

        <div v-if="loading" class="loading">데이터를 불러오는 중...</div>

        <div v-else-if="error" class="error">
            {{ error }}
        </div>

        <div v-else-if="novels.length === 0" class="no-data">
            소설 데이터가 없습니다. 크롤링을 실행해 주세요.
        </div>

        <div v-else class="novel-grid">
            <div
                v-for="(novel, index) in novels"
                :key="novel.id"
                class="novel-card"
            >
                <div class="cover-container">
                    <img
                        :src="novel.cover_image_url || '/placeholder-cover.png'"
                        :alt="novel.title"
                        class="cover-image"
                        @error="handleImageError"
                    />
                    <div class="rank">{{ index + 1 }}</div>
                </div>

                <div class="novel-info">
                    <h3 class="title">{{ novel.title }}</h3>
                    <p class="author">{{ novel.author }}</p>

                    <div class="genres">
                        <span
                            v-for="(genre, gIndex) in novel.genres || []"
                            :key="gIndex"
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
                </div>
            </div>
        </div>

        <div class="status-info" v-if="lastCrawled">
            <p>마지막 크롤링: {{ formatDate(lastCrawled) }}</p>
        </div>
    </div>
</template>

<script>
import api from '@/api';

export default {
    name: 'PlatformNovelsView',
    data() {
        return {
            platforms: [
                { id: 'naver', name: '네이버 시리즈' },
                { id: 'kakao', name: '카카오페이지' },
                { id: 'munpia', name: '문피아' },
            ],
            currentPlatform: 'munpia', // 기본값을 문피아로 설정
            novels: [],
            loading: false,
            error: null,
            crawling: false,
            lastCrawled: null,
        };
    },
    computed: {
        platformTitle() {
            const platform = this.platforms.find(
                (p) => p.id === this.currentPlatform
            );
            return platform ? platform.name : '';
        },
    },
    mounted() {
        this.fetchNovels();
        this.checkCrawlingStatus();
    },
    methods: {
        // 크롤링 시작
        async startCrawling() {
            try {
                this.isCrawling = true;
                this.addLog('info', '문피아 크롤링 작업 시작 요청...');

                // API 서비스 사용
                const response = await api.startCrawling('munpia', true);

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
        // 크롤링 상태 확인
        async checkCrawlingStatus() {
            try {
                // API 서비스 사용
                const response = await api.getCrawlingStatus();

                // ...기존 처리 코드 유지...
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

                // API 서비스 사용
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

        async checkCrawlingStatus() {
            try {
                const response = await api.getCrawlerStatus();
                const logs = response.data;

                if (logs && logs.length > 0) {
                    // 현재 플랫폼의 가장 최근 로그 찾기
                    const platformLog = logs.find(
                        (log) =>
                            log.platform_name.toLowerCase() ===
                            this.currentPlatform.toLowerCase()
                    );

                    if (platformLog) {
                        // 진행 중인지 확인
                        this.crawling = platformLog.status === 'IN_PROGRESS';

                        // 마지막 크롤링 시간 업데이트
                        if (platformLog.end_time) {
                            this.lastCrawled = new Date(platformLog.end_time);
                        }
                    }
                }
            } catch (error) {
                console.error('크롤링 상태 확인 실패:', error);
            }
        },

        async triggerCrawling() {
            if (this.crawling) return;

            try {
                this.crawling = true;
                await api.triggerCrawling(this.currentPlatform);

                // 크롤링 상태 주기적으로 확인
                const checkInterval = setInterval(async () => {
                    await this.checkCrawlingStatus();

                    if (!this.crawling) {
                        clearInterval(checkInterval);
                        await this.fetchNovels(); // 크롤링 완료 후 데이터 다시 가져오기
                    }
                }, 5000); // 5초마다 확인
            } catch (error) {
                console.error('크롤링 요청 실패:', error);
                this.error = '크롤링 요청에 실패했습니다. 다시 시도해주세요.';
                this.crawling = false;
            }
        },

        changePlatform(platform) {
            if (this.currentPlatform !== platform) {
                this.currentPlatform = platform;
                this.novels = [];
                this.lastCrawled = null;
                this.fetchNovels();
            }
        },

        handleImageError(e) {
            e.target.src = '/placeholder-cover.png'; // 이미지 로드 실패 시 대체 이미지
        },

        formatNumber(num) {
            return num > 10000
                ? (num / 10000).toFixed(1) + '만'
                : num.toLocaleString();
        },

        formatDate(date) {
            if (!date) return '';
            return new Date(date).toLocaleString();
        },
    },
};
</script>

<style scoped>
.platform-novels {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

h2 {
    text-align: center;
    margin-bottom: 20px;
    color: #2c3e50;
}

.platform-selector {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
    gap: 10px;
}

.platform-btn {
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 20px;
    background: white;
    cursor: pointer;
    transition: all 0.3s;
}

.platform-btn.active {
    background: #3498db;
    color: white;
    border-color: #3498db;
}

.controls {
    display: flex;
    justify-content: center;
    margin-bottom: 20px;
}

.refresh-btn {
    padding: 8px 20px;
    background: #2ecc71;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.refresh-btn:disabled {
    background: #95a5a6;
    cursor: not-allowed;
}

.novel-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 20px;
}

.novel-card {
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    transition: transform 0.3s;
    background: white;
}

.novel-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.cover-container {
    position: relative;
    height: 300px;
    overflow: hidden;
}

.cover-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.rank {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(52, 152, 219, 0.9);
    color: white;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
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
    color: #7f8c8d;
    margin-bottom: 10px;
    font-size: 14px;
}

.genres {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 10px;
}

.genre-tag {
    background: #f0f0f0;
    color: #34495e;
    padding: 3px 8px;
    border-radius: 12px;
    font-size: 12px;
}

.stats {
    display: flex;
    justify-content: space-between;
    color: #7f8c8d;
    font-size: 14px;
}

.loading,
.error,
.no-data {
    text-align: center;
    margin: 50px 0;
    color: #7f8c8d;
}

.error {
    color: #e74c3c;
}

.status-info {
    margin-top: 30px;
    text-align: center;
    color: #7f8c8d;
    font-size: 14px;
}

/* 아이콘 스타일 */
.icon-star::before {
    content: '★';
    color: #f1c40f;
}

.icon-eye::before {
    content: '👁';
    margin-right: 3px;
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
}
</style>
