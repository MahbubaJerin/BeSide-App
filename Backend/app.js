const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const xss = require("xss-clean");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, '.env') });

const AppError = require("./utils/AppError");
const errorHandler = require("./middlewares/errorHandler");

const authRoutes = require("./routes/authRoutes");
const sosRoutes = require("./routes/sosRoutes");
const userRoutes = require("./routes/userRoutes");
const tripRoutes = require("./routes/tripRoutes");
const locationRoutes = require("./routes/locationRoutes");

const app = express();

app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

const limiter = rateLimit({
  max: process.env.RATE_LIMIT_MAX || 10000, // Dramatically increased for development 
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes for development
  message: JSON.stringify({ status: "error", message: "Too many requests from this IP, please try again later!" }),
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
// Temporarily disable rate limiting for development
// app.use("/api", limiter);

app.use(express.json({ limit: "10mb" })); // Increased for image uploads
app.use(express.urlencoded({ extended: true, limit: "10mb" })); // Increased for image uploads
app.use(cookieParser());

app.use(mongoSanitize());

app.use(xss());

// Railway deployment CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // In production, allow specific origins
    if (process.env.NODE_ENV === 'production') {
      const allowedOrigins = [
        'https://beside-production.up.railway.app',
        'exp://192.168.1.100:8081', // Your local IP for Expo dev
        'myapp://', // Your app scheme
        /^exp:\/\/.*/, // Any Expo development URL
        /^https:\/\/.*\.ngrok\.io$/, // Allow ngrok URLs for testing
      ];
      
      const isAllowed = allowedOrigins.some(allowedOrigin => {
        if (typeof allowedOrigin === 'string') return allowedOrigin === origin;
        return allowedOrigin.test(origin);
      });
      
      if (isAllowed) return callback(null, true);
      return callback(new AppError("CORS policy violation", 403), false);
    } else {
      // In development, allow all origins
      return callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Railway health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: process.env.PORT || 3000
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'BeSide API is running!',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  });
});

const baseUrl = "/api/v1";
app.use(`${baseUrl}/auth`, authRoutes);
app.use(`${baseUrl}/user`, userRoutes);
app.use(`${baseUrl}/trip`, tripRoutes);
app.use(`${baseUrl}/location`, locationRoutes);
app.use(`${baseUrl}/sos`, sosRoutes);

// Additional route mounting for compatibility
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/trip", tripRoutes);


app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

app.use(errorHandler);

module.exports = app;
