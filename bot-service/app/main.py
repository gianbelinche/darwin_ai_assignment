import logging
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app import classifier
from app.database import get_session
from app.models import Expense, User

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
logger = logging.getLogger("bot-service")

app = FastAPI(title="Expense Bot Service")


class ProcessRequest(BaseModel):
    telegram_id: str
    message: str


@app.post("/process")
async def process_message(
    req: ProcessRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Classify an incoming message. If it's an expense, persist it and return
    the classification. If it's not an expense, return early with is_expense=false.
    """
    logger.info("received message from user %s: %r", req.telegram_id, req.message)

    result = await classifier.classify(req.message)
    logger.info("classification result: is_expense=%s, category=%r, amount=%s",
                result.is_expense, result.category, result.amount)

    if not result.is_expense:
        return {"is_expense": False}

    # Look up the user — the Connector already verified the whitelist, but we
    # enforce it here too so the Bot Service can't be called directly to bypass it
    user_row = await session.execute(
        select(User).where(User.telegram_id == req.telegram_id)
    )
    user = user_row.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not in whitelist")

    expense = Expense(
        user_id=user.id,
        description=result.description,
        # Pass as string to avoid float → money coercion issues in asyncpg
        amount=str(result.amount),
        category=result.category,
        added_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    session.add(expense)
    await session.commit()
    logger.info("saved expense for user %s: %r £%s [%s]",
                req.telegram_id, result.description, result.amount, result.category)

    return {
        "is_expense": True,
        "category": result.category,
        "description": result.description,
        "amount": result.amount,
    }
