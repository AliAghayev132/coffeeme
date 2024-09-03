const express = require("express");
const https = require("https");
const fs = require("fs");
const cors = require("cors");
const WebSocket = require("ws");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

require("dotenv").config();
const PORT = process.env.PORT || 3000;

const app = express();

// Load SSL Certificates
const privateKey = fs.readFileSync('/etc/letsencrypt/live/coffeeme.app/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/coffeeme.app/cert.pem', 'utf8');
const ca = fs.readFileSync('/etc/letsencrypt/live/coffeeme.app/chain.pem', 'utf8');

const credentials = {
  key: privateKey,
  cert: certificate,
  ca: ca,
};

// Create HTTPS server
const server = https.createServer(credentials, app);

// Initialize WebSocket Server on the same HTTPS server
const wss = new WebSocket.Server({ server, path: "/ws" });

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection with error handling
const mongoose = require("mongoose");
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1); // Exit the process with a failure code
  });

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  ws.on("message", (message) => {
    console.log("Received:", message);
    ws.send(`Hello, you sent -> ${message}`);
  });

  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});

// Routes
const partnerRouter = require("./routes/partnerRoute");
const adminRouter = require("./routes/adminRoute");
const userRouter = require("./routes/userRoute");

app.use("/api/admin", adminRouter);
app.use("/api/users", userRouter);
app.use("/api/partners", partnerRouter);

app.use("/public", express.static("public"));

// Swagger setup
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Shop API",
    version: "1.0.0",
    description: "API documentation for the Shop management system",
  },
  servers: [
    {
      url: "https://coffeeme.app/api",
      description: "Development server",
    },
  ],
};
const options = {
  swaggerDefinition,
  apis: ["./routes/*.js"],
};
const swaggerSpec = swaggerJsdoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Start the HTTPS server
server.listen(PORT, (err) => {
  if (err) {
    console.error("Failed to start the server", err);
    process.exit(1); // Exit if the server fails to start
  }
  console.log(`App is running on port ${PORT} over HTTPS and WSS`);
});
