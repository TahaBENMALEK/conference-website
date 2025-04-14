import React, { useEffect, useState, useRef } from 'react';

function ConferenceView({ socket, userId }) {
  const [participants, setParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Handle user connection
    socket.on('user-connected', (id) => {
      setParticipants((prev) => [...prev, id]);
    });

    // Handle user disconnection
    socket.on('user-disconnected', (id) => {
      setParticipants((prev) => prev.filter((participant) => participant !== id));
    });

    return () => {
      socket.off('user-connected');
      socket.off('user-disconnected');
    };
  }, [socket]);

  useEffect(() => {
    // Access local media
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      })
      .catch((error) => {
        console.error('Error accessing media devices:', error);
      });

    // Handle remote stream
    socket.on('remote-stream', (stream) => {
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    });

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
      socket.off('remote-stream');
    };
  }, [socket, localStream]);

  return (
    <div className="p-4 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold text-center text-primary-600 mb-6">Conference</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg shadow-md p-4 bg-white">
          <h2 className="text-lg font-semibold text-center mb-2">Your Video</h2>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto rounded-lg border"
          />
        </div>
        <div className="border rounded-lg shadow-md p-4 bg-white">
          <h2 className="text-lg font-semibold text-center mb-2">Remote Video</h2>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-auto rounded-lg border"
          />
        </div>
      </div>
    </div>
  );
}

export default ConferenceView;