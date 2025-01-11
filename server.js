const express = require('express');
const { Pool } = require('pg'); // PostgreSQL library
const bodyParser = require('body-parser');
const { joinRoom } = require('./joinRoomHandler');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

const { Server } = require("socket.io");
const http = require("http");

const server = http.createServer(app); // Wrap express app with HTTP server
// Adjust to your client domain if needed
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
}); // Attach Socket.IO to HTTP server

app.use('/socket.io', express.static(path.join(__dirname, 'node_modules/socket.io/client-dist')));

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.static('public'));
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'self' blob:");
    next();
  });

// PostgreSQL connection setup using connection string
const pool = new Pool({
  connectionString: 'postgresql://postgres.pezdqmellmcmewcvssbv:8594@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: {
    rejectUnauthorized: false // Necessary for Render SSL connection
  }
});

// Test the database connection
pool.connect()
  .then(() => console.log('Connected to PostgreSQL database'))
  .catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });

// POST request to create a room
app.post('/create_room', async (req, res) => {
  // Support both JSON body and query parameters
  const { room_id, room_name, admin_name } = req.body.room_id
    ? req.body
    : req.query;

  if (!room_id || !room_name || !admin_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const result = await pool.query(
      'INSERT INTO rooms (room_id, room_name, admin_name, participants) VALUES ($1, $2, $3, $4) RETURNING *',
      [room_id, room_name, admin_name, JSON.stringify([])]
    );
    res.status(200).json({ message: 'Room created successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Failed to create room:', err.message);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// POST request to join a room
app.post('/join_room', joinRoom);

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Handle joining a room
  socket.on("join_room", (roomId) => {
    socket.join(roomId); // User joins the room
    console.log(`User ${socket.id} joined room: ${roomId}`);
    socket.to(roomId).emit("user-connected", socket.id); // Notify others in the room
  });

  // Handle signaling messages
  socket.on("signal", ({ roomId, data }) => {
    socket.to(roomId).emit("signal", data); // Relay signaling data to other participants
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    io.emit("user-disconnected", socket.id); // Notify all clients
  });
});

// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
// Start the server

