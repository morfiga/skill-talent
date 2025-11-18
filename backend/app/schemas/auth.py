from typing import Optional

from pydantic import BaseModel


class GoogleToken(BaseModel):
    token: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    email: str
    name: str
    avatar: Optional[str] = None


class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None
