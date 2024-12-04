const axios = require('axios');

describe('Register functionality', () => {
  test('Should successfully register a new user', async () => {
    // Random number between 1 and 1000
    let x = Math.floor(Math.random() * 1000) + 1;
    
    const response = await axios.post('http://localhost:32000/api/register', {
      firstname: 'Jane',
      lastname: 'Doe',
      username: `alan${x}`,
      password: 'password123',
      email: 'alanmr99@example.com',
    });

    expect(response.data.success).toBe(true);
  });

  test('Should fail to register a user with an existing username', async () => {
    const response = await axios.post('http://localhost:32000/api/register', {
      firstname: 'John',
      lastname: 'Doe',
      username: 'SigurdHeggemoen',
      password: 'password123',
      email: 'john@example.com',
    });
    expect(response.data.success).toBe(false);
  });

  test('Should fail to register a user without an email', async () => {
    try{
      let x = Math.floor(Math.random() * 1000) + 1;
      await axios.post('http://localhost:32000/api/register', {
        firstname: 'John',
        lastname: 'Doe',
        username: `john_Doe${x}`,
        password: '12345678',
        email: '',
      });
    }
    catch (error){
      expect(error.response.data).toHaveProperty('error', 'Server error');
    }
  });

  test('Should display a server error if something goes wrong', async () => {
    try {
      await axios.post('http://localhost:32000/api/register', {
        firstname: 'John',
        lastname: 'Doe',
        username: '',
        password: 'password123',
        email: 'john@example.com',
      });
    } catch (error) {
      expect(error.response.data).toHaveProperty('error', 'Server error');
    }
  });
});
