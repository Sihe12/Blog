const mysql = require('mysql');
const express = require('express');
const util = require('util');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = process.env.JWT_SECRET;

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir);
}

const app = express();
app.use(express.json({ limit: '10mb' })); 
app.use(express.json());
app.use(cors({
  origin: '*',
}));

// Database connection pool setup
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000,
  acquireTimeout: 10000,
});

const query = util.promisify(pool.query).bind(pool);

// Create table if it doesn't exist
async function initializeDatabase() {
  // Users
  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      UserID CHAR(36) PRIMARY KEY,
      Email VARCHAR(255) NOT NULL,
      Username VARCHAR(255) NOT NULL UNIQUE,
      UserPWD VARCHAR(255) NOT NULL,
      FirstName VARCHAR(255) NOT NULL,
      LastName VARCHAR(255) NOT NULL,
      ProfilePic LONGBLOB
    )
  `;

  // Posts
  const createPostsTable = `
    CREATE TABLE IF NOT EXISTS posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      UserID CHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (UserID) REFERENCES users(UserID)
    )
  `;

  // Comments
  const createCommentsTable = `
    CREATE TABLE IF NOT EXISTS comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      PostID INT NOT NULL,
      UserID CHAR(36) NOT NULL,
      content VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (PostID) REFERENCES posts(id),
      FOREIGN KEY (UserID) REFERENCES users(UserID)
    )
  `;

  // Friends
  const createFriendsTable = `
    CREATE TABLE IF NOT EXISTS friends (
      id INT AUTO_INCREMENT PRIMARY KEY,
      UserID CHAR(36) NOT NULL,
      FriendID CHAR(36) NOT NULL,
      status ENUM('none', 'pending', 'friend', 'blocked') DEFAULT 'none',
      FOREIGN KEY (UserID) REFERENCES users(UserID),
      FOREIGN KEY (FriendID) REFERENCES users(UserID),
      UNIQUE KEY unique_relationship (UserID, FriendID)
    )
  `;

  // Likes
  const createLikesTable = `
    CREATE TABLE IF NOT EXISTS likes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      PostID INT NOT NULL,
      UserID CHAR(36) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (PostID) REFERENCES posts(id),
      FOREIGN KEY (UserID) REFERENCES users(UserID),
      UNIQUE KEY unique_like (PostID, UserID)
    )
  `;

  try {
    await query(createUsersTable);
    console.log('Users table created or already exists');

    // Create default users if the table is empty
    const defaultUsers = [
      { email: 'eirik@thewilhelmsens.no', username: 'EirikWilhelmsen', firstName: 'Eirik', lastName: 'Wilhelmsen' },
      { email: 'sheggemoen@gmail.com', username: 'SigurdHeggemoen', firstName: 'Sigurd', lastName: 'Heggemoen' },
      { email: 'alan-lici@hotmail.com', username: 'AlanLici', firstName: 'Alan', lastName: 'Lici' }
    ];

    for (const user of defaultUsers) {
      const userID = uuidv4();
      console.log("linje 92", userID);
      const hashedPassword = await bcrypt.hash('123456', 10);
      const defaultUserQuery = `
        INSERT INTO users (UserID, Email, Username, UserPWD, FirstName, LastName, ProfilePic)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const defaultUserValues = [userID, user.email, user.username, hashedPassword, user.firstName, user.lastName, null];

      await query(defaultUserQuery, defaultUserValues);
      console.log(`Default user created (${user.username})`);
    }
    
    await query(createPostsTable);
    console.log('Posts table created or already exists');

    const UserID = await query("SELECT UserID FROM users WHERE Username = 'EirikWilhelmsen'");

    console.log("linje 108", UserID[0].UserID);
    // create a post for testing purposes
    const postQuery = `
      INSERT INTO posts (UserID, title, content)
      VALUES (?, ?, ?)
    `;
    const postValues = [UserID[0].UserID, 'Hello World', 'This is a test post. You will have to be my friend to see this, or log into my account. The password is not 123456'];
    await query(postQuery, postValues);

    await query(createFriendsTable);
    console.log('Friends table created or already exists');
    
    await query(createCommentsTable);
    console.log('Comments table created or already exists');

    await query(createLikesTable);
    console.log('Likes table created or already exists');
  } 
  catch (err) {
    console.error('Error creating tables:', err);
  }
}

// Call the function to initialize the database
initializeDatabase();


// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);  // No token, unauthorized
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403);  // Invalid token, forbidden
    }

    req.user = user;  // Attach user info (from token) to request
    next();  // Proceed to the next middleware or route handler
  });
}
// Registration endpoint
app.post('/api/register', async (req, res) => {
  /*
    Register user
    Get the email, username, password, firstname, lastname, and profilePic from the request body
    Hash the password using bcrypt
    Generate a UUID for the user
    Insert the user into the users table
  */
  const { email, username, password, firstname, lastname, profilePic } = req.body;
  try {
    const userID = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePicBuffer = null;
    if (profilePic) {
        const base64Data = profilePic.replace(/^data:image\/[a-z]+;base64,/, '');
        profilePicBuffer = Buffer.from(base64Data, 'base64');
        profilePicBuffer = await sharp(profilePicBuffer)
        .resize(200, 200)
        .toBuffer(); 
      }

    await query('INSERT INTO users (UserID, Email, Username, UserPWD, FirstName, LastName, ProfilePic) VALUES (?, ?, ?, ?, ?, ?, ?)', [userID, email, username, hashedPassword, firstname, lastname, profilePicBuffer]);
    res.status(201).json({ success: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      res.json({ success: false, error: 'Username already exists' });
    } else {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  /*
    Login user
    Get the username and password from the request body
    Query the users table for the username
    Check if the password matches
    Generate a JWT token for the logged-in user
  */
  const { username, password } = req.body;
  try {
    const results = await query('SELECT * FROM users WHERE Username = ?', [username]);
    if (results.length > 0) {
      const match = await bcrypt.compare(password, results[0].UserPWD);
      if (!match) {
        res.json({ success: false, user: null });
        return;
      }      

      const user = { userId: results[0].UserID, email: results[0].Email, firstname: results[0].FirstName, lastname: results[0].LastName, username: results[0].Username, profilePic: null };  
      // Generate a JWT token for the logged-in user
      const token = jwt.sign(
        { userId: user.userId, email: user.email, username: user.username, firstname: user.firstname, lastname: user.lastname},
        JWT_SECRET,  // Secret key
        { expiresIn: '1h' }  // Token expires in 1 hour
      );
      res.json({ success: true, token, user, profilePic: results[0].ProfilePic });
    } else {
      res.json({ success: false, user: null });
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password endpoint
app.post('/api/changePassword', authenticateToken, async (req, res) => {
  /*
    Change password
    Get the UserID, oldPassword, and newPassword from the request body
    Check if the old password matches
    Hash the new password
    Update the password in the users table
  */
  const { UserID, oldPassword, newPassword } = req.body;

  if (req.user.userId !== UserID) {
    return res.status(403).json({ error: 'Forbidden: You can only change your own password.' });
  }

  try {
    const results = await query('SELECT UserPWD FROM users WHERE UserID = ?', [UserID]);
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const match = await bcrypt.compare(oldPassword, results[0].UserPWD);
    if (!match) {
      return res.json({ error: 'Old password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await query('UPDATE users SET UserPWD = ? WHERE UserID = ?', [hashedPassword, UserID]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile picture endpoint
app.post('/api/updateProfilePic', authenticateToken, async (req, res) => {
  /*
    Update profile picture
    Get the UserID and profilePic from the request body
    Check if the user is updating their own profile picture
    Convert the Base64 string to a Buffer
    Resize the image to 200x200 using sharp
    Update the profile picture in the users table
  */
  const { UserID, profilePic } = req.body;

  if (req.user.userId !== UserID) {
    return res.status(403).json({ error: 'Forbidden: You can only update your own profile picture.' });
  }

  try {
    // Convert Base64 string back to Buffer
    const base64Data = profilePic.replace(/^data:image\/[a-z]+;base64,/, '');
    let profilePicBuffer = Buffer.from(base64Data, 'base64'); // Convert to Buffer
    // Resize the image to 200x200 using sharp
    profilePicBuffer = await sharp(profilePicBuffer)
      .resize(200, 200)
      .toBuffer();

    await query('UPDATE users SET ProfilePic = ? WHERE UserID = ?', [profilePicBuffer, UserID]);
    res.json({ success: true, profilePic: profilePicBuffer });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get profile picture endpoint
app.post('/api/getProfilePic', authenticateToken, async (req, res) => {
  /*
    Get profile picture
    Get the UserID from the request body
    Check if the user is retrieving their own profile picture
    Query the users table for the profile picture
  */
  const { UserID } = req.body;

  if (req.user.userId !== UserID) {
    return res.status(403).json({ error: 'Forbidden: You can only retrieve your own posts.' });
  }
  try {
    const results = await query('SELECT ProfilePic FROM users WHERE UserID = ?', [UserID]);
    if (results.length > 0) {
      res.json({ success: true, profilePic: results[0].ProfilePic });
    } else {
      res.json({ success: true, profilePic: null });
    }
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create blog post endpoint
app.post('/api/createPosts', authenticateToken, async (req, res) => {
  /*
    Create blog post
    Get the UserID, title, and content from the request body
    Check if the user is creating a post for themselves
    Insert the post into the posts table
  */
  const { UserID, title, content } = req.body;

  if (req.user.userId !== UserID) {
    return res.status(403).json({ error: 'Forbidden: You can only create posts for yourself.' });
  }

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  try {
    const result = await query('INSERT INTO posts (UserID, title, content) VALUES (?, ?, ?)', [UserID, title, content]);
    res.status(201).json({ success: true, postId: result.insertId });
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get blog posts for a specific user
app.post('/api/getPosts', authenticateToken, async (req, res) => {
  /*
    Get blog posts
    Get the UserID from the request body
    Check if the user is retrieving their own posts
    Query the posts table for the user's posts
  */
  const { UserID } = req.body;

  if (req.user.userId !== UserID) {
    return res.status(403).json({ error: 'Forbidden: You can only retrieve your own posts.' });
  }

  try {
    const posts = await query('SELECT * FROM posts WHERE UserID = ?', [UserID]);
    res.json({ success: true, posts });
  } catch (err) {
    console.error('Error retrieving posts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create comment on a specific post
app.post('/api/addComment', authenticateToken, async (req, res) => {
  /*
    Add comment
    Get the PostID, UserID, and content from the request body
    Check if the user is commenting as themselves
    Insert the comment into the comments table
  */
  const { PostID, UserID, content } = req.body;

  // Ensure required fields are present
  if (!PostID || !UserID || !content) {
    console.error('Missing required fields:', { PostID, UserID, content });
    return res.status(400).json({ error: 'PostID, UserID, and content are required.' });
  }

  // Ensure the authenticated user is commenting as themselves
  if (req.user.userId !== UserID) {
    console.error(`User mismatch: req.user.userId=${req.user.userId}, UserID=${UserID}`);
    return res.status(403).json({ error: 'Forbidden: You can only comment as yourself.' });
  }

  try {
    // Insert the comment into the comments table
    const result = await query('INSERT INTO comments (PostID, UserID, content) VALUES (?, ?, ?)', [PostID, UserID, content]);
    res.status(201).json({ success: true, commentId: result.insertId });
  } catch (err) {
    console.error('Error adding comment:', err);  // Log the actual error for debugging
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get friends posts
app.post('/api/getFriendsPosts', authenticateToken, async (req, res) => {
  /*
    Get friends posts
    Get the UserID from the request body
    Get friends from the friends table where UserID is present
    Query the friends table for the user's friends
  */
  const { UserID } = req.body;

  try {
    const friends = await query(`SELECT FriendID FROM friends WHERE UserID = ? AND status = 'friend'`, [UserID]);
    const friendIDs = friends.map(friend => friend.FriendID)
    const posts = await query('SELECT * FROM posts WHERE UserID IN (?) ORDER BY created_at DESC', [friendIDs]);
    res.json({ success: true, posts });
  } catch (err) {
    console.error('Error retrieving friends posts:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get comments for a specific post
app.get('/api/getComments/:postId', async (req, res) => {
  /*
    Get comments
    Get the PostID from the request parameters
    Query the comments table for the post's comments 
  */
  try {
    const { postId } = req.params;
    const comments = await query('SELECT * FROM comments WHERE PostID = ?', [postId]);
    res.json({ success: true, comments });
  } catch (err) {
    console.error('Error retrieving comments:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/getUsers', authenticateToken, async (req, res) => {
  /*
    Get users
    Get the searchquery from the request body
    Query the users table for users matching the search query 
  */
  try {
    const { searchquery } = req.body;
    if (!searchquery) {
      const users = await query('SELECT * FROM users');
      return res.json({ success: true, users });
    }
    const users = await query('SELECT * FROM users WHERE Username LIKE ?', [searchquery + '%']);
    res.json({ success: true, users });
  } catch (err) {
    console.error('Error retrieving users:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Send a friend request
app.post('/api/friendRequest', authenticateToken, async (req, res) => {
  /*
    Send friend request
    Get the FriendID from the request body
    Get the UserID from the authenticated user
    Insert the friend request into the friends table
  */
  const { FriendID } = req.body;
  const UserID = req.user.userId;

  // Prevent a user from sending a request to themselves
  if (UserID === FriendID) {
    return res.status(400).json({ error: 'You cannot send a friend request to yourself.' });
  }

  try {
    await query(
      'INSERT INTO friends (UserID, FriendID, status) VALUES (?, ?, ?)',
      [UserID, FriendID, 'pending']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Error sending friend request:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get friendship status between two users
app.post('/api/getFriendStatus', authenticateToken, async (req, res) => {
  /*
    Get friend status
    Get the FriendID from the request body
    Get the UserID from the authenticated user
    Query the friends table for the relationship status
  */
  const { FriendID } = req.body;
  const UserID = req.user.userId;

  try {
    const results = await query('SELECT status FROM friends WHERE UserID = ? AND FriendID = ?', [UserID, FriendID]);
    
    if (results.length > 0) {
      res.json({ success: true, status: results[0].status });
    } else {
      res.json({ success: true, status: 'none' });
    }
  } catch (err) {
    console.error('Error retrieving friend status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/incomingFriendRequests', authenticateToken, async (req, res) => {
  /*
    Get incoming friend requests
    Get the UserID from the authenticated user
    Query the friends table for incoming friend requests
  */
  try {
    const UserID = req.user.userId;

    const incomingRequests = await query(
      `SELECT f.UserID, f.status
       FROM friends f
       WHERE f.FriendID = ? AND f.status = 'pending'`,
      [UserID]
    );
    
    console.log(incomingRequests);

    res.json({ success: true, incomingRequests });
  } catch (err) {
    console.error('Error fetching incoming requests:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// check if user has friends
app.post('/api/checkFriends', authenticateToken, async (req, res) => {
  /*
    Check if user has friends
    Get the UserID from the request body
    Query the friends table rows where the user is the UserID
  */
  try {
    const { UserID } = req.body;
    const friends = await query(`SELECT * FROM friends WHERE UserID = ? AND status = 'friend'`, [UserID]);
    res.json({ success: true, friends });
  } catch (err) {
    console.error('Error retrieving friends:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Respond to a friend request (accept or decline)
app.post('/api/respondFriendRequest', authenticateToken, async (req, res) => {
  /*
    Respond to friend request
    Get the UserID, FriendID, and action from the request body
    Update the friends table with the response
  */
  const { userId, friendId, action } = req.body;
    try {
      switch (action) {
        case 'accept':
          // Update the original request to accepted
          await query(
            'UPDATE friends SET status = ? WHERE UserID = ? AND FriendID = ?',
            ['friend', friendId, userId]
          );

          // Create or update reverse relationship
          await query(
            `INSERT INTO friends (UserID, FriendID, status) 
             VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE status = ?`,
            [userId, friendId, 'friend', 'friend']
          );
          break;

        case 'decline':
          // Remove both directions of the relationship
          await query(
            'DELETE FROM friends WHERE (UserID = ? AND FriendID = ?) OR (UserID = ? AND FriendID = ?)',
            [friendId, userId, userId, friendId]
          );
          break;

        case 'block':
          // Remove any existing relationships in both directions
          await query(
            'DELETE FROM friends WHERE (UserID = ? AND FriendID = ?) OR (UserID = ? AND FriendID = ?)',
            [friendId, userId, userId, friendId]
          );

          // Create blocked relationships in both directions
          await query(
            'INSERT INTO friends (UserID, FriendID, status) VALUES (?, ?, ?), (?, ?, ?)',
            [userId, friendId, 'blocked', friendId, userId, 'blocked']
          );
          break;
      }
      res.json({ 
        success: true, 
        message: `Friend request ${action}ed successfully` 
      });

    } catch (err) {
      console.error('Error responding to friend request:', err);
      res.status(500).json({ error: 'Internal server error' });
    } 
});

// Delete comment endpoint
app.delete('/api/deleteComment/:commentId', authenticateToken, async (req, res) => {
  /*
    Delete comment
    Get the commentId from the request parameters
    Get the UserID from the authenticated user
    Ensure the user is the owner of the comment
  */

  const { commentId } = req.params;
  const userId = req.user.userId;

  try {
    // Ensure the user is the owner of the comment
    const comment = await query('SELECT * FROM comments WHERE id = ?', [commentId]);
    if (comment.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment[0].UserID !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own comments' });
    }

    // Delete the comment
    await query('DELETE FROM comments WHERE id = ?', [commentId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Get username from ID
app.post('/api/getUsername', authenticateToken, async (req, res) => {
  /*
    Get username
    Get the UserID from the request body
    Query the users table for the username
  */
  const { UserID } = req.body;

  try {
    const results = await query('SELECT Username FROM users WHERE UserID = ?', [UserID]);
    if (results.length > 0) {
      res.json({ success: true, username: results[0].Username });
    } else {
      res.json({ success: false, username: null });
    }
  } catch (err) {
    console.error('Error retrieving username:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Like or unlike a post
app.post('/api/likePost', authenticateToken, async (req, res) => {
  /*
    Like or unlike post
    Get the PostID and UserID from the request body
    Check if the user is liking the post as themselves
    Check if the user has already liked the post
    Insert or delete the like from the likes table
  */
  const { PostID, UserID } = req.body;

  if (req.user.userId !== UserID) {
    return res.status(403).json({ error: 'Forbidden: You can only like posts as yourself.' });
  }

  try {
    // Check if the user has already liked the post
    const existingLike = await query('SELECT * FROM likes WHERE PostID = ? AND UserID = ?', [PostID, UserID]);

    if (existingLike.length > 0) {
      // User has already liked the post, so unlike it
      await query('DELETE FROM likes WHERE PostID = ? AND UserID = ?', [PostID, UserID]);
      res.json({ success: true, action: 'unliked' });
    } else {
      // User hasn't liked the post, so add a new like
      await query('INSERT INTO likes (PostID, UserID) VALUES (?, ?)', [PostID, UserID]);
      res.json({ success: true, action: 'liked' });
    }
  } catch (err) {
    console.error('Error liking/unliking post:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get like count for a post
app.get('/api/getLikeCount/:postId', async (req, res) => {
  /*
    Get like count
    Get the PostID from the request parameters
    Query the likes table for the number of likes on the post
  */
  const { postId } = req.params;

  try {
    const [result] = await query('SELECT COUNT(*) as likeCount FROM likes WHERE PostID = ?', [postId]);
    res.json({ success: true, likeCount: result.likeCount });
  } catch (err) {
    console.error('Error getting like count:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Check if a user has liked a post
app.post('/api/checkLiked', authenticateToken, async (req, res) => {
  /*
    Check if post is liked
    Get the PostID and UserID from the request body
    Check if the user is checking likes for themselves
    Query the likes table for the user's like on the
  */
  const { PostID, UserID } = req.body;

  if (req.user.userId !== UserID) {
    return res.status(403).json({ error: 'Forbidden: You can only check likes for yourself.' });
  }

  try {
    const result = await query('SELECT * FROM likes WHERE PostID = ? AND UserID = ?', [PostID, UserID]);
    res.json({ success: true, liked: result.length > 0 });
  } catch (err) {
    console.error('Error checking if post is liked:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Endpoint (for testing connectivity)
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello, world!' });
});


// Endpoints for API
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
const HUGGING_FACE_API_KEY = process.env.HUGGING_FACE_API_KEY;

// Endpoint to get weather data
app.post('/api/weather', async (req, res) => {
  const { location } = req.body;
  const url = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${location}&api=no`;
  const response = await fetch(url);
  const data = await response.json();
  res.json(data);
});

// Endpoint to get chatbot response
app.post('/api/chatbot', async (req, res) => {
  const { message } = req.body;
  const url = `https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-3B-Instruct`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: message }),
  });
  const data = await response.json();
  res.json(data);
});

// Start the server
app.listen(3000, () => {
  console.log('Backend server is running on port 3000');
});