import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, WifiLow, Loader2 } from 'lucide-react';

const ConnectionStatus = ({ connected, socket, onReconnect }) => {
  const [status, setStatus] = useState('checking');
  const [lastPing, setLastPing] = useState(null);
  const [pingMisses, setPingMisses] = useState(0);

  // Monitor socket connection state
  useEffect(() => {
    if (!socket) {
      setStatus('disconnected');
      return;
    }

    // Set initial status based on connected prop
    setStatus(connected ? 'connected' : 'checking');
    
    // Set up ping/pong for connection health check if connected
    if (socket) {
      const pingInterval = setInterval(() => {
        if (socket.connected) {
          socket.volatile.emit('ping');
          setLastPing(Date.now());
        } else {
          // Try to reconnect if socket exists but is not connected
          if (onReconnect) {
            onReconnect();
          }
        }
      }, 10000); // Reduced ping frequency
      
      // Listen for pong responses
      const handlePong = () => {
        setLastPing(Date.now());
        setPingMisses(0); // Reset ping misses when pong received
        setStatus('connected'); // Always set connected when we receive a pong
      };
      socket.on('pong', handlePong);
      
      return () => {
        clearInterval(pingInterval);
        socket.off('pong', handlePong);
      };
    }
  }, [connected, socket, onReconnect]);

  // More tolerant check for stale connection
  useEffect(() => {
    if (status !== 'disconnected' && lastPing) {
      const checkStaleInterval = setInterval(() => {
        const elapsed = Date.now() - lastPing;
        
        // Be more tolerant - only consider disconnected after multiple missed pings
        if (elapsed > 30000) { // 30 seconds without a pong
          console.warn('Connection appears stale, increasing miss count');
          
          // Increment miss counter
          setPingMisses(prev => {
            const newCount = prev + 1;
            
            // Only attempt reconnect after 3+ misses
            if (newCount >= 3) {
              console.warn('Multiple pings missed, attempting reconnect');
              setStatus('reconnecting');
              if (socket && onReconnect) {
                onReconnect();
              }
              return 0; // Reset counter after reconnect attempt
            }
            return newCount;
          });
        }
      }, 10000);

      return () => clearInterval(checkStaleInterval);
    }
  }, [status, lastPing, socket, onReconnect]);

  // Socket connection event listeners for more reliable connection status
  useEffect(() => {
    if (socket) {
      const handleConnect = () => {
        console.log('Socket connected event received');
        setStatus('connected');
        setPingMisses(0);
      };
      
      const handleDisconnect = (reason) => {
        console.log(`Socket disconnect event: ${reason}`);
        // Don't immediately set disconnected for transport close
        if (reason === 'io server disconnect') {
          setStatus('disconnected');
        } else {
          // For other reasons like transport close, be more tolerant
          setStatus('reconnecting');
        }
      };
      
      const handleReconnectAttempt = (attempt) => {
        console.log(`Reconnect attempt ${attempt}`);
        setStatus('reconnecting');
      };
      
      const handleReconnect = () => {
        console.log('Socket reconnected');
        setStatus('connected');
        setPingMisses(0);
      };
      
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('reconnect_attempt', handleReconnectAttempt);
      socket.on('reconnect', handleReconnect);
      
      return () => {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('reconnect_attempt', handleReconnectAttempt);
        socket.off('reconnect', handleReconnect);
      };
    }
  }, [socket]);

  const statusConfig = {
    checking: {
      icon: <WifiLow size={14} className="text-yellow-600 animate-pulse" />,
      text: 'Connecting...',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700'
    },
    connected: {
      icon: <Wifi size={14} className="text-green-600" />,
      text: 'Connected',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700'
    },
    disconnected: {
      icon: <WifiOff size={14} className="text-red-600" />,
      text: 'Disconnected',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700'
    },
    reconnecting: {
      icon: <Loader2 size={14} className="text-blue-600 animate-spin" />,
      text: 'Reconnecting...',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700'
    }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center space-x-2">
      <div className={`px-2 py-1 rounded-full text-xs flex items-center ${config.bgColor}`}>
        {config.icon}
        <span className={`ml-1 ${config.textColor}`}>{config.text}</span>
      </div>
      
      {(status === 'disconnected' || status === 'reconnecting') && (
        <button 
          onClick={() => socket && socket.connect()}
          className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
        >
          Reconnecter
        </button>
      )}
    </div>
  );
};

export default ConnectionStatus;