import React from 'react';
import ChatPanel from './ChatPanel';
import UserList from './UserList';

function SidebarPanel({ isOpen, activeTab, socket, username, participants, toggleTab }) {
  return (
    <div 
      className={`fixed right-0 top-0 bottom-0 w-80 bg-white shadow-lg border-l border-gray-200 z-10 transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      style={{ top: '56px', height: 'calc(100% - 56px - 60px)' }}
    >
      <div className="flex h-full flex-col">
        <div className="flex border-b border-gray-200">
          <button 
            className={`flex-1 py-3 font-medium text-sm ${activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => toggleTab('chat')}
          >
            Chat
          </button>
          <button 
            className={`flex-1 py-3 font-medium text-sm ${activeTab === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
            onClick={() => toggleTab('users')}
          >
            Participants ({participants.length})
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && <ChatPanel socket={socket} username={username} />}
          {activeTab === 'users' && <UserList users={participants} />}
        </div>
      </div>
    </div>
  );
}

export default SidebarPanel;