import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

const routes = [
    {
        path: '/',
        name: 'home',
        component: HomeView,
    },
    {
        path: '/novels',
        name: 'novels',
        // 지연 로딩 사용
        component: () => import('../views/NovelsView.vue'),
    },
    {
        path: '/novels/:id',
        name: 'novel-detail',
        component: () => import('../views/NovelDetailView.vue'),
        props: true,
    },
    {
        path: '/admin',
        name: 'admin',
        component: () => import('../views/AdminView.vue'),
    },
    // 플랫폼별 소설 페이지 추가
    // {
    //     path: '/platform-novels',
    //     name: 'platform-novels',
    //     component: () => import('../views/PlatformNovelsView.vue'),
    {
        path: '/munpia',
        name: 'munpia',
        component: () => import('../views/MunpiaDashboard.vue'),
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

export default router;
