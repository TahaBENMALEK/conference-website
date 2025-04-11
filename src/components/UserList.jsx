import React from 'react';
import { Users } from 'lucide-react';

const UserList = ({ users }) => {
  return (
    <div className="border-b border-neutral-200 p-4">
      <div className="flex items-center mb-3">
        <Users size={16} className="text-neutral-500 mr-2" />
        <span className="text-sm font-medium text-neutral-800">Participants ({users.length})</span>
      </div>
      
      <div className="max-h-32 overflow-y-auto space-y-1">
        {users.length === 0 ? (
          <div className="text-sm text-neutral-400">No active participants</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex items-center py-1">
              <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium mr-2">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-neutral-700">{user.name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserList;