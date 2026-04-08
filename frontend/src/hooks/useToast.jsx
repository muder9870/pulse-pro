import React, { useState, useCallback, useEffect, createContext, useContext } from 'react';

let toastId = 0;

/**
 * Custom hook for toast notifications
 * 
 * @returns {Object} Toast functions and state
 */
export const useToast = () => {
    const [toasts, setToasts] = useState([]);

    const showToast = useCallback(({
        type = 'info',
        message,
        duration = 3000,
        position = 'top-right'
    }) => {
        const id = ++toastId;
        const toast = {
            id,
            type,
            message,
            position,
            createdAt: Date.now()
        };

        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }

        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    const clearAll = useCallback(() => {
        setToasts([]);
    }, []);

    return {
        toasts,
        showToast,
        removeToast,
        clearAll,
        success: (message, duration) => showToast({ type: 'success', message, duration }),
        error: (message, duration) => showToast({ type: 'error', message, duration }),
        warning: (message, duration) => showToast({ type: 'warning', message, duration }),
        info: (message, duration) => showToast({ type: 'info', message, duration })
    };
};

// Create a global toast context
const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const toast = useToast();

    return (
        <ToastContext.Provider value={toast}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToastContext = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToastContext must be used within ToastProvider');
    }
    return context;
};
