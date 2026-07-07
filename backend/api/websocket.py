"""
API quản lý các kết nối WebSocket trực tiếp (Real-time WebSocket connection).
Cung cấp kênh truyền thông hai chiều thời gian thực để gửi tiến trình xử lý Job đến người dùng.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class ConnectionManager:
    """
    Quản lý danh sách các kết nối WebSocket đang hoạt động.
    Cung cấp các hàm kết nối, ngắt kết nối và gửi tin nhắn đồng loạt (broadcast).
    """
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """
        Chấp nhận kết nối WebSocket mới và thêm vào danh sách quản lý.
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"Đã kết nối client WebSocket mới. Tổng số kết nối hoạt động: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """
        Ngắt kết nối WebSocket và loại bỏ khỏi danh sách quản lý.
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"Đã đóng kết nối client WebSocket. Tổng số kết nối hoạt động: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """
        Gửi dữ liệu JSON tới tất cả các client đang kết nối đồng thời.
        Tự động dọn dẹp các kết nối lỗi hoặc đã bị đóng bất ngờ.
        """
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Không thể gửi tin nhắn qua WebSocket: {e}")
                self.disconnect(connection)

manager = ConnectionManager()

@router.websocket("/ws/jobs")
async def websocket_jobs_endpoint(websocket: WebSocket):
    """
    Endpoint WebSocket để duy trì kết nối thời gian thực theo dõi trạng thái các Jobs.
    Hỗ trợ nhận tin nhắn 'ping' của client và phản hồi bằng 'pong' để giữ kết nối không bị timeout.
    """
    await manager.connect(websocket)
    try:
        while True:
            # Chờ nhận tin nhắn để duy trì kết nối và phát hiện ngắt kết nối chủ động
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Lỗi kết nối WebSocket: {e}")
        manager.disconnect(websocket)
