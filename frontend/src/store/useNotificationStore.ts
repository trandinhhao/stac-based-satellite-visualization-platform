import { create } from 'zustand';

export type NotificationSeverity = 'success' | 'error' | 'info' | 'warning';

interface NotificationState {
  open: boolean;
  message: string;
  severity: NotificationSeverity;
  showNotification: (message: string, severity?: NotificationSeverity) => void;
  hideNotification: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  open: false,
  message: '',
  severity: 'info',
  
  // Hiển thị một thông báo Toast nổi lên trên giao diện
  showNotification: (message, severity = 'info') =>
    set({ open: true, message, severity }),
    
  // Ẩn thông báo đi
  hideNotification: () => set({ open: false }),
}));
