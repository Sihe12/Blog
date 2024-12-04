const axios = require('axios');

describe('Login functionality', () => {
    test('Should successfully log in an existing user', async () => {
        const response = await axios.post('http://localhost:32000/api/login', {
            username: 'EirikWilhelmsen',
            password: '123456',
        });

        expect(response.data.success).toBe(true);
        expect(response.data.user).toHaveProperty('username', 'EirikWilhelmsen');
        expect(response.data).toHaveProperty('token');
    });

    test('Should fail to log in with incorrect password', async () => {
        const response = await axios.post('http://localhost:32000/api/login', {
            username: 'EirikWilhelmsen',
            password: 'wrongpassword',
        });

        expect(response.data.success).toBe(false);
        expect(response.data.user).toBe(null);
    });

    test('Should fail to log in with non-existent user', async () => {
        const response = await axios.post('http://localhost:32000/api/login', {
            username: 'NonExistentUser',
            password: '123456',
        });

        expect(response.data.success).toBe(false);
        expect(response.data.user).toBe(null);
    });
});
