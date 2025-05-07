import React from 'react';
import ConnectionStatus from './ConnectionStatus';

function VideoPanel({ localVideoRef, username, isVideoEnabled, remoteStreams, participants, socketConnected }) {
  return (
    <div className="flex-1 p-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {/* Local video */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="relative aspect-video">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${!isVideoEnabled ? 'hidden' : ''}`}
            />
            {!isVideoEnabled && (
              <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
                  {username.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            <div className="absolute bottom-2 left-2 text-sm bg-black bg-opacity-60 text-white px-2 py-1 rounded-md">
              {username} (You)
            </div>
            <div className="absolute top-2 right-2">
              <ConnectionStatus connected={socketConnected} />
            </div>
          </div>
        </div>

        {/* Debug panel */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden p-3">
          <h3 className="font-medium mb-2">Debug Info</h3>
          <p className="text-sm">Participants: {participants.length}</p>
          <p className="text-sm">Remote Streams: {Object.keys(remoteStreams).length}</p>
          <p className="text-sm text-gray-500 mt-2">Participant IDs:</p>
          <div className="text-xs text-gray-500 mt-1 max-h-20 overflow-y-auto">
            {participants.map(p => 
              <div key={p.id}>{p.username}: {p.id.substring(0, 8)}... {p.isConnected ? '✓' : '✕'}</div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">Stream IDs:</p>
          <div className="text-xs text-gray-500 mt-1 max-h-20 overflow-y-auto">
            {Object.keys(remoteStreams).map(id => 
              <div key={id}>{remoteStreams[id].username}: {id.substring(0, 8)}...</div>
            )}
          </div>
        </div>

        {/* Remote videos */}
        {Object.entries(remoteStreams).map(([userId, { stream, username: remoteUsername }]) => {
          const participant = participants.find(p => p.id === userId);
          const isConnected = participant?.isConnected || false;
          const hasVideoTracks = stream && stream.getVideoTracks && stream.getVideoTracks().length > 0;
          
          return (
            <div key={userId} className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="relative aspect-video">
                {hasVideoTracks ? (
                  <video
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                    srcObject={stream}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
                      {(remoteUsername || '').charAt(0).toUpperCase() || '?'}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 text-sm bg-black bg-opacity-60 text-white px-2 py-1 rounded-md">
                  {remoteUsername || `User ${userId.substring(0, 4)}`}
                </div>
                <div className="absolute top-2 right-2">
                  <ConnectionStatus connected={isConnected} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VideoPanel;