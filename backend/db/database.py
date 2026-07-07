"""
Cấu hình kết nối cơ sở dữ liệu SQLAlchemy.
Khởi tạo engine kết nối tới PostgreSQL, định nghĩa lớp cơ sở Base cho các Model,
và thiết lập generator `get_db` để quản lý vòng đời của Session.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Lấy URL kết nối cơ sở dữ liệu từ biến môi trường
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgis:5432/postgis")

# Tạo engine kết nối và chỉ định search_path ưu tiên cho pgstac
engine = create_engine(
    DATABASE_URL,
    connect_args={"options": "-csearch_path=pgstac,public"}
)

# Cấu hình Session local dùng cho việc thực thi truy vấn
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Lớp cơ sở (Base class) cho toàn bộ các DB Models
Base = declarative_base()

def get_db():
    """
    Generator khởi tạo Session cơ sở dữ liệu cho các HTTP request.
    Đảm bảo session luôn được đóng tự động sau khi kết thúc request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
