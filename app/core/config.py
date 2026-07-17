from functools import lru_cache
from urllib.parse import quote_plus
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MANTICORE_HOST: str = "localhost"
    MANTICORE_PORT: str = "9308"
    MANTICORE_PROTOCOL: str = "http"
    TABLE_NAME: str = "english_dataset"

    POSTGRES_USER: str = ""
    POSTGRES_PASSWORD: str = ""
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = ""

    # Email (Resend)
    RESEND_KEY: str = ""
    MAIL_FROM: str = "noreply@pokispokey.com"

    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6000

    SECRET_KEY: str = "" 
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Groq
    GROQ_API_KEY: str

    # Paddle Payments
    PADDLE_API_KEY: str = ""
    WEBHOOK_SECRET: str = ""
    PADDLE_ENVIRONMENT: str = "sandbox"  # "sandbox" | "production"

    # Price IDs (pri_xxx)
    PRODUCT_BASIC_MONTHLY: str = ""
    PRODUCT_BASIC_YEARLY: str = ""
    PRODUCT_PRO_MONTHLY: str = ""
    PRODUCT_PRO_YEARLY: str = ""
    PRODUCT_MAX_MONTHLY: str = ""
    PRODUCT_MAX_YEARLY: str = ""

    # OTP Settings (Password Reset)
    OTP_LENGTH: int = 6
    OTP_EXPIRE_SECONDS: int = 600  # 10 minutes

    # Email Verification Settings
    VERIFY_OTP_EXPIRE_SECONDS: int = 600     # 10 minutes
    VERIFY_MAX_ATTEMPTS: int = 5              # Max wrong attempts before invalidate
    VERIFY_RESEND_COOLDOWN: int = 60          # Seconds between resends
    VERIFY_MAX_RESENDS_PER_HOUR: int = 5      # Anti-spam per email

    COOKIE_NAME: str = "access_token"
    COOKIE_SECURE: bool = False  # Set to True in production (.env: COOKIE_SECURE=true)
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: str = ""  # Set to ".pokispokey.com" in production to share across subdomains

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://127.0.0.1:5001/auth/google/callback"
    
    # Frontend URL (for redirects and postMessage origin)
    FRONTEND_URL: str = "http://localhost:3000"

    BACKEND_CORS_ORIGINS: str = "http://localhost:3000"

    model_config = {
        "env_file": ".env",
        "extra": "ignore"
    }

    @property
    def manticore_url(self) -> str:
        return f"{self.MANTICORE_PROTOCOL}://{self.MANTICORE_HOST}:{self.MANTICORE_PORT}"

    @property
    def redis_url(self) -> str:
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    @property
    def postgres_url(self) -> str:
        encoded_user = quote_plus(self.POSTGRES_USER)
        encoded_password = quote_plus(self.POSTGRES_PASSWORD)
        return f"postgresql+asyncpg://{encoded_user}:{encoded_password}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
