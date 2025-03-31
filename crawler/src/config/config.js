require('dotenv').config();

module.exports = {
    browser: {
        headless: process.env.BROWSER_HEADLESS === 'true',
        userAgent: process.env.USER_AGENT,
    },
    database: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '1234',
        database: process.env.DB_NAME || 'webnovel',
    },
    crawler: {
        interval: parseInt(process.env.CRAWL_INTERVAL || '3600000', 10),
        retryCount: parseInt(process.env.RETRY_COUNT || '3', 10),
        requestDelay: parseInt(process.env.REQUEST_DELAY || '1000', 10),
    },
    server: {
        port: parseInt(process.env.PORT || '3001', 10),
    },
    platforms: {
        naver: {
            baseUrl: process.env.NAVER_BASE_URL || 'https://series.naver.com',
        },
        kakao: {
            baseUrl: process.env.KAKAO_BASE_URL || 'https://page.kakao.com',
        },
        munpia: {
            baseUrl: process.env.MUNPIA_BASE_URL || 'https://www.munpia.com',
        },
    },
};
