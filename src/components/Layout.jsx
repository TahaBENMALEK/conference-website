import React from 'react';
import Navigation from './Navigation';
import ErrorBoundary from './ErrorBoundary';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <ErrorBoundary>
        <Navigation />
        <main className="flex-grow overflow-hidden">
          {children}
        </main>
      </ErrorBoundary>
    </div>
  );
};

export default Layout;