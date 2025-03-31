<template>
    <div class="novels">
        <h2>웹소설 목록</h2>

        <div class="filters" v-if="genres.length > 0">
            <label for="genre-filter">장르 필터:</label>
            <select
                id="genre-filter"
                v-model="selectedGenre"
                @change="fetchNovels"
            >
                <option value="">전체</option>
                <option
                    v-for="genre in genres"
                    :key="genre.id"
                    :value="genre.name"
                >
                    {{ genre.name }}
                </option>
            </select>
        </div>

        <div v-if="loading" class="loading">데이터를 불러오는 중...</div>
        <div v-else-if="error" class="error">
            {{ error }}
        </div>
        <div v-else-if="novels.length === 0" class="no-data">
            소설 데이터가 없습니다.
        </div>
        <div v-else class="novel-list">
            <div
                v-for="novel in novels"
                :key="novel.id"
                class="novel-card"
                @click="goToNovel(novel.id)"
            >
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
    name: 'NovelsView',
    data() {
        return {
            novels: [],
            genres: [],
            selectedGenre: '',
            loading: true,
            error: null,
        };
    },
    mounted() {
        this.fetchGenres();
        this.fetchNovels();
    },
    methods: {
        async fetchGenres() {
            try {
                const response = await api.getGenres();
                this.genres = response.data;
            } catch (err) {
                console.error('장르 목록을 불러오는데 실패했습니다:', err);
            }
        },
        async fetchNovels() {
            try {
                this.loading = true;
                const response = await api.getNovelList(this.selectedGenre);
                this.novels = response.data;
                this.error = null;
            } catch (err) {
                console.error('소설 목록을 불러오는데 실패했습니다:', err);
                this.error =
                    '소설 목록을 불러오는데 실패했습니다. 다시 시도해주세요.';
            } finally {
                this.loading = false;
            }
        },
        goToNovel(id) {
            this.$router.push(`/novels/${id}`);
        },
    },
};
</script>

<style scoped>
.filters {
    margin-bottom: 20px;
}

.filters select {
    margin-left: 10px;
    padding: 5px;
    border-radius: 4px;
}

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
    cursor: pointer;
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
.error,
.no-data {
    text-align: center;
    margin: 30px 0;
    font-size: 18px;
}

.error {
    color: #dc3545;
}
</style>
