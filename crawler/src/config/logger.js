// logger.js 파일

const winston = require('winston');
const { format, transports } = winston;
const { combine, timestamp, printf, colorize } = format;

// 로그 형식 정의
const logFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});

// 로거 생성
const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(timestamp(), colorize(), logFormat),
    transports: [
        // 콘솔에 로그 출력
        new transports.Console(),
        // 파일에 로그 저장
        new transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }),
        new transports.File({
            filename: 'logs/debug.log',
            level: 'debug',
        }),
        new transports.File({
            filename: 'logs/combined.log',
        }),
    ],
});

module.exports = logger;
