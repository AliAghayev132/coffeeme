const express = require("express");
const app = express();
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');
require("dotenv").config();

// const privateKey = fs.readFileSync('/etc/letsencrypt/live/coffeeme.app/privkey.pem', 'utf8');
// const certificate = fs.readFileSync('/etc/letsencrypt/live/coffeeme.app/fullchain.pem', 'utf8');
// const credentials = { key: privateKey, cert: certificate };

const wss = new WebSocket.Server({ noServer: true });

const server = https.createServer( app);

server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  console.log('A new client connected.');

  // Event listener for incoming messages
  ws.on('message', (message) => {
    console.log('Received message:', message.toString());

    // Broadcast the message to all connected clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message.toString());
      }
    });
  });

  // Event listener for client disconnection
  ws.on('close', () => {
    console.log('A client disconnected.');
  });
});

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
const mongoose = require("mongoose");

// MongoDB connection with error handling
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
// Starting the server with improved error handling

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
      url: "https://coffeeme.app/api",
      description: "Development server",
    },
  ],
};
const options = {
  swaggerDefinition,
  apis: ["./routes/*.js"], // Route dosyalarınızın yerini belirtin
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