from typing import List, Optional, Union

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Skill Talent API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    SQLALCHEMY_DEBUG: bool = False
    SECRET_KEY: str

    # Database
    DB_HOST: Optional[str] = None
    DB_PORT: Optional[int] = None
    DB_USER: Optional[str] = None
    DB_PASSWORD: Optional[str] = None
    DB_NAME: Optional[str] = None
    DB_URL: Optional[str] = None

    # CORS
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:80",
    ]

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # JWT
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def database_url(self) -> str:
        if self.DB_URL is not None:
            return self.DB_URL
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def cors_origins_list(self) -> List[str]:
        """Converte CORS_ORIGINS para lista, suportando string separada por vírgula"""
        if isinstance(self.CORS_ORIGINS, str):
            return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
        return self.CORS_ORIGINS

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
