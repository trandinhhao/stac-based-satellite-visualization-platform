import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Thêm thư mục hiện tại và thư mục backend vào sys.path để import các module dễ dàng
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import Base
from models.aoi import AOI  # Đảm bảo import các models phục vụ cho tính năng autogenerate của Alembic
from models.job import Job
from models.detection import Detection

# Đối tượng cấu hình Alembic, cung cấp quyền truy cập
# vào các giá trị bên trong tệp .ini đang được sử dụng.
config = context.config

# Thiết lập động URL kết nối cơ sở dữ liệu từ biến môi trường
db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgis:5432/postgis")
config.set_main_option("sqlalchemy.url", db_url)

# Giải thích tệp cấu hình cho trình ghi log Python.
# Dòng này thiết lập các bộ cấu hình logger.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Thêm đối tượng MetaData của model của bạn vào đây
# nhằm hỗ trợ tính năng tự động phát sinh mã di trú 'autogenerate'
target_metadata = Base.metadata

def include_object(object, name, type_, reflected, compare_to):
    # Chỉ quản lý các bảng do ứng dụng tự phát triển, tránh can thiệp vào các bảng hệ thống hoặc pgSTAC
    if type_ == "table":
        return name in ["aois", "jobs", "detections"]
    # Bảo vệ các chỉ mục không gian hoặc các đối tượng pgstac khác
    if type_ == "index" and name == "idx_aois_geometry":
        return True
    if type_ == "index":
        # Không quản lý các chỉ mục tự động suy luận từ các bảng khác
        return False
    return True

# Các giá trị khác từ cấu hình, được xác định bởi nhu cầu của env.py,
# có thể được truy xuất qua:
# my_important_option = config.get_main_option("my_important_option")
# ... v.v.


def run_migrations_offline() -> None:
    """Chạy di trú cơ sở dữ liệu ở chế độ 'ngoại tuyến' (offline).

    Cấu hình context chỉ với một URL kết nối
    mà không cần Engine, mặc dù Engine vẫn được chấp nhận ở đây.
    Bằng cách bỏ qua việc tạo Engine, chúng ta thậm chí không cần
    có sẵn thư viện kết nối cơ sở dữ liệu (DBAPI).

    Các cuộc gọi đến context.execute() ở đây sẽ in chuỗi truy vấn đã cho
    ra đầu ra của kịch bản lệnh.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Chạy di trú cơ sở dữ liệu ở chế độ 'trực tuyến' (online).

    Trong kịch bản này, chúng ta cần tạo một Engine
    và liên kết một kết nối trực tiếp với context.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
