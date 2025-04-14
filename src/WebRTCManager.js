export async function requestMediaPermissions(options = { video: true, audio: true }) {
    console.log('Requesting camera and microphone permissions...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia(options);
      console.log('Media stream obtained successfully');
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error.name, error.message);
      
      let userMessage = 'Failed to access media devices.';
      
      if (error.name === 'NotAllowedError') {
        userMessage = 'Camera/microphone access was denied. Please allow access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        userMessage = 'No camera or microphone found. Please connect a device and try again.';
      } else if (error.name === 'NotReadableError') {
        userMessage = 'Your camera or microphone is already in use by another application.';
      }
      
      throw { 
        original: error,
        message: userMessage,
        type: error.name
      };
    }
  }
  
  // New function to check if permissions are already granted
  export async function checkMediaPermissions() {
    try {
      const permissions = await navigator.permissions.query({ name: 'camera' });
      const micPermissions = await navigator.permissions.query({ name: 'microphone' });
      
      return {
        camera: permissions.state,
        microphone: micPermissions.state
      };
    } catch (err) {
      console.warn('Cannot check permissions status:', err);
      return { camera: 'unknown', microphone: 'unknown' };
    }
  }