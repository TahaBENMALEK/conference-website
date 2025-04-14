import React from 'react';
import ErrorPage from './ErrorPage';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'UNKNOWN_ERROR'
    };
  }

  static getDerivedStateFromError(error) {
    // Map the error to our AppError types if possible
    let errorType = 'UNKNOWN_ERROR';
    
    if (error.name === 'NotAllowedError') {
      errorType = 'MEDIA_DENIED';
    } else if (error.message?.includes('Failed to connect') || error.name === 'ConnectionError') {
      errorType = 'CONNECTION_FAILED';
    } else if (error.message?.includes('disconnected') || error.name === 'DisconnectError') {
      errorType = 'PEER_DISCONNECTED';
    } else if (error.message?.includes('capacity') || error.name === 'CapacityError') {
      errorType = 'FULL_CAPACITY';
    }
    
    return { 
      hasError: true,
      errorType
    };
  }

  componentDidCatch(error, errorInfo) {
    // Capture the error details
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log the error
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    
    // You could send to an error reporting service here
    // reportErrorToService(error, errorInfo);
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorType: 'UNKNOWN_ERROR'
    });
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <ErrorPage 
          type={this.state.errorType}
          onReset={this.resetError}
          details={this.state.error?.message}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;