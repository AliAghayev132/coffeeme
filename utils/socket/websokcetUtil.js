const User = require("../../schemas/User");
const Partner = require("../../schemas/Partner"); // Assuming you have a Partner schema
const jwt = require("jsonwebtoken");

const USERS_CONNECTIONS = {};
const PARTNERS_CONNECTIONS = {};
const ADMIN_CONNECTIONS = {}; // Not used in this snippet, but might be used elsewhere

const handleWebSocketConnection = (wss) => {
  wss.on("connection", async (ws, req) => {
    try {
      // Extract the query string from the URL
      const url = req.url.split("?")[1];
      const searchParams = new URLSearchParams(url);

      const token = searchParams.get("token");
      const role = searchParams.get("role");

      if (!token || !role) {
        ws.close(4000, "Token or role missing"); // Close with a reason
        return;
      }
      jwt.verify(token, process.env.ACCESS_SECRET_KEY, async (err, decoded) => {
        if (err) {
          ws.close(4001, "Invalid token"); // Close with a reason
          return;
        }

        console.log("Bura", { token, role });

        if (role === "user") {
          const { email } = decoded;
          const user = await User.findOne({ email });
          if (user && user._id) {
            USERS_CONNECTIONS[user._id] = ws;
            ws.on("message", (message) => {
              console.log(`Received message from user ${user._id}:`, message);
            });

            ws.on("close", () => {
              delete USERS_CONNECTIONS[user._id];
            });
          } else {
            ws.close(4002, "User not found"); // Close with a reason
          }
        } else if (role === "partner") {
          const { username } = decoded;
          const partner = await Partner.findOne({ username });
          if (partner && partner._id) {
            PARTNERS_CONNECTIONS[partner._id] = ws;

            ws.on("message", (message) => {
              console.log(
                `Received message from partner ${partner._id}:`,
                message
              );
            });

            ws.on("close", () => {
              delete PARTNERS_CONNECTIONS[partner._id];
            });
          } else {
            ws.close(4003, "Partner not found"); // Close with a reason
          }
        } else {
          ws.close(4004, "Invalid role"); // Close with a reason
        }
      });
    } catch (error) {
      console.error("WebSocket connection error:", error);
      ws.close(4005, "Internal server error"); // Close with a reason
    }
  });
};

const CONNECTIONS = {
  user: USERS_CONNECTIONS,
  partner: PARTNERS_CONNECTIONS,
  admin: ADMIN_CONNECTIONS,
};

const socketMessageSender = (role, id, data) => {
  const to = CONNECTIONS[role][id];

  if (to) to.send(JSON.stringify(data));
};

module.exports = {
  handleWebSocketConnection,
  USERS_CONNECTIONS,
  PARTNERS_CONNECTIONS,
  ADMIN_CONNECTIONS,
  socketMessageSender,
};
