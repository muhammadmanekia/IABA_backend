const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { initializeFirebase } = require("./config/firebase");
require("dotenv").config();

// Initialize Firebase first
initializeFirebase();

// Import routes
const eventRoutes = require("./routes/events");
const donationRoutes = require("./routes/donations");
const pledgeRoutes = require("./routes/pledges");
const authRoute = require("./routes/auth");
const rsvpRoutes = require("./routes/rsvps");
const dateAdjustRoutes = require("./controllers/dateAdjustment");
const notificationRoutes = require("./routes/notifications");
const messagesRoutes = require("./routes/messages");
const membershipsRoutes = require("./routes/memberships");
const googleEventRoutes = require("./routes/googleEvents");
const uploadRoutes = require("./routes/upload");
const announcementRoutes = require("./routes/announcements");
const appVersionRoutes = require("./routes/appVersionRoutes");
const adminRoutes = require("./routes/admin");

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Render load balancer)

// Rate limiting configuration
const rateLimit = require('express-rate-limit');

// General API rate limiter - 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter rate limiter for authentication endpoints - 5 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin endpoints rate limiter - 10 requests per 15 minutes
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many admin requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Routes
app.use("/api/messages", messagesRoutes);
app.use("/api/firebase", notificationRoutes);
app.use("/api/auth", authLimiter, authRoute); // Stricter limit for auth
app.use("/api/events", eventRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/pledges", pledgeRoutes);
app.use("/api/rsvps", rsvpRoutes);
app.use("/api/date-adjust", dateAdjustRoutes);
app.use("/api/membership", membershipsRoutes);
app.use("/api/google", googleEventRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/app-version", appVersionRoutes);
app.use("/api/admin", adminLimiter, adminRoutes); // Stricter limit for admin

// Database connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB: IABA"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
