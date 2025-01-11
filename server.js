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

  // Handle room creation
  socket.on("create_room", ({ room_id, room_name, admin_name }) => {
    socket.join(room_id); // Admin joins the room
    console.log(`Room created: ${room_id} by admin ${admin_name}`);

    // Notify the client that the room was created
    socket.emit("room_created", { success: true, room_id, room_name, admin_name });
  });

  // Handle joining a room
  socket.on("join_room", ({ room_id, participant_name }) => {
    if (!io.sockets.adapter.rooms.get(room_id)) {
      // Room doesn't exist
      socket.emit("room_joined", { success: false, error: "Room does not exist." });
      return;
    }

    socket.join(room_id); // User joins the room
    console.log(`User ${socket.id} (${participant_name}) joined room: ${room_id}`);

    // Notify the client
    socket.emit("room_joined", { success: true, room_id });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});


// Start the server
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
// Start the server

