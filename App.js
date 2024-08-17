const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const cors = require("cors");

require("dotenv").config();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
const mongoose = require("mongoose");


// MongoDB connection with error handling
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1); // Exit the process with a failure code
  });

// Importing routes
const authRouter = require("./routes/authRoute");

// Define routes
//! For Testing
// app.use((req, res, next) => {
//   console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
//   console.log("Headers:", req.headers);
//   console.log("Body:", req.body);
//   console.log("Query Params:", req.query);
//   next();
// });
app.use("/auth", authRouter);
app.use("/public", express.static("public"));
// Starting the server with improved error handling
app.listen(PORT, (err) => {
  if (err) {
    console.error("Failed to start the server", err);
    process.exit(1); // Exit if the server fails to start
  }
  console.log(`App is running on port ${PORT}`);
});
