const { Pool } = require('pg'); // PostgreSQL library

// PostgreSQL connection setup using connection string
const pool = new Pool({
  connectionString: 'postgresql://postgres.pezdqmellmcmewcvssbv:8594@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
  ssl: {
    rejectUnauthorized: false // Necessary for Render SSL connection
  }
});

async function joinRoom(req, res) {
  const { room_id, participant_name } = req.body;

  // Validate input
  if (!room_id || !participant_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
  // Check if the room exists in the database
  const result = await pool.query(
    'SELECT * FROM rooms WHERE room_id = $1',
    [room_id]
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const room = result.rows[0];
  const participants = room.participants || [];

  // Check if participant is already in the room
  if (participants.includes(participant_name)) {
    return res.status(400).json({ error: 'Participant already in the room' });
  }

  // Add the participant to the participants list
  participants.push(participant_name);

  // Update the participants list in the database
  const updateResult = await pool.query(
    'UPDATE rooms SET participants = $1 WHERE room_id = $2',
    [participants.join(','), room_id]
  );

  console.log('Updated participants:', updateResult);

  // Respond with room details and the updated list of participants
  res.json({
    message: 'Joined room successfully',
    data: {
      room_name: room.room_name,
      admin_name: room.admin_name,
      participants,
    },
  });
} catch (err) {
  console.error('Error joining room:', err.message);
  res.status(500).json({ error: 'An unexpected error occurred' });
}
}

module.exports = { joinRoom };
