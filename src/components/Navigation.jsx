import React from 'react';
import { MessageSquare, Video, Settings, Menu, X } from 'lucide-react';

const Navigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <nav className="bg-white border-b border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-primary-600 font-medium text-lg">ConfApp</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <a href="#" className="border-primary-500 text-neutral-900 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                <Video className="mr-2 h-4 w-4" />
                Conference
              </a>
              <a href="#" className="border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                <MessageSquare className="mr-2 h-4 w-4" />
                Chat
              </a>
              <a href="#" className="border-transparent text-neutral-500 hover:border-neutral-300 hover:text-neutral-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </a>
            </div>
          </div>
          <div className="flex items-center sm:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-neutral-400 hover:text-neutral-500 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <button className="bg-primary-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-600 transition duration-150 ease-in-out">
              Join Call
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <a href="#" className="bg-primary-50 border-primary-500 text-primary-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">Conference</a>
            <a href="#" className="border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">Chat</a>
            <a href="#" className="border-transparent text-neutral-500 hover:bg-neutral-50 hover:border-neutral-300 hover:text-neutral-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium">Settings</a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;