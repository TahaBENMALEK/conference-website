import React, { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

// Define error page for different error types
const ErrorPage = ({ errorType, resetError }) => {
  let title, message, icon;
  
  switch (errorType) {
    case 'MEDIA_DENIED':
      title = 'Camera/Microphone Access Denied';
      message = 'Please allow access to your camera and microphone to join the conference.';
      icon = '🎥❌';
      break;
    case 'CONNECTION_FAILED':
      title = 'Connection Failed';
      message = 'Unable to connect to the conference. Please check your internet connection.';
      icon = '🔌❌';
      break;
    case 'PEER_DISCONNECTED':
      title = 'Participant Disconnected';
      message = 'A participant has disconnected unexpectedly.';
      icon = '👥❌';
      break;
    case 'FULL_CAPACITY':
      title = 'Room at Full Capacity';
      message = 'This conference room has reached its maximum capacity of participants.';
      icon = '🚫';
      break;
    default:
      title = 'Something Went Wrong';
      message = 'An unexpected error occurred. Please try refreshing the page.';
      icon = '⚠️';
  }

  return (
    <div className="flex items-center justify-center h-full p-4 bg-gray-50">
      <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <h2 className="text-xl font-bold mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <button
          onClick={resetError}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

// Toast component for non-fatal errors
export const ErrorToast = ({ message, onClose }) => {
  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white rounded-lg shadow-lg z-50 max-w-xs transition-opacity">
      <div className="flex items-center p-3">
        <AlertTriangle size={20} className="mr-2" />
        <p className="flex-grow">{message}</p>
        <button 
          onClick={onClose}
          className="ml-2 text-white hover:text-gray-100"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorType: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Identify error type based on error message or custom error property
    let errorType = 'UNKNOWN';
    
    if (error.name === 'NotAllowedError') {
      errorType = 'MEDIA_DENIED';
    } else if (error.message && error.message.includes('network')) {
      errorType = 'CONNECTION_FAILED';
    } else if (error.message && error.message.includes('peer')) {
      errorType = 'PEER_DISCONNECTED';
    } else if (error.message && error.message.includes('capacity')) {
      errorType = 'FULL_CAPACITY';
    }
    
    return { 
      hasError: true, 
      error,
      errorType
    };
  }

  componentDidCatch(error, errorInfo) {
    // You can log the error to an error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ 
      hasError: false,
      error: null,
      errorType: null
    });
    
    // Call onReset if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorPage 
          errorType={this.state.errorType} 
          resetError={this.resetError} 
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;