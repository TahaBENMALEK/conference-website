import React from 'react';
import Navigation from './Navigation';

const Layout = ({ children }) => {
  return (
    <div className="flex flex-col h-screen bg-white">
      <Navigation />
      <main className="flex-grow overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;