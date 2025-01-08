const express = require('express');
const { Pool } = require('pg'); // PostgreSQL library
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// PostgreSQL connection setup using connection string
const pool = new Pool({
  connectionString: 'postgresql://postgres:8594@db.pezdqmellmcmewcvssbv.supabase.co:5432/postgres',
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
      'INSERT INTO rooms (room_id, room_name, admin_name) VALUES ($1, $2, $3) RETURNING *',
      [room_id, room_name, admin_name]
    );
    res.status(200).json({ message: 'Room created successfully', data: result.rows[0] });
  } catch (err) {
    console.error('Failed to create room:', err.message);
    res.status(500).json({ error: 'Failed to create room' });
  }
});


// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
