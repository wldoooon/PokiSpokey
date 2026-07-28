from pydantic import BaseModel
from typing import List, Optional


class Category(BaseModel):
    type: str
    title: str


class Word(BaseModel):
    text: str
    start: float
    end: float


class TranscriptSentence(BaseModel):
    sentence_text: str
    sentence_reading: Optional[str] = None
    start_time: float
    end_time: float
    words: List[Word] = []
    position: Optional[int] = None


class SearchHit(BaseModel):
    video_id: str
    title: Optional[str] = None
    channel: Optional[str] = None
    sentence_text: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    category: Optional[Category] = None
    position: Optional[int] = None
    transcript: Optional[List[TranscriptSentence]] = None


class SearchResponse(BaseModel):
    total: int
    hits: List[SearchHit]
    aggregations: Optional[dict] = None


class TranscriptResponse(BaseModel):
    video_id: str
    start_time: float
    end_time: float
    sentences: List[TranscriptSentence]


class TranslateRequest(BaseModel):
    sentences: List[str]
    target_lang: str
    source_lang: str = "auto"


class TranslateResponse(BaseModel):
    translations: List[str]
    source_lang: str
