import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

const ConnectionStatus = ({ connected }) => {
  return (
    <div className="border-t border-neutral-200 px-4 py-2 text-xs flex items-center">
      {connected ? (
        <>
          <Wifi size={14} className="text-success-500 mr-2" />
          <span className="text-success-700">Connected</span>
        </>
      ) : (
        <>
          <WifiOff size={14} className="text-error-500 mr-2" />
          <span className="text-error-700">Disconnected</span>
        </>
      )}
    </div>
  );
};

export default ConnectionStatus;