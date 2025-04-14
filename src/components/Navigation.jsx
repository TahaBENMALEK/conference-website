import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Video, MessageSquare, Settings, Users, Home } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  const navItems = [
    { path: '/', icon: <Home size={20} />, label: 'Home' },
    { path: '/conference', icon: <Video size={20} />, label: 'Conference' },
    { path: '/chat', icon: <MessageSquare size={20} />, label: 'Messages' },
    { path: '/participants', icon: <Users size={20} />, label: 'Participants' },
    { path: '/settings', icon: <Settings size={20} />, label: 'Settings' }
  ];

  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      {/* Desktop navigation */}
      <div className="hidden md:flex justify-between max-w-6xl mx-auto">
        <div className="flex items-center px-4 h-16">
          <Link to="/" className="flex items-center">
            <span className="text-blue-600 font-bold text-xl mr-1">Conf</span>
            <span className="text-gray-800 font-bold text-xl">App</span>
          </Link>
        </div>
        
        <div className="flex h-16">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center px-4 border-b-2 font-medium text-sm transition-colors ${
                isActive(item.path)
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-1">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
      
      {/* Mobile navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="grid grid-cols-5">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-2 text-xs font-medium ${
                isActive(item.path) ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <div className="mb-1">{item.icon}</div>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Navigation;