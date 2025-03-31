const mysql = require('mysql2/promise');
const config = require('../config/config');
const logger = require('../config/logger');

// MySQL 연결 풀 생성
const pool = mysql.createPool({
    host: config.database.host,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// 데이터베이스 연결 확인
async function checkConnection() {
    try {
        const connection = await pool.getConnection();
        logger.info('데이터베이스 연결 성공');
        connection.release();
        return true;
    } catch (error) {
        logger.error(`데이터베이스 연결 실패: ${error.message}`);
        return false;
    }
}

// 연결 가져오기
async function getConnection() {
    try {
        return await pool.getConnection();
    } catch (error) {
        logger.error(`데이터베이스 연결 오류: ${error.message}`);
        throw error;
    }
}

module.exports = {
    pool,
    checkConnection,
    getConnection,
};
