import React, { useEffect } from 'react';
import { AlertTriangle, Camera, Wifi, Users, Server } from 'lucide-react';

const ErrorPage = ({ type = 'UNKNOWN_ERROR', onReset, details = '' }) => {
  // Define error messages and actions for each error type
  const errorConfig = {
    'MEDIA_DENIED': {
      title: 'Camera/Microphone Access Denied',
      description: 'ConfApp needs access to your camera and microphone to join the conference. Please allow access in your browser settings and try again.',
      icon: <Camera className="h-12 w-12 text-red-500" />,
      primaryAction: 'Grant Access',
      secondaryAction: 'Continue Without Media'
    },
    'CONNECTION_FAILED': {
      title: 'Connection Failed',
      description: 'Unable to connect to the conference server. Please check your internet connection and try again.',
      icon: <Wifi className="h-12 w-12 text-red-500" />,
      primaryAction: 'Reconnect',
      secondaryAction: 'Refresh Page'
    },
    'PEER_DISCONNECTED': {
      title: 'Participant Disconnected',
      description: 'A participant has disconnected unexpectedly. This may be due to their internet connection.',
      icon: <Users className="h-12 w-12 text-yellow-500" />,
      primaryAction: 'Continue',
      secondaryAction: 'Refresh Page'
    },
    'FULL_CAPACITY': {
      title: 'Conference Full',
      description: 'This conference has reached its maximum capacity of participants.',
      icon: <Server className="h-12 w-12 text-yellow-500" />,
      primaryAction: 'Try Again Later',
      secondaryAction: 'Contact Support'
    },
    'UNKNOWN_ERROR': {
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred. Please try refreshing the page.',
      icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
      primaryAction: 'Refresh Page',
      secondaryAction: 'Contact Support'
    }
  };

  const { title, description, icon, primaryAction, secondaryAction } = errorConfig[type] || errorConfig['UNKNOWN_ERROR'];

  useEffect(() => {
    let isMounted = true;

    if (type === 'MEDIA_DENIED') {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(() => {
          if (isMounted) onReset();
        })
        .catch(err => console.error('Still unable to access media devices:', err));
    }

    return () => {
      isMounted = false;
    };
  }, [type, onReset]);

  const handlePrimaryAction = () => {
    // Handle primary action based on error type
    switch (type) {
      case 'MEDIA_DENIED':
        break;
      case 'CONNECTION_FAILED':
      case 'PEER_DISCONNECTED':
        onReset();
        break;
      case 'FULL_CAPACITY':
        window.location.href = '/waiting-room';
        break;
      default:
        window.location.reload();
    }
  };

  const handleSecondaryAction = () => {
    // Handle secondary action based on error type
    switch (type) {
      case 'MEDIA_DENIED':
        onReset();
        break;
      case 'CONNECTION_FAILED':
      case 'PEER_DISCONNECTED':
      case 'UNKNOWN_ERROR':
        window.location.reload();
        break;
      case 'FULL_CAPACITY':
        window.location.href = '/contact';
        break;
      default:
        onReset();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4">
            {icon}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-gray-600 mb-4">{description}</p>
          
          {details && (
            <div className="bg-gray-100 p-3 rounded-md text-sm text-gray-700 mb-4 w-full overflow-auto">
              <p className="font-mono">{details}</p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <button
              onClick={handlePrimaryAction}
              className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors flex-1"
            >
              {primaryAction}
            </button>
            <button
              onClick={handleSecondaryAction}
              className="py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium rounded-md transition-colors flex-1"
            >
              {secondaryAction}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;