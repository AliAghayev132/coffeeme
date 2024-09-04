import User from '../../schemas/User';
import jwt from 'jsonwebtoken';

export const USERS_CONNECTIONS = {};
export const PARTNERS_CONNECTIONS = {};
export const ADMIN_CONNECTIONS = {};

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
                const user = await User.findOne({ email }).exec(); // Ensure the query is awaited

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
    ADMIN_CONNECTIONS,
    PARTNERS_CONNECTIONS
};
