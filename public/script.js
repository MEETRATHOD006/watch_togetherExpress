// 📌 CREATE ROOM EVENT LISTENER (Unchanged)

const createRoomButton = document.getElementById("create");
const createRoomPopup = document.getElementById("createRoomPopup");
const createRoomConfirmButton = document.getElementById("createRoomConfirm");
const closeCreateRoomPopupButton = document.getElementById(
  "closeCreateRoomPopup"
);

// Show Room Creation Popup
createRoomButton.addEventListener("click", () => {
  createRoomPopup.style.display = "block"; // Show the popup
});

// Confirm Room Creation
createRoomConfirmButton.addEventListener("click", async () => {
  const roomName = document.getElementById("roomName").value.trim();
  const adminName = document.getElementById("adminName").value.trim();

  // Validate inputs
  if (!roomName || !adminName) {
    alert("Please enter both Room Name and Admin Name.");
    return;
  }

  // Generate Room ID
  const roomId = generateRoomId();

  try {
    const response = await fetch(
      "https://watch-together-ef18.onrender.com/Backend/create_room.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `room_id=${encodeURIComponent(roomId)}&room_name=${encodeURIComponent(roomName)}&admin_name=${encodeURIComponent(adminName)}`,
      }
    );

    console.log("Request sent successfully");

    const text = await response.text();
    console.log("Raw Response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      alert("Server error: Invalid response format.");
      return;
    }

    if (data.status === "success") {
      updateUIAfterRoomCreation(roomId);
      alert("Room created successfully!");
    } else {
      console.error("Failed to create room:", data.message);
      alert("Failed to create room: " + data.message);
    }
  } catch (error) {
    console.error("Error creating room:", error);
    alert("An error occurred while creating the room. Please try again.");
  }
});

/**
 * Update UI after room creation
 */
function updateUIAfterRoomCreation(roomId) {
  // Update video calls display
  const displayVideoCalls = document.getElementById("displayvideocalls");
  const individualVideoDiv = document.createElement("div");
  individualVideoDiv.classList.add("individualsVideo");
  displayVideoCalls.appendChild(individualVideoDiv);

  // Replace buttons with room details
  const createJoinBtnDiv = document.querySelector(".creatJoinBtn");
  createJoinBtnDiv.innerHTML = `
    <span id="roomIdDisplay">Room ID: ${roomId}</span>
    <i class="fa-solid fa-copy" id="copyRoomId" style="cursor: pointer; color: yellow;"></i>
  `;

  // Admin Video Capture
  captureAdminVideo();

  // Enable copying Room ID
  document.getElementById("copyRoomId").addEventListener("click", () => {
    navigator.clipboard
      .writeText(roomId)
      .then(() => {
        alert("Room ID copied to clipboard!");
      })
      .catch((err) => {
        console.error("Error copying text: ", err);
      });
  });

  // Clear and hide popup
  createRoomPopup.style.display = "none";
  document.getElementById("roomName").value = "";
  document.getElementById("adminName").value = "";
}


closeCreateRoomPopupButton.addEventListener("click", () => {
  createRoomPopup.style.display = "none"; // Close the create room popup
  document.getElementById("roomName").value = "";
  document.getElementById("adminName").value = "";
});

async function captureAdminVideo() {
  try {
    // Accessing the user's camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });

    // Create a video element
    const videoElement = document.createElement("video");
    videoElement.id = "adminVideo"; // Optional: Set an ID for the video element
    videoElement.srcObject = stream;
    videoElement.autoplay = true; // Play video automatically
    videoElement.muted = true; // Mute the video for the admin (optional)

    // Find the individualsVideo div inside the displayvideocalls div
    const displayVideoCalls = document.getElementById("displayvideocalls");
    const individualsVideoDiv =
      displayVideoCalls.querySelector(".individualsVideo");

    // Append the video element to the individualsVideo div
    individualsVideoDiv.appendChild(videoElement);
  } catch (error) {
    console.error("Error accessing the camera: ", error);
  }
}

// 📌 JOIN ROOM POPUP HANDLER
const joinButton = document.getElementById("join");
const joinPopup = document.getElementById("join-popup");
const closePopupButton = document.getElementById("closePopup");
const joinRoomButton = document.getElementById("joinRoom");
const joinRoomIdInput = document.getElementById("joinRoomId");
const joinErrorText = document.getElementById("joinError");

// Show Join Popup
// Show Join Popup
// Show Join Popup
joinButton.addEventListener("click", () => {
  joinPopup.style.display = "block";
});

// Close Join Popup
closePopupButton.addEventListener("click", () => {
  joinPopup.style.display = "none";
  joinErrorText.style.display = "none";
  joinRoomIdInput.value = "";
});

// Handle Room Joining
joinRoomButton.addEventListener("click", async () => {
  const roomId = joinRoomIdInput.value.trim();

  // Validation: Check if roomId is empty
  if (!roomId) {
    joinErrorText.textContent = "Please enter a Room ID.";
    joinErrorText.style.display = "block";
    return;
  }

  try {
    // Send the join request to the backend
    const response = await fetch(
      "http://localhost/watch-together/Backend/join_room.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `room_id=${encodeURIComponent(roomId)}`,
      }
    );

    // Validate if the response is OK
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse JSON response
    const data = await response.json();

    if (data.status === "success") {
      // Replace Create/Join buttons with the Room ID display and copy icon
      const createJoinBtnDiv = document.querySelector(".creatJoinBtn");
      createJoinBtnDiv.innerHTML = `
        <span id="roomIdDisplay">Room ID: ${roomId}</span>
        <i class="fa-solid fa-copy" id="copyRoomId" style="cursor: pointer; color: yellow;"></i>
      `;

      // Listen for copy icon click to copy the room ID
      document
        .getElementById("copyRoomId")
        .addEventListener("click", function () {
          // Copy the room ID to the clipboard
          navigator.clipboard
            .writeText(roomId)
            .then(function () {
              alert("Room ID copied to clipboard!");
            })
            .catch(function (err) {
              console.error("Error copying text: ", err);
            });
        });

      // Close the join room popup
      joinPopup.style.display = "none";
      joinRoomIdInput.value = ""; // Clear the input field
    } else {
      // Handle backend validation error
      joinErrorText.textContent = data.message || "Failed to join the room.";
      joinErrorText.style.display = "block";
    }
  } catch (error) {
    // Handle fetch or JSON parsing errors
    console.error("Error joining room:", error);
    joinErrorText.textContent = "An error occurred. Please try again.";
    joinErrorText.style.display = "block";
  }
});

// 📌 Utility Function: Copy to Clipboard
function copyToClipboard(text) {
  navigator.clipboard
    .writeText(text)
    .then(() => alert("Room ID copied to clipboard!"))
    .catch((err) => console.error("Error copying text:", err));
}

function generateRoomId() {
  return Math.random().toString(36).substr(2, 9); // Random 9 character ID
}
