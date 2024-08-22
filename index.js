const bodyParser = require("body-parser");
const express = require("express");
const app = express();
const cors = require("cors");

require("dotenv").config();
const PORT = process.env.PORT || 3000;
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
  })
);

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
const shopRouter = require("./routes/shopRoute");
const adminRouter = require("./routes/adminRoute");

// Define routes
app.use("/api/auth", authRouter);
app.use("/api/shop", shopRouter);
app.use("/api/admin", adminRouter);
app.use("/public", express.static("public"));
// Starting the server with improved error handling
app.listen(PORT, (err) => {
  if (err) {
    console.error("Failed to start the server", err);
    process.exit(1); // Exit if the server fails to start
  }
  console.log(`App is running on port ${PORT}`);
});
