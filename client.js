/**
 * Initializes and displays the local camera feed.
 * @throws {DOMException} If camera/microphone permissions are denied.
 */
const localVideo = document.getElementById('localVideo');

async function initLocalStream() {
  try {
    const constraints = { video: true, audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localVideo.srcObject = stream;
  } catch (err) {
    console.error("Failed to access media devices:", err);
    alert("Camera/mic access is required for ConfApp.");
  }
}

// Initialize on load
initLocalStream();