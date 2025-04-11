import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Camera, Mic, Monitor, Wifi, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SettingsPage = () => {
  const navigate = useNavigate();
  const videoPreviewRef = useRef(null);
  const [devices, setDevices] = useState({ video: [], audio: [] });
  const [selectedDevices, setSelectedDevices] = useState({
    videoId: '',
    audioId: ''
  });
  const [localStream, setLocalStream] = useState(null);
  const [bandwidth, setBandwidth] = useState('medium');
  const [videoQuality, setVideoQuality] = useState('720p');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch available devices
  useEffect(() => {
    async function getDevices() {
      try {
        setIsLoading(true);
        // First request permissions to make sure device labels are available
        await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // Then enumerate devices
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        
        const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
        const audioDevices = deviceList.filter(device => device.kind === 'audioinput');
        
        setDevices({
          video: videoDevices,
          audio: audioDevices
        });
        
        // Select first devices by default
        setSelectedDevices({
          videoId: videoDevices.length > 0 ? videoDevices[0].deviceId : '',
          audioId: audioDevices.length > 0 ? audioDevices[0].deviceId : ''
        });
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Failed to access media devices. Please check your permissions.');
        setIsLoading(false);
      }
    }
    
    getDevices();
    
    // Cleanup function
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Update preview when selected devices change
  useEffect(() => {
    async function updatePreview() {
      // Stop previous stream if exists
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      try {
        // Only proceed if we have devices selected
        if (!selectedDevices.videoId && !selectedDevices.audioId) return;
        
        const constraints = {
          video: selectedDevices.videoId ? { 
            deviceId: { exact: selectedDevices.videoId },
            // Set resolution based on quality setting
            width: videoQuality === '1080p' ? 1920 : videoQuality === '720p' ? 1280 : 640,
            height: videoQuality === '1080p' ? 1080 : videoQuality === '720p' ? 720 : 480
          } : false,
          audio: selectedDevices.audioId ? { 
            deviceId: { exact: selectedDevices.audioId } 
          } : false
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error updating preview:', err);
        setError('Failed to access selected devices. Please try different ones.');
      }
    }
    
    updatePreview();
  }, [selectedDevices, videoQuality]);

  const handleVideoDeviceChange = (e) => {
    setSelectedDevices(prev => ({
      ...prev,
      videoId: e.target.value
    }));
  };

  const handleAudioDeviceChange = (e) => {
    setSelectedDevices(prev => ({
      ...prev,
      audioId: e.target.value
    }));
  };

  const handleSaveSettings = () => {
    // Save settings to localStorage
    localStorage.setItem('conferenceSettings', JSON.stringify({
      videoDeviceId: selectedDevices.videoId,
      audioDeviceId: selectedDevices.audioId,
      bandwidth,
      videoQuality
    }));
    
    // Go back to main view
    navigate('/');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-700">Loading device settings...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => navigate('/')}
        >
          Return to Conference
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center">
        <button 
          onClick={() => navigate('/')}
          className="mr-2 p-1 rounded-full hover:bg-gray-100"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
      
      <div className="flex flex-col md:flex-row flex-grow overflow-hidden">
        {/* Main content */}
        <div className="flex-grow p-4 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            {/* Video preview */}
            <div className="mb-8 bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-medium mb-4 flex items-center">
                <Camera className="mr-2" /> Video Preview
              </h2>
              <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4">
                <video 
                  ref={videoPreviewRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Camera
                  </label>
                  <select
                    value={selectedDevices.videoId}
                    onChange={handleVideoDeviceChange}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {devices.video.length === 0 && (
                      <option value="">No cameras available</option>
                    )}
                    {devices.video.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${device.deviceId.substring(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Video Quality
                  </label>
                  <select
                    value={videoQuality}
                    onChange={(e) => setVideoQuality(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="480p">Standard (480p)</option>
                    <option value="720p">HD (720p)</option>
                    <option value="1080p">Full HD (1080p)</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Audio settings */}
            <div className="mb-8 bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-medium mb-4 flex items-center">
                <Mic className="mr-2" /> Audio Settings
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Microphone
                </label>
                <select
                  value={selectedDevices.audioId}
                  onChange={handleAudioDeviceChange}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {devices.audio.length === 0 && (
                    <option value="">No microphones available</option>
                  )}
                  {devices.audio.map(device => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.substring(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Bandwidth settings */}
            <div className="mb-8 bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-medium mb-4 flex items-center">
                <Wifi className="mr-2" /> Bandwidth Settings
              </h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bandwidth Usage
                </label>
                <div className="flex flex-col space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={bandwidth === 'low'}
                      onChange={() => setBandwidth('low')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2">Low (Save data, lower quality)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={bandwidth === 'medium'}
                      onChange={() => setBandwidth('medium')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2">Medium (Balanced)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={bandwidth === 'high'}
                      onChange={() => setBandwidth('high')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2">High (Best quality)</span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* Display preferences */}
            <div className="mb-8 bg-white p-4 rounded-lg shadow">
              <h2 className="text-lg font-medium mb-4 flex items-center">
                <Monitor className="mr-2" /> Display Preferences
              </h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Layout
                </label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="grid">Grid (Show all participants equally)</option>
                  <option value="speaker">Speaker View (Focus on active speaker)</option>
                  <option value="sidebar">Sidebar (Active speaker + thumbnails)</option>
                </select>
              </div>
              
              <div className="flex flex-col space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2">Hide participants without video</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2">Mirror my video</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2">Show names on videos</span>
                </label>
              </div>
            </div>
            
            {/* Save button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md flex items-center transition-colors"
              >
                <Check size={18} className="mr-1" /> Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;