const express = require('express');
const { Pool } = require('pg'); // PostgreSQL library
const bodyParser = require('body-parser');
const { joinRoom } = require('./joinRoomHandler');
const path = require('path');
const db = require('./db');
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

// In-memory storage for real-time performance
const rooms = {};
const users = {};

// Load rooms from database on startup
async function loadRoomsFromDatabase() {
  const dbRooms = await db.getAllRooms(); // Fetch from database
  dbRooms.forEach((room) => {
    rooms[room.room_id] = { 
      room_name: room.room_name, 
      admin_name: room.admin_name, 
      participants: room.participants || [] // Use JSON array directly
    };
  });
}

// Socket.IO connections
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("create_room", async ({ room_id, room_name, admin_name }) => {
    if (rooms[room_id]) {
      socket.emit("room_created", { success: false, error: "Room already exists." });
      return;
    }

    // Add to database and memory
    await db.createRoom({ room_id, room_name, admin_name, participants: admin_name });
    rooms[room_id] = { room_name, admin_name, participants: [admin_name] };
    users[socket.id] = { room_id, participant_name: admin_name };

    socket.join(room_id);
    socket.emit("room_created", { success: true, room_id, room_name, admin_name });
  });

  socket.on("join_room", async ({ room_id, participant_name }) => {
    let room = rooms[room_id];

    if (!room) {
      const dbRoom = await db.getRoomById(room_id);
      if (!dbRoom) {
        socket.emit("room_joined", { success: false, error: "Room does not exist." });
        return;
      }
      // Add room to memory
      rooms[room_id] = { 
        room_name: dbRoom.room_name, 
        admin_name: dbRoom.admin_name, 
        participants: dbRoom.participants.split(",") 
      };
      room = rooms[room_id];
    }

    room.participants.push(participant_name);
    await db.updateParticipants(room_id, JSON.stringify(room.participants));
    users[socket.id] = { room_id, participant_name };

    socket.join(room_id);
    socket.emit("room_joined", { success: true, room_id, room_name: room.room_name });
    socket.to(room_id).emit("room_update", { participants: room.participants });
  });

  socket.on("disconnect", async () => {
    const user = users[socket.id];
    if (!user) return;

    const { room_id, participant_name } = user;
    const room = rooms[room_id];
    if (!room) return;

    // Update participants in memory and database
    room.participants = room.participants.filter((name) => name !== participant_name);
    await db.updateParticipants(room_id, room.participants);
    delete users[socket.id];

    if (room.participants.length === 0) {
      await db.deleteRoom(room_id); // Clean up empty room
      delete rooms[room_id];
    }

    socket.to(room_id).emit("room_update", { participants: room.participants });
  });
});

// Start server and load rooms
server.listen(port, async () => {
  await loadRoomsFromDatabase();
  console.log(`Server running on http://localhost:${port}`);
});
// Start the server

