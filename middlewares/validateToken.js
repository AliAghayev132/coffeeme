const jwt = require("jsonwebtoken");
const validateAccessToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader)
      return res.status(401).json({ message: "No token provided" });
    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Token missing" });
    const decoded = jwt.verify(token, process.env.ACCESS_SECRET_KEY);
    delete decoded.password;
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = validateAccessToken;
