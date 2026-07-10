"""
Email Service
=============
Handles all email sending operations (OTP, verification, etc.)
Uses Resend for reliable transactional delivery via custom domain.
"""

import asyncio
import resend
from typing import List
from pydantic import EmailStr
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
from datetime import datetime

from ..core.config import get_settings
from ..core.logging import logger

settings = get_settings()

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"


class EmailService:
    def __init__(self):
        resend.api_key = settings.RESEND_KEY
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(TEMPLATES_DIR)),
            autoescape=True
        )

    def _render_template(self, template_name: str, **context) -> str:
        template = self.jinja_env.get_template(template_name)
        return template.render(**context)

    def _send(self, to: str, subject: str, html: str) -> None:
        """Synchronous send — called via asyncio.to_thread to avoid blocking the event loop."""
        resend.Emails.send({
            "from": settings.MAIL_FROM,
            "to": [to],
            "subject": subject,
            "html": html,
        })

    async def send_otp(self, email: List[EmailStr], otp: str):
        """Sends an OTP code for password reset."""
        if not settings.RESEND_KEY:
            logger.warning(f"Resend not configured (MOCK): OTP {otp} for {email}")
            return
        html = self._render_template("otp_email.html", otp=otp, year=datetime.now().year)
        await asyncio.to_thread(self._send, str(email[0]), "PokiSpokey - Password Reset Code", html)
        logger.info(f"OTP email sent to {email[0]}")

    async def send_verification_otp(self, email: List[EmailStr], otp: str):
        """Sends an OTP code for email verification."""
        if not settings.RESEND_KEY:
            logger.warning(f"Resend not configured (MOCK): Verification OTP {otp} for {email}")
            return
        html = self._render_template("verification_email.html", otp=otp, year=datetime.now().year)
        await asyncio.to_thread(self._send, str(email[0]), "PokiSpokey - Verify Your Email", html)
        logger.info(f"Verification email sent to {email[0]}")


# Singleton instance
email_service = EmailService()
