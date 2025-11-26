"""Database interaction helpers."""
from sqlalchemy.orm import Session

from . import models, schemas
from .security import hash_password, verify_password


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.query(models.User).filter(models.User.email == email).first()


def create_user(db: Session, user_in: schemas.UserCreate) -> models.User:
    print(user_in.password)
    db_user = models.User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=hash_password(user_in.password),
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def authenticate_user(db: Session, email: str, password: str) -> models.User | None:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def list_connections(db: Session) -> list[models.Connection]:
    return db.query(models.Connection).order_by(models.Connection.created_at.desc()).all()


def get_connection(db: Session, connection_id: int) -> models.Connection | None:
    return db.query(models.Connection).filter(models.Connection.id == connection_id).first()


def get_connection_by_name(db: Session, name: str) -> models.Connection | None:
    return db.query(models.Connection).filter(models.Connection.name == name).first()


def create_connection(db: Session, payload: schemas.ConnectionCreate) -> models.Connection:
    connection = models.Connection(
        name=payload.name.strip(),
        connection_string=payload.connection_string.strip(),
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection


def delete_connection(db: Session, connection_id: int) -> bool:
    connection = get_connection(db, connection_id)
    if not connection:
        return False
    db.delete(connection)
    db.commit()
    return True


def update_connection(db: Session, connection: models.Connection, payload: schemas.ConnectionUpdate) -> models.Connection:
    connection.name = payload.name.strip()
    connection.connection_string = payload.connection_string.strip()
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection
