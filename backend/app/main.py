"""FastAPI entry-point."""
from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import crud, schemas
from .database import Base, engine, get_db
from .settings import get_settings
from .sql_executor import execute_sql_query, test_connection_string

settings = get_settings()
app = FastAPI(title=settings.app_name)
print(settings.frontend_origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins,
    allow_origin_regex=".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

@app.post("/submit")
def submit_form(form: schemas.SubmitForm, db: Session = Depends(get_db)):
    print(form)
    return {"message": "Form submitted successfully"}

@app.post("/auth/register", response_model=schemas.UserRead, status_code=status.HTTP_201_CREATED)
def register_user(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = crud.get_user_by_email(db, user_in.email)
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = crud.create_user(db, user_in)
    return user


@app.post("/auth/login", response_model=schemas.LoginResponse)
def login_user(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return schemas.LoginResponse(message="Login successful", user=user)


@app.get("/connections", response_model=list[schemas.ConnectionRead])
def list_connections(db: Session = Depends(get_db)):
    return crud.list_connections(db)


@app.post("/connections", response_model=schemas.ConnectionRead, status_code=status.HTTP_201_CREATED)
def create_connection(connection_in: schemas.ConnectionCreate, db: Session = Depends(get_db)):
    existing = crud.get_connection_by_name(db, connection_in.name.strip())
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A connection with that name already exists.",
        )
    return crud.create_connection(db, connection_in)


@app.put("/connections/{connection_id}", response_model=schemas.ConnectionRead)
def update_connection(connection_id: int, payload: schemas.ConnectionUpdate, db: Session = Depends(get_db)):
    connection = crud.get_connection(db, connection_id)
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    existing = crud.get_connection_by_name(db, payload.name.strip())
    if existing and existing.id != connection_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A connection with that name already exists.",
        )
    return crud.update_connection(db, connection, payload)


@app.delete("/connections/{connection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_connection(connection_id: int, db: Session = Depends(get_db)):
    deleted = crud.delete_connection(db, connection_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post("/connections/test", response_model=schemas.ConnectionTestResponse)
def test_connection(payload: schemas.ConnectionTestRequest):
    try:
        test_connection_string(payload.connection_string.strip())
    except RuntimeError as exc:
        return schemas.ConnectionTestResponse(ok=False, message=str(exc))
    return schemas.ConnectionTestResponse(ok=True, message="Connection successful.")


@app.post("/sql/execute", response_model=schemas.SQLQueryResult)
def run_sql_query(payload: schemas.SQLQueryRequest, db: Session = Depends(get_db)):
    connection = crud.get_connection(db, payload.connection_id)
    if not connection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Connection not found")

    try:
        result = execute_sql_query(connection.connection_string, payload.query)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return result
