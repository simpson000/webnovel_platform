// browser.js - 브라우저 유틸리티 수정 코드
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../config/logger');
const config = require('../config/config');

// 스텔스 플러그인 추가 (봇 감지 우회)
puppeteer.use(StealthPlugin());

let browser = null;

// 브라우저 초기화
async function initBrowser() {
    if (browser) return browser;

    logger.info('브라우저 초기화 중...');

    try {
        browser = await puppeteer.launch({
            headless: config.browser.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1920,1080',
                // 추가 브라우저 지문 회피 인자
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
            ],
            defaultViewport: { width: 1920, height: 1080 },
            // 더 현실적인 환경을 위한 추가 설정
            ignoreHTTPSErrors: true,
        });

        browser.on('disconnected', () => {
            logger.info('브라우저 연결 해제됨');
            browser = null;
        });

        logger.info('브라우저 초기화 성공');
        return browser;
    } catch (error) {
        logger.error(`브라우저 초기화 실패: ${error.message}`);
        throw error;
    }
}

// 새 페이지 생성
async function createPage() {
    const browser = await initBrowser();
    const page = await browser.newPage();

    // 더 현실적인 User-Agent 설정
    await page.setUserAgent(
        config.browser.userAgent ||
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    );

    // 웹드라이버 감지 회피 강화
    await page.evaluateOnNewDocument(() => {
        // WebDriver 속성 삭제
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });

        // Chrome 속성 정의
        window.navigator.chrome = {
            runtime: {},
        };

        // 언어 설정
        Object.defineProperty(navigator, 'languages', {
            get: () => ['ko-KR', 'ko', 'en-US', 'en'],
        });

        // Automation 관련 속성 감춤
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) =>
            parameters.name === 'notifications'
                ? Promise.resolve({ state: Notification.permission })
                : originalQuery(parameters);

        // 추가된 중요한 방지 기법: Puppeteer 감지 방지
        // cdc_ 접두사가 붙은 속성 제거 (Chrome DevTools Protocol 관련)
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

        // 헤드리스 감지 방지
        // 플러그인 목록 설정
        Object.defineProperty(navigator, 'plugins', {
            get: () => {
                return [
                    {
                        0: { type: 'application/x-google-chrome-pdf' },
                        description: 'Portable Document Format',
                        filename: 'internal-pdf-viewer',
                        length: 1,
                        name: 'Chrome PDF Plugin',
                    },
                    {
                        0: { type: 'application/pdf' },
                        description: '',
                        filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
                        length: 1,
                        name: 'Chrome PDF Viewer',
                    },
                    {
                        0: { type: 'application/x-nacl' },
                        1: { type: 'application/x-pnacl' },
                        description: '',
                        filename: 'internal-nacl-plugin',
                        length: 2,
                        name: 'Native Client',
                    },
                ];
            },
            enumerable: true,
            configurable: true,
        });
    });

    // 세션과 쿠키 관리 설정
    await page.setCookie({
        name: 'session_visited',
        value: 'true',
        domain: '.naver.com',
        path: '/',
        expires: Date.now() / 1000 + 3600 * 24,
    });

    // 이미지 로딩 제한 (성능 향상)
    if (config.browser.blockImages) {
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (
                req.resourceType() === 'image' ||
                req.resourceType() === 'font'
            ) {
                req.abort();
            } else {
                req.continue();
            }
        });
    }

    // 콘솔 로그 캡처 및 저장
    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            logger.error(`페이지 콘솔 오류: ${msg.text()}`);
        } else if (msg.type() === 'warning') {
            logger.warn(`페이지 콘솔 경고: ${msg.text()}`);
        } else if (config.debug) {
            logger.debug(`페이지 콘솔: ${msg.type()} - ${msg.text()}`);
        }
    });

    return page;
}

// 브라우저 종료
async function closeBrowser() {
    if (browser) {
        await browser.close();
        browser = null;
        logger.info('브라우저 종료됨');
    }
}

module.exports = {
    initBrowser,
    createPage,
    closeBrowser,
};
