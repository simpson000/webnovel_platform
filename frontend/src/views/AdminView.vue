<template>
    <div class="admin-view">
        <h2>관리자 대시보드</h2>

        <div class="crawler-controls">
            <h3>크롤링 작업 관리</h3>
            <div class="button-group">
                <button
                    @click="triggerCrawling('naver')"
                    :disabled="crawling.naver"
                    class="btn"
                >
                    네이버 시리즈 크롤링
                    <span v-if="crawling.naver"> (진행중...)</span>
                </button>
                <button
                    @click="triggerCrawling('kakao')"
                    :disabled="crawling.kakao"
                    class="btn"
                >
                    카카오페이지 크롤링
                    <span v-if="crawling.kakao"> (진행중...)</span>
                </button>
                <button
                    @click="triggerCrawling('munpia')"
                    :disabled="crawling.munpia"
                    class="btn"
                >
                    문피아아 시리즈 크롤링
                    <span v-if="crawling.munpia"> (진행중...)</span>
                </button>
            </div>
        </div>

        <div class="crawler-logs">
            <h3>크롤링 작업 로그</h3>
            <div v-if="loading" class="loading">데이터를 불러오는 중...</div>
            <div v-else-if="error" class="error">{{ error }}</div>
            <div v-else-if="logs.length === 0" class="no-data">
                크롤링 로그가 없습니다.
            </div>
            <table v-else class="logs-table">
                <thead>
                    <tr>
                        <th>플랫폼</th>
                        <th>시작 시간</th>
                        <th>종료 시간</th>
                        <th>상태</th>
                        <th>수집한 소설</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="log in logs"
                        :key="log.id"
                        :class="getStatusClass(log.status)"
                    >
                        <td>{{ log.platform_name }}</td>
                        <td>{{ formatDate(log.start_time) }}</td>
                        <td>
                            {{ log.end_time ? formatDate(log.end_time) : '-' }}
                        </td>
                        <td>{{ translateStatus(log.status) }}</td>
                        <td>{{ log.novels_fetched || 0 }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script>
import api from '@/api';

export default {
    name: 'AdminView',
    data() {
        return {
            logs: [],
            loading: true,
            error: null,
            crawling: {
                naver: false,
                kakao: false,
            },
            refreshInterval: null,
        };
    },
    mounted() {
        this.fetchCrawlerLogs();
        // 30초마다 로그 자동 갱신
        this.refreshInterval = setInterval(this.fetchCrawlerLogs, 30000);
    },
    beforeUnmount() {
        // 컴포넌트 제거 시 인터벌 정리
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
    },
    methods: {
        async fetchCrawlerLogs() {
            try {
                this.loading = true;
                const response = await api.getCrawlerStatus();
                this.logs = response.data;
                this.error = null;

                // 크롤링 상태 업데이트
                this.updateCrawlingStatus();
            } catch (err) {
                console.error('크롤링 로그를 불러오는데 실패했습니다:', err);
                this.error =
                    '크롤링 로그를 불러오는데 실패했습니다. 다시 시도해주세요.';
            } finally {
                this.loading = false;
            }
        },
        updateCrawlingStatus() {
            // 진행 중인 작업이 있는지 확인
            this.crawling.naver = this.logs.some(
                (log) =>
                    log.platform_name.toLowerCase().includes('naver') &&
                    log.status === 'IN_PROGRESS'
            );

            this.crawling.kakao = this.logs.some(
                (log) =>
                    log.platform_name.toLowerCase().includes('kakao') &&
                    log.status === 'IN_PROGRESS'
            );
        },
        async triggerCrawling(platform) {
            try {
                this.crawling[platform] = true;
                await api.triggerCrawling(platform);

                // 작업 트리거 후 로그 새로고침
                setTimeout(() => {
                    this.fetchCrawlerLogs();
                }, 1000);
            } catch (err) {
                console.error(`${platform} 크롤링 실행에 실패했습니다:`, err);
                alert(
                    `${platform} 크롤링 실행에 실패했습니다. 서버 상태를 확인해주세요.`
                );
                this.crawling[platform] = false;
            }
        },
        formatDate(dateString) {
            if (!dateString) return '-';
            return new Date(dateString).toLocaleString();
        },
        getStatusClass(status) {
            const statusMap = {
                COMPLETED: 'status-success',
                FAILED: 'status-error',
                PARTIAL_SUCCESS: 'status-warning',
                IN_PROGRESS: 'status-info',
            };
            return statusMap[status] || '';
        },
        translateStatus(status) {
            const statusMap = {
                COMPLETED: '완료',
                FAILED: '실패',
                PARTIAL_SUCCESS: '부분 성공',
                IN_PROGRESS: '진행 중',
            };
            return statusMap[status] || status;
        },
    },
};
</script>
