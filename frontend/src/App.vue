<template>
    <header>
        <h1>웹소설 통합 플랫폼</h1>
        <nav>
            <router-link to="/">홈</router-link> |
            <router-link to="/munpia" class="highlight"
                >문피아 베스트</router-link
            >
            | <router-link to="/novels">전체 소설</router-link> |
            <router-link to="/admin">관리자</router-link>
        </nav>
    </header>

    <main>
        <router-view />
    </main>

    <footer>
        <p>© 2025 웹소설 통합 플랫폼 - 1인 개발자 프로젝트</p>
    </footer>
</template>

<style scoped>
header {
    background-color: #34495e;
    color: white;
    padding: 1rem;
    text-align: center;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

h1 {
    margin: 0;
    font-size: 1.8rem;
    font-weight: 500;
}

nav {
    margin-top: 1rem;
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
}

nav a {
    color: #ecf0f1;
    margin: 0 0.5rem;
    text-decoration: none;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    transition: all 0.3s ease;
}

nav a:hover {
    background-color: rgba(255, 255, 255, 0.1);
}

nav a.router-link-active {
    font-weight: bold;
    color: #3498db;
    background-color: rgba(255, 255, 255, 0.9);
}

nav a.highlight {
    background-color: #3498db;
    color: white;
    padding: 0.3rem 0.8rem;
}

nav a.highlight:hover {
    background-color: #2980b9;
}

main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    min-height: calc(100vh - 160px);
}

footer {
    text-align: center;
    padding: 1rem;
    background-color: #f8f9fa;
    color: #6c757d;
    margin-top: 2rem;
    font-size: 0.9rem;
}

@media (max-width: 768px) {
    nav {
        flex-direction: column;
        align-items: center;
    }

    nav a {
        margin: 0.2rem 0;
    }
}
</style>
