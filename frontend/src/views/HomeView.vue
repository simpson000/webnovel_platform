<template>
    <div class="home">
        <h2>인기 웹소설</h2>

        <div v-if="loading" class="loading">데이터를 불러오는 중...</div>
        <div v-else-if="error" class="error">
            {{ error }}
        </div>
        <div v-else class="novel-list">
            <div v-for="novel in novels" :key="novel.id" class="novel-card">
                <img
                    :src="
                        novel.cover_image_url ||
                        'https://via.placeholder.com/150x200'
                    "
                    :alt="novel.title"
                    class="cover"
                />
                <div class="info">
                    <h3>{{ novel.title }}</h3>
                    <p class="author">{{ novel.author }}</p>
                    <div class="rating" v-if="novel.average_rating">
                        <span>평점: {{ novel.average_rating }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import api from '@/api';

export default {
    name: 'HomeView',
    data() {
        return {
            novels: [],
            loading: true,
            error: null,
        };
    },
    mounted() {
        this.fetchPopularNovels();
    },
    methods: {
        async fetchPopularNovels() {
            try {
                this.loading = true;
                const response = await api.getPopularNovels();
                this.novels = response.data;
                this.error = null;
            } catch (err) {
                console.error('인기 소설을 불러오는데 실패했습니다:', err);
                this.error =
                    '인기 소설을 불러오는데 실패했습니다. 다시 시도해주세요.';
            } finally {
                this.loading = false;
            }
        },
    },
};
</script>

<style scoped>
.novel-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.novel-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
    transition: transform 0.2s;
}

.novel-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.cover {
    width: 100%;
    height: 250px;
    object-fit: cover;
}

.info {
    padding: 15px;
}

.author {
    color: #666;
    margin: 5px 0;
}

.loading,
.error {
    text-align: center;
    margin: 30px 0;
    font-size: 18px;
}

.error {
    color: #dc3545;
}
</style>
