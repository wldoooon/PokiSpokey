from dodopayments import AsyncDodoPayments
from .config import get_settings

settings = get_settings()


class DodoClient:
    _instance = None

    def __init__(self):
        self.client: AsyncDodoPayments | None = None

    @classmethod
    def get_instance(cls) -> "DodoClient":
        if cls._instance is None:
            cls._instance = DodoClient()
        return cls._instance

    async def connect(self) -> None:
        self.client = AsyncDodoPayments(
            bearer_token=settings.DODO_API_KEY,
            environment=settings.DODO_ENVIRONMENT,  # type: ignore[arg-type]
            webhook_key=settings.DODO_WEBHOOK_SECRET,
        )

    async def close(self) -> None:
        if self.client:
            await self.client.__aexit__(None, None, None)
            self.client = None

    def get(self) -> AsyncDodoPayments:
        if not self.client:
            raise RuntimeError("Dodo client not initialized — call connect() in lifespan first")
        return self.client


dodo_client = DodoClient()
