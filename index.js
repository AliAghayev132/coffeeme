const express = require("express");
const app = express();
const fs = require('fs');
const path = require("path");
const cors = require("cors");
const WebSocket = require('ws');
const https = require('https');
const http = require('http');
const mongoose = require("mongoose");
require("dotenv").config();
require("./utils/cronJobs/orderCron");

// Routers
const partnerRouter = require("./routes/partnerRoute");
const adminRouter = require("./routes/adminRoute");
const userRouter = require("./routes/userRoute");
const subscriberRouter = require("./routes/subscriberRoute");

// Middleware
const setupMiddleware = () => {
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*", // Daha güvenli ayarlar için *.env dosyasına CORS_ORIGIN ekleyin
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Authorization", "Content-Type"],
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
};

// HTTPS Server Setup
const setupServer = () => {
  let server;
  if (process.env.NODE_ENV === 'production') {
    try {
      const privateKey = fs.readFileSync('/etc/letsencrypt/live/coffeeme.app/privkey.pem', 'utf8');
      const certificate = fs.readFileSync('/etc/letsencrypt/live/coffeeme.app/fullchain.pem', 'utf8');
      const credentials = { key: privateKey, cert: certificate };
      server = https.createServer(credentials, app);
      console.log("HTTPS server running");
    } catch (error) {
      console.error("Failed to load HTTPS credentials", error);
      process.exit(1);
    }
  } else {
    server = http.createServer(app);
    console.log("HTTP server running");
  }
  return server;
};

// WebSocket Setup
const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({ server });
  const { handleWebSocketConnection } = require("./utils/socket/websokcetUtil");
  handleWebSocketConnection(wss);
};

// Mongoose Connection
const connectToMongoDB = async () => {
  try {
    mongoose.connect(process.env.MONGO_URI); 
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
};

// Express Routes
const setupRoutes = () => {
  app.use("/api/admin", adminRouter);
  app.use("/api/users", userRouter);
  app.use("/api/partners", partnerRouter);
  app.use("/api/subscribers", subscriberRouter);
  app.use("/public", express.static("public"));

  // Serve static files for the client
  app.use(express.static(path.join(__dirname, './client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, './client/dist/index.html'));
  });
};

// Error Handling Middleware
const setupErrorHandling = () => {
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
  });
};

// Main Function to Setup and Start the Server
const startServer = async () => {
  setupMiddleware();
  const server = setupServer();
  setupWebSocket(server);
  await connectToMongoDB();
  setupRoutes();
  setupErrorHandling();

  server.listen(process.env.PORT || 3000, (err) => {
    if (err) {
      console.error("Failed to start the server", err);
      process.exit(1); // Exit if the server fails to start
    }
    console.log(`App is running on port ${process.env.PORT || 3000}`);
  });
};

startServer();
 