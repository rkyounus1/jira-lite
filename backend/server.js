import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth20";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Environment variables
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:8000';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret',
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
    // This is where you'd typically save user to database
    console.log('Google profile:', profile);
    return done(null, profile);
  }));
} else {
  console.warn('Google OAuth credentials not found. OAuth will not work.');
}

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
    // Successful authentication
    res.redirect(CLIENT_URL);
  }
);

// Auth check endpoint
app.get('/api/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
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