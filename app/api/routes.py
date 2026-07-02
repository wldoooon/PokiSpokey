from fastapi import APIRouter, Query, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from sqlmodel.ext.asyncio.session import AsyncSession

from ..services.usage_service import check_ai_credits, deduct_ai_credits, get_user_usage_stats, get_anonymous_usage_stats
from .deps import get_search_service, get_current_user_optional, get_current_user, get_groq_service, get_session
from ..services.search_service import SearchService
from ..services.groq_service import GroqService
from ..services.translation_service import TranslationService, get_translation_service
from ..schemas.search import SearchHit, SearchResponse, TranscriptSentence, TranscriptResponse, Word, Category, TranslateRequest, TranslateResponse
from ..core.limiter import feature_rate_limit
from ..core.limiter.core import TieredRateLimiter
from ..core.logging import logger
from ..models.user import User

router = APIRouter(
    prefix="/api/v1",
    tags=["Search"]
)


@router.get("/usage")
async def get_usage(
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_session),
):
    """Return current usage stats. Works for both authenticated users and guests."""
    from ..core.redis import get_redis
    redis = await get_redis()
    if current_user is None:
        client_ip = TieredRateLimiter.get_client_ip(request)
        return await get_anonymous_usage_stats(redis=redis, client_ip=client_ip)
    return await get_user_usage_stats(redis=redis, db=db, user=current_user)

class CompletionRequest(BaseModel):
    prompt: str
    context: Optional[dict] = None

@router.post("/completion")
@feature_rate_limit("ai_chat")
async def completion(
    request: Request,
    response: Response,
    body: CompletionRequest,
    groq: GroqService = Depends(get_groq_service),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_session)
):

    if not current_user:
        raise HTTPException(status_code=401, detail="Must be logged in to chat.")
        
    is_allowed, error_msg, _ = await check_ai_credits(db, current_user)
    if not is_allowed:
        raise HTTPException(status_code=403, detail=error_msg)

    async def stream_and_deduct():
        total_tokens_used = 0
        
        # We extract the user's name (fallback to their email if they don't have a full name)
        user_name = current_user.full_name or current_user.email.split('@')[0]
        
        # Pass the prompt, context, and user_name to the service
        async for chunk_data, tokens in groq.get_completion_stream(
            prompt=body.prompt, 
            context=body.context,
            user_name=user_name
        ):
            if tokens is not None:
                total_tokens_used = tokens
            if chunk_data:
                yield chunk_data
                
        if total_tokens_used > 0:
            await deduct_ai_credits(db, current_user, total_tokens_used)

    return StreamingResponse(
        stream_and_deduct(),
        media_type="text/event-stream"
    )


@router.get("/search", response_model=SearchResponse)
@feature_rate_limit("search")
async def search(
    request: Request,
    response: Response,
    q: str = Query(..., min_length=2),
    language: str = Query("english"),
    category: Optional[str] = Query(None),
    sub_category: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
    # Optional auth: sets request.state.user for rate limiter
    current_user: Optional[User] = Depends(get_current_user_optional),
    service: SearchService = Depends(get_search_service)
):
    raw_results = await service.search(q=q, language=language, category=category, sub_category=sub_category, page=page, limit=limit)

    hits: List[SearchHit] = []
    raw_hits = raw_results.get("hits", {}).get("hits", [])
    
    for hit in raw_hits:
        source = hit.get("_source", {})
        formatted = hit.get("_formatted", {})
        
        if not source.get("video_id"):
            continue
        
        category_title = source.get("category_title", "Unknown")
        category_type = source.get("category_type", "Cartoon")
        category_obj = Category(type=category_type, title=category_title)
        
        sentence_text = formatted.get("sentence_text", source.get("sentence_text", ""))
        start_time = source.get("start", 0.0)
        end_time = source.get("end_time", 0.0)
        
        transcript_sentence = TranscriptSentence(
            sentence_text=sentence_text,
            start_time=start_time,
            end_time=end_time,
            words=[],
            position=source.get("position")
        )
        
        search_hit = SearchHit(
            video_id=source.get("video_id"),
            title=source.get("video_title", ""),
            channel=source.get("channel", ""),
            category=category_obj,
            sentence_text=sentence_text,
            start_time=start_time,
            end_time=end_time,
            position=source.get("position"),
            transcript=[transcript_sentence] 
        )
        hits.append(search_hit)

    total = raw_results.get("hits", {}).get("total", {}).get("value", 0)

    aggregations = raw_results.get("aggregations", {})
    return SearchResponse(total=total, hits=hits, aggregations=aggregations)


@router.post("/translate", response_model=TranslateResponse)
async def translate(
    request: Request,
    body: TranslateRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    translation: TranslationService = Depends(get_translation_service),
):
    if not body.sentences:
        raise HTTPException(status_code=400, detail="No sentences provided.")
    if len(body.sentences) > 200:
        raise HTTPException(status_code=400, detail="Max 200 sentences per request.")

    logger.info(f"[TRANSLATE ROUTE] received sentences={len(body.sentences)}  lang={body.target_lang}  totalChars={sum(len(s) for s in body.sentences)}")

    translations = await translation.translate_batch(
        sentences=body.sentences,
        target_lang=body.target_lang,
        source_lang=body.source_lang,
    )

    logger.info(f"[TRANSLATE ROUTE] returning translations={len(translations)}  match={len(translations)==len(body.sentences)}")
    return TranslateResponse(translations=translations, source_lang=body.source_lang)


@router.get("/videos/{video_id}/transcript", response_model=TranscriptResponse)
async def get_transcript(
    request: Request,
    response: Response,
    video_id: str,
    language: str = Query("english"),
    center_position: Optional[int] = Query(None),
    # Optional auth: sets request.state.user for rate limiter
    current_user: Optional[User] = Depends(get_current_user_optional),
    service: SearchService = Depends(get_search_service)
):
    raw_results = await service.get_transcript(video_id=video_id, language=language, center_position=center_position)

    sentences: List[TranscriptSentence] = []
    raw_hits = raw_results.get("hits", {}).get("hits", [])
    
    for hit in raw_hits:
        source = hit.get("_source", {})
        
        words_src = source.get("words", [])
        if isinstance(words_src, str):
            import json
            try:
                words_src = json.loads(words_src)
            except:
                words_src = []
                
        words = [
            Word(text=w.get("text"), start=w.get("start"), end=w.get("end"))
            for w in words_src if isinstance(w, dict)
        ]
        
        sentence = TranscriptSentence(
            sentence_text=source.get("sentence_text", ""),
            start_time=source.get("start", 0.0),
            end_time=source.get("end_time", 0.0),
            words=words,
            position=source.get("position")
        )
        sentences.append(sentence)

    if not sentences:
        raise HTTPException(status_code=404, detail="Transcript not found")

    video_start_time = sentences[0].start_time
    video_end_time = sentences[-1].end_time

    return TranscriptResponse(
        video_id=video_id,
        start_time=video_start_time,
        end_time=video_end_time,
        sentences=sentences
    )
