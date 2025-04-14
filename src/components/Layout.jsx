import React from 'react';
import Navigation from './Navigation';
import ErrorBoundary from './ErrorBoundary';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col h-full">
      <ErrorBoundary>
        <Navigation />
        <main className="flex-grow overflow-hidden">
          {children}
        </main>
        {/* Add padding at the bottom for mobile navigation */}
        <div className="h-14 md:hidden"></div>
      </ErrorBoundary>
    </div>
  );
};

export default Layout;