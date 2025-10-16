const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/AppError");

// Store active SSE connections
const activeConnections = new Map();

// Send event to specific user
const sendEventToUser = (userId, eventType, data) => {
    const connection = activeConnections.get(userId);
    if (connection) {
        const eventData = {
            type: eventType,
            data: data,
            timestamp: new Date().toISOString()
        };
        
        console.log(`📡 [SSE] Sending ${eventType} event to user ${userId}:`, data);
        connection.write(`data: ${JSON.stringify(eventData)}\n\n`);
        return true;
    }
    console.log(`⚠️ [SSE] No active connection found for user ${userId}`);
    return false;
};

// Broadcast event to multiple users
const broadcastToUsers = (userIds, eventType, data) => {
    const delivered = [];
    const failed = [];
    
    userIds.forEach(userId => {
        if (sendEventToUser(userId, eventType, data)) {
            delivered.push(userId);
        } else {
            failed.push(userId);
        }
    });
    
    console.log(`📡 [SSE] Broadcast ${eventType}: delivered to ${delivered.length}, failed to ${failed.length}`);
    return { delivered, failed };
};

// SSE endpoint for real-time updates
const connectRealtime = catchAsync(async (req, res, next) => {
    // Handle authentication inside the controller
    const jwt = require("jsonwebtoken");
    const User = require("../models/userModel");
    
    let token;
    
    // Get token from query params (for EventSource compatibility)
    if (req.query.token) {
        token = req.query.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    }
    
    if (!token) {
        return next(new AppError("You are not logged in! Please log in to get access.", 401));
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
        return next(new AppError("The user belonging to this token does no longer exist.", 401));
    }
    
    const userId = currentUser._id.toString();
    
    console.log(`🔌 [SSE] User ${userId} connecting to real-time stream`);
    
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    // Send initial connection event
    res.write(`data: ${JSON.stringify({
        type: 'connected',
        data: { message: 'Real-time connection established', userId },
        timestamp: new Date().toISOString()
    })}\n\n`);
    
    // Store connection
    activeConnections.set(userId, res);
    
    // Handle client disconnect
    req.on('close', () => {
        console.log(`🔌 [SSE] User ${userId} disconnected from real-time stream`);
        activeConnections.delete(userId);
    });
    
    req.on('error', (error) => {
        console.error(`❌ [SSE] Connection error for user ${userId}:`, error);
        activeConnections.delete(userId);
    });
    
    // Keep connection alive with periodic heartbeat
    const heartbeat = setInterval(() => {
        if (activeConnections.has(userId)) {
            res.write(`data: ${JSON.stringify({
                type: 'heartbeat',
                data: { timestamp: new Date().toISOString() },
                timestamp: new Date().toISOString()
            })}\n\n`);
        } else {
            clearInterval(heartbeat);
        }
    }, 30000); // 30 second heartbeat
});

// Get list of currently connected users (for debugging)
const getConnectedUsers = catchAsync(async (req, res, next) => {
    const connectedUsers = Array.from(activeConnections.keys());
    
    res.status(200).json({
        status: "success",
        data: {
            connectedUsers,
            totalConnections: connectedUsers.length
        }
    });
});

// Export utility functions
module.exports = {
    connectRealtime,
    getConnectedUsers,
    sendEventToUser,
    broadcastToUsers,
    activeConnections
};