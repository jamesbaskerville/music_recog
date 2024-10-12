from sqlalchemy import Column, String, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import uuid

SQLITE_DATABASE_URL = "sqlite:///./user.db"

engine = create_engine(
    SQLITE_DATABASE_URL, echo=True, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

DeclarativeBase = declarative_base()


class Base(DeclarativeBase):
    """
    Base class for all database models.
    """

    __abstract__ = True

    @staticmethod
    def __id_prefix__() -> str:
        raise NotImplementedError

    @staticmethod
    def __id__():
        return f"{Base.__id_prefix__()}:{uuid.uuid4()}"

    id = Column(String, primary_key=True, index=True, default=__id__)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
