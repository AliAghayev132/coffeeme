const User = require('../../schemas/User');
const jwt = require('jsonwebtoken');

const USERS_CONNECTIONS = {};
const PARTNERS_CONNECTIONS = {};
const ADMIN_CONNECTIONS = {};

const handleWebSocketConnection = (wss) => {
    wss.on('connection', async (ws, req) => {
        try {
            const token = new URLSearchParams(req.url.split('?')[1]).get('token');
            if (!token) {
                ws.close();
                return;
            }

            jwt.verify(token, process.env.ACCESS_SECRET_KEY, async (err, decoded) => {
                if (err) {
                    ws.close();
                    return;
                }

                const { email } = decoded;
                const user = await User.findOne({ email }); // Ensure the query is awaited
                console.log(user);
                
                if (user && user._id) {
                    USERS_CONNECTIONS[user._id] = ws; // Store the WebSocket connection by user ID
                    console.log({USERS_CONNECTIONS});

                    ws.on('message', (message) => {
                        console.log(`Received message from user ${user._id}:`, message);
                    });

                    ws.on('close', () => {
                        delete USERS_CONNECTIONS[user._id]; // Clean up when the connection is closed
                    });
                } else {
                    ws.close();
                }
            });
        } catch (error) {
            console.error("WebSocket connection error:", error);
            ws.close();
        }
        console.log(USERS_CONNECTIONS);
    });
};

module.exports = {
    handleWebSocketConnection,
    USERS_CONNECTIONS,
    ADMIN_CONNECTIONS,
    PARTNERS_CONNECTIONS
};
