require('dotenv').config({ path: './.env.test' });

const mysql = require('mysql');
const util = require('util');

jest.mock('mysql', () => {
    const mPool = {
        query: jest.fn(),
        getConnection: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
    };

    return {
        createPool: jest.fn(() => mPool),
        createConnection: jest.fn(() => mPool),
    };
});

const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
});

pool.query = util.promisify(pool.query);

module.exports = {
    pool,
};
