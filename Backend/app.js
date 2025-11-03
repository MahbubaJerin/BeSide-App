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

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) === -1) {
        return callback(new AppError("CORS policy violation", 403), false);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

const baseUrl = "/api/v1";
app.use(`${baseUrl}/auth`, authRoutes);
app.use(`${baseUrl}/user`, userRoutes);
app.use(`${baseUrl}/trip`, tripRoutes);
app.use(`${baseUrl}/location`, locationRoutes);
app.use(`${baseUrl}/sos`, sosRoutes); // ✅ Add this line

// Additional route mounting for the new API structure
app.use("/api/trip", tripRoutes);

// health check for Render
app.get("/healthz", (req, res) => res.send("ok"));

app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server!`, 404));
});

app.use(errorHandler);

module.exports = app;
