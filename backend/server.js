import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth20";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Environment variables
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8000';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
const SESSION_SECRET = process.env.SESSION_SECRET || 'your-session-secret';

// In-memory user store (replace with database in production)
const users = [
  {
    id: 1,
    email: 'rkyounus1@gmail.com',
    name: 'Mohammed Younus',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // password
  }
];

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport session serialization
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth Strategy
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: `${SERVER_URL}/api/auth/google/callback`
  }, (accessToken, refreshToken, profile, done) => {
    // Find or create user
    let user = users.find(u => u.googleId === profile.id);
    if (!user) {
      user = {
        id: users.length + 1,
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0].value
      };
      users.push(user);
    }
    return done(null, user);
  }));
} else {
  console.warn('Google OAuth credentials not found. OAuth will not work.');
}

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (token == null) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Auth Routes

// Register route
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = users.find(user => user.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = {
      id: users.length + 1,
      email,
      password: hashedPassword,
      name,
      createdAt: new Date()
    };

    users.push(user);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login route
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = users.find(user => user.email === email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user route - ADD THIS ENDPOINT
app.get('/user/current', authenticateToken, (req, res) => {
  try {
    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// OAuth Routes
app.get('/api/auth/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

app.get('/api/auth/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${CLIENT_URL}/login` 
  }),
  (req, res) => {
    // Generate JWT token for OAuth user
    const token = jwt.sign(
      { userId: req.user.id, email: req.user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Redirect to frontend with token
    res.redirect(`${CLIENT_URL}/auth-success?token=${token}`);
  }
);

// Auth check endpoint
app.get('/api/auth/user', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ 
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// Health check endpoint
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

// Serve React build (must be after API routes)
app.use(express.static(path.join(__dirname, "../client/dist")));

// Fallback for SPA routing - must be last
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Client URL: ${CLIENT_URL}`);
  console.log(`Server URL: ${SERVER_URL}`);
});