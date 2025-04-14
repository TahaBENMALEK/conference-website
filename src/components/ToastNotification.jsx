import React, { useState, useEffect, createContext, useContext } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

// Create Context
const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now();
    const newToast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

// Hook to use the toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast Icon component
const ToastIcon = ({ type }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-5 w-5 text-red-500" />;
    case 'info':
    default:
      return <Info className="h-5 w-5 text-blue-500" />;
  }
};

// Individual Toast component
const Toast = ({ toast, removeToast }) => {
  const [isExiting, setIsExiting] = useState(false);
  
  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(() => {
      removeToast(toast.id);
    }, 300);
  };
  
  useEffect(() => {
    return () => clearTimeout(handleRemove);
  }, []);
  
  const getBgColor = () => {
    switch (toast.type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'info':
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div 
      className={`max-w-sm w-full rounded-lg shadow-md border p-4 mb-3 ${getBgColor()} transition-opacity duration-300 ${isExiting ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="flex items-start">
        <div className="shrink-0 mr-3">
          <ToastIcon type={toast.type} />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-800">{toast.message}</p>
        </div>
        <button 
          onClick={handleRemove}
          className="ml-4 text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// Container for all toasts
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};