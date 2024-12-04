// tests/auth.test.js
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

describe('Authentication Utilities', () => {
    test('Should hash a password correctly', async () => {
        const password = 'mypassword';
        const hashedPassword = await bcrypt.hash(password, 10);
        expect(await bcrypt.compare(password, hashedPassword)).toBe(true);
    });

    test('Should generate a valid JWT token', () => {
        const payload = { userId: '12345' };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        const decoded = jwt.verify(token, JWT_SECRET);
        expect(decoded.userId).toBe(payload.userId);
    });
});