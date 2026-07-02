import { create } from 'zustand';
import { useJobStore } from './useJobStore';
import { useNotificationStore } from './useNotificationStore';

interface WebSocketState {
  connected: boolean;
  socket: WebSocket | null;
  connect: () => void;
  disconnect: () => void;
}

export const useWebSocketStore = create<WebSocketState>((set) => {
  let reconnectTimeoutId: any = null;
  let socketInstance: WebSocket | null = null;
  let heartbeatIntervalId: any = null;

  const startHeartbeat = (ws: WebSocket) => {
    stopHeartbeat();
    heartbeatIntervalId = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send('ping');
      }
    }, 30000); // 30s
  };

  const stopHeartbeat = () => {
    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId);
      heartbeatIntervalId = null;
    }
  };

  const connectSocket = () => {
    // Avoid double connections
    if (socketInstance && (socketInstance.readyState === WebSocket.CONNECTING || socketInstance.readyState === WebSocket.OPEN)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socketUrl = `${protocol}//${host}/ws/jobs`;

    const ws = new WebSocket(socketUrl);
    socketInstance = ws;

    ws.onopen = () => {
      set({ connected: true, socket: ws });
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
      }
      startHeartbeat(ws);
    };

    ws.onmessage = (event) => {
      if (event.data === 'pong') {
        return;
      }
      try {
        const data = JSON.parse(event.data);

        // Update Job list in useJobStore
        useJobStore.getState().updateJobFromEvent(data);

        // Show Toast Notifications for Completed or Failed states
        const jobTypeName = getJobTypeName(data.job_type);
        if (data.event === 'job_completed') {
          useNotificationStore.getState().showNotification(
            `Tác vụ ${jobTypeName} (ID: ${data.job_id.substring(0, 8)}) đã hoàn thành thành công!`,
            'success'
          );
        } else if (data.event === 'job_failed') {
          useNotificationStore.getState().showNotification(
            `Tác vụ ${jobTypeName} (ID: ${data.job_id.substring(0, 8)}) thất bại: ${data.error || 'Lỗi không xác định'}`,
            'error'
          );
        }
      } catch (err) {
        console.error('Error handling WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      set({ connected: false, socket: null });
      socketInstance = null;
      stopHeartbeat();
      
      // Auto-reconnect loop
      reconnectTimeoutId = setTimeout(() => {
        connectSocket();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket connection error:', error);
      ws.close();
    };
  };

  const getJobTypeName = (type?: string) => {
    switch (type) {
      case 'aoi_extraction':
        return 'Tìm kiếm ảnh theo AOI';
      case 'comparison':
        return 'So sánh ảnh vệ tinh';
      case 'object_detection':
        return 'Nhận diện đối tượng AI';
      default:
        return 'Xử lý nền';
    }
  };

  return {
    connected: false,
    socket: null,
    connect: () => {
      connectSocket();
    },
    disconnect: () => {
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId);
        reconnectTimeoutId = null;
      }
      stopHeartbeat();
      if (socketInstance) {
        socketInstance.close();
        socketInstance = null;
      }
      set({ connected: false, socket: null });
    },
  };
});
