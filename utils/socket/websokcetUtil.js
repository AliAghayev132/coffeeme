const User = require('../../schemas/User');
const Partner = require('../../schemas/Partner'); // Assuming you have a Partner schema
const jwt = require('jsonwebtoken');

const USERS_CONNECTIONS = {};
const PARTNERS_CONNECTIONS = {};
const ADMIN_CONNECTIONS = {};

const handleWebSocketConnection = (wss) => {
    wss.on('connection', async (ws, req) => {
        try {
            const url = req.url.split('?')[1]; // Extract the query string part
            const searchParams = new URLSearchParams(url);

            const token = searchParams.get('token');
            const role = searchParams.get('role');
            if (!token || !role) {
                ws.close();
                return;
            }

            jwt.verify(token, process.env.ACCESS_SECRET_KEY, async (err, decoded) => {
                if (err) {
                    ws.close();
                    return;
                }

                if (role === "user") {
                    const { email } = decoded;

                    const user = await User.findOne({ email });
                    if (user && user._id) {
                        USERS_CONNECTIONS[user._id] = ws; // Store the WebSocket connection by user ID

                        ws.on('message', (message) => {
                            console.log(`Received message from user ${user._id}:`, message);
                        });

                        ws.on('close', () => {
                            delete USERS_CONNECTIONS[user._id]; // Clean up when the connection is closed
                        });
                    } else {
                        ws.close();
                    }

                    // Handle connection for partners
                } else if (role === "partner") {
                    const { username } = decoded;
                    const partner = await Partner.findOne({ username });

                    if (partner && partner._id) {
                        PARTNERS_CONNECTIONS[partner._id] = ws; // Store the WebSocket connection by partner ID

                        ws.on('message', (message) => {
                            console.log(`Received message from partner ${partner._id}:`, message);
                        });

                        ws.on('close', () => {
                            delete PARTNERS_CONNECTIONS[partner._id]; // Clean up when the connection is closed
                        });
                    } else {
                        ws.close();
                    }

                } else {
                    ws.close(); // Close connection if role is neither 'user' nor 'partner'
                }
            });
        } catch (error) {
            console.error("WebSocket connection error:", error);
            ws.close();
        }
    });
};

module.exports = {
    handleWebSocketConnection,
    USERS_CONNECTIONS,
    PARTNERS_CONNECTIONS,
    ADMIN_CONNECTIONS
};