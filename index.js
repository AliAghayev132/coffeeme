const express = require("express");
const app = express();
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const WebSocket = require('ws');
const fs = require('fs');
const https = require('https');
require("dotenv").config();

const privateKey = fs.readFileSync('/etc/letsencrypt/live/coffeeme.app/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/coffeeme.app/fullchain.pem', 'utf8');
const credentials = { key: privateKey, cert: certificate };

const server = https.createServer(credentials, app);

const wss = new WebSocket.Server({ server });
const { handleWebSocketConnection } = require('./controllers/wsController');
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