const express = require("express");
const app = express();
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const https = require('https');
require("dotenv").config();
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
  // HTTP configuration
  server = require('http').createServer(app);
  console.log("HTTP server running");
}

// WebSocket setup
const wss = new WebSocket.Server({ server });
const { handleWebSocketConnection } = require("./utils/socket/websokcetUtil");
handleWebSocketConnection(wss);

const PORT = process.env.PORT || 3000;
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Order Timer
require("./utils/cronJobs/orderCron");
const mongoose = require("mongoose");
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1); // Exit the process with a failure code
  });

const partnerRouter = require("./routes/partnerRoute");
const adminRouter = require("./routes/adminRoute");
const userRouter = require("./routes/userRoute");

app.use("/api/admin", adminRouter);
app.use("/api/users", userRouter);
app.use("/api/partners", partnerRouter);
app.use("/public", express.static("public"));

app.use(express.static(path.join(__dirname, './client/dist')));

// Tüm rotaları index.html'e yönlendir
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './client/dist/index.html'));
});

/********************
       Swagger
*******************/
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Shop API",
    version: "1.0.0",
    description: "API documentation for the Shop management system",
  },
  servers: [
    {
      url: process.env.NODE_ENV === 'production' ? "https://coffeeme.app/api" : "http://localhost:3000/api",
      description: process.env.NODE_ENV === 'production' ? "Production server" : "Development server",
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ["./routes/*.js"], // Specify the route files
};

const swaggerSpec = swaggerJsdoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

server.listen(PORT, (err) => {
  if (err) {
    console.error("Failed to start the server", err);
    process.exit(1); // Exit if the server fails to start
  }
  console.log(`App is running on port ${PORT}`);
});
