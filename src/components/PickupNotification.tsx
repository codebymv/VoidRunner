import { useEffect, useState } from 'react';

interface PickupNotification {
  id: string;
  message: string;
  className: string;
  timestamp: number;
}

let notificationQueue: PickupNotification[] = [];
let listeners: ((notifications: PickupNotification[]) => void)[] = [];

export const showPickupNotification = (message: string, className: string) => {
  const notification: PickupNotification = {
    id: `pickup-${Date.now()}-${Math.random()}`,
    message,
    className,
    timestamp: Date.now(),
  };
  
  notificationQueue.push(notification);
  notifyListeners();
  
  // Auto-remove after 2 seconds
  setTimeout(() => {
    notificationQueue = notificationQueue.filter(n => n.id !== notification.id);
    notifyListeners();
  }, 2000);
};

const notifyListeners = () => {
  listeners.forEach(listener => listener([...notificationQueue]));
};

export const PickupNotifications = () => {
  const [notifications, setNotifications] = useState<PickupNotification[]>([]);

  useEffect(() => {
    listeners.push(setNotifications);
    return () => {
      listeners = listeners.filter(l => l !== setNotifications);
    };
  }, []);

  return (
    <div className="fixed bottom-0 right-0 z-50 pointer-events-none" style={{ right: '70px', bottom: '8px' }}>
      <div className="flex flex-col-reverse items-end gap-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`${notification.className} pointer-events-auto px-4 py-3 rounded-lg shadow-lg animate-in slide-in-from-right fade-in duration-300`}
          >
            {notification.message}
          </div>
        ))}
      </div>
    </div>
  );
};

