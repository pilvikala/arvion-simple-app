"""Password hashing helpers."""
from passlib.context import CryptContext

# Order matters: first scheme is used when hashing new passwords, while the
# rest remain available to verify previously created hashes.
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256", "bcrypt"],
    deprecated="auto",
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)
