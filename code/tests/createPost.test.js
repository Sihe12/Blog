const axios = require('axios');

describe('Create Post functionality', () => {
  let token;
  let user;

  beforeAll(async () => {
    const loginResponse = await axios.post('http://localhost:32000/api/login', {
      username: 'EirikWilhelmsen',
      password: '123456',
    });

    expect(loginResponse.data.success).toBe(true);
    token = loginResponse.data.token;
    user = loginResponse.data.user;
  });

  test('Should successfully create a new post', async () => {
    const response = await axios.post(
      'http://localhost:32000/api/createPosts',
      {
        UserID : user.userId,
        title: 'Test Post',
        content: 'Test content',
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    expect(response.data.success).toBe(true);
  });

  test('Should fail to create a post with missing title or content', async () => {
    try {
      const response = await axios.post(
        'http://localhost:32000/api/createPosts',
        {
          UserID: user.userId,
          title: '',           
          content: '',          
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      fail('Expected error was not thrown');
    } catch (error) {
      expect(error.response.status).toBe(400);
    }
  });
});