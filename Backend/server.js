const app = require("./app");
const connectDb = require("./config/db");
const locationService = require("./services/locationService");
const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, '.env') });

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

const port = process.env.PORT || 3000;

const server = app.listen(port, async () => {
  console.log(`🚀 [SERVER] Server running on port ${port}`);
  console.log(`📍 [SERVER] Location tracking system initialized`);
  console.log(`🔍 [SERVER] Companion search APIs ready`);
  console.log(`🧹 [SERVER] Location cleanup service started`);

  await connectDb();
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! 💥 Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on("SIGTERM", () => {
  console.log("👋 SIGTERM RECEIVED. Shutting down gracefully");
  server.close(() => {
    console.log("💥 Process terminated!");
  });
});