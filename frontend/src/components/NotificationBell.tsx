import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotificationBell = () => {
  const [unreadCount] = useState(0);

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        aria-label="Bildirimler"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
    </div>
  );
};

export default NotificationBell;
