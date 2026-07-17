from paddle_billing import Client, Environment, Options
from .config import get_settings

settings = get_settings()


class PaddleClient:
    _instance = None

    def __init__(self):
        self.client: Client | None = None

    @classmethod
    def get_instance(cls) -> "PaddleClient":
        if cls._instance is None:
            cls._instance = PaddleClient()
        return cls._instance

    def connect(self) -> None:
        env = Environment.SANDBOX if settings.PADDLE_ENVIRONMENT == "sandbox" else Environment.PRODUCTION
        self.client = Client(
            settings.PADDLE_API_KEY,
            options=Options(env),
        )

    def get(self) -> Client:
        if not self.client:
            raise RuntimeError("Paddle client not initialized — call connect() in lifespan first")
        return self.client


paddle_client = PaddleClient()
