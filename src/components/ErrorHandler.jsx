import React from 'react';

const ErrorHandler = ({ error }) => {
  if (!error) return null;

  return (
    <div className="error-handler">
      <p>Error: {error.message || 'An unexpected error occurred.'}</p>
    </div>
  );
};

export default ErrorHandler;