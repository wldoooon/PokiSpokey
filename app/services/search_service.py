import asyncio
import math
import manticoresearch
from typing import Optional
from app.core.config import get_settings
from app.core.logging import logger
from app.services.search_pipeline import normalize_scores, z_interleave
import json
import string

settings = get_settings()


class SearchService:
    def __init__(self, search_api: manticoresearch.SearchApi):
        self.search_api = search_api
        self.table_name = settings.TABLE_NAME

    CUTOFF = 200
    CATEGORY_TIMEOUT = 2.0
    DIVERSITY_CAP = 8

    _ISO_TO_TABLE = {
        "es": "spanish",
        "fr": "french",
        "de": "germany",
        "ja": "japanese",
        "zh": "chinese",
        "en": None,
    }

    _LANGUAGE_CONFIG = {
        "germany_dataset": {
            "map": {"Podcasts": 1, "News": 2, "Cartoons": 3},
            "default_id": 1,
        },
        "english_dataset": {
            "map": {"Podcasts": 1, "Movies": 2, "Shows": 3},
            "default_id": 1,
        },
        "spanish_dataset": {
            "map": {"Podcasts": 1, "Shows": 3, "Movies": 4},
            "default_id": 1,
        },
        "french_dataset": {
            "map": {"Podcasts": 1, "Movies": 4},
            "default_id": 1,
        },
    }

    async def search(self, q: str, language: str, category: Optional[str] = None, sub_category: Optional[str] = None, page: int = 1, limit: int = 30) -> dict:
        # Sanitize query by removing all punctuation to prevent Manticore syntax errors
        safe_q = q.translate(str.maketrans('', '', string.punctuation))
        if not safe_q.strip():
            # If the user typed only punctuation, fallback to the original to let validation or empty handler catch it,
            # or just proceed with empty string (which returns 0 hits)
            safe_q = q
            
        table_name = self._resolve_table(language)
        offset = (page - 1) * limit
        return await self._search_all_categories(safe_q, table_name, limit=limit, offset=offset, sub_category=sub_category)

    def _resolve_table(self, language: str) -> str:
        if not language:
            return self.table_name
        lang = language.lower().strip()
        if lang in ["english", "general", "en"]:
            return self.table_name
        lang = self._ISO_TO_TABLE.get(lang, lang)
        if lang is None:
            return self.table_name
        return f"{lang}_dataset"

    async def _search_all_categories(self, q: str, table_name: str, limit: int, offset: int = 0, sub_category: Optional[str] = None) -> dict:
        config = self._LANGUAGE_CONFIG.get(table_name)
        categories = config["map"] if config else {"Podcasts": 1}

        # Fetch enough per category to cover pagination after merging
        per_cat_limit = min(limit + offset, self.CUTOFF)

        tasks = [
            asyncio.wait_for(
                self._fetch_category(q, cat, table_name, per_cat_limit, sub_category, cat_id),
                timeout=self.CATEGORY_TIMEOUT,
            )
            for cat, cat_id in categories.items()
        ]

        raw_results = await asyncio.gather(*tasks, return_exceptions=True)

        category_lists: list[list[dict]] = []
        total_count = 0
        for i, cat in enumerate(categories.keys()):
            res = raw_results[i]
            if isinstance(res, BaseException):
                logger.warning(f"Category {cat} timed out or failed: {res}")
                continue
            cat_result: dict = res  # type: ignore[assignment]
            hits: list[dict] = cat_result.get("hits", [])
            total_count += cat_result.get("total", 0)
            if not hits:
                continue
            normalize_scores(hits)
            category_lists.append(hits)

        # Ensure cap is always large enough to fill limit regardless of category count
        effective_cap = max(self.DIVERSITY_CAP, math.ceil((limit + offset) / max(len(category_lists), 1)))
        merged = z_interleave(category_lists, limit=limit + offset, diversity_cap=effective_cap)
        paged = merged[offset: offset + limit]

        return {
            "hits": {
                "hits": paged,
                "total": {"value": total_count},
            },
            "aggregations": {},
        }

    async def _fetch_category(self, q: str, category: str, table_name: str, limit: int, sub_category: Optional[str], category_id: Optional[int]) -> dict:
        must_conditions = [
            {"query_string": f"@sentence_text {q}"},
            {"equals": {"category_id": category_id}} if category_id is not None else {"equals": {"category_title": category}},
        ]
        if sub_category:
            must_conditions.append({"equals": {"category_type": sub_category}})

        search_request = {
            "table": table_name,
            "query": {"bool": {"must": must_conditions}},
            "limit": limit,
            "offset": 0,
            "options": {"cutoff": self.CUTOFF},
            "profile": True,
        }

        try:
            result = await self.search_api.search(search_request)
        except Exception as e:
            logger.error(f"Search error for category {category} in {table_name}: {e}")
            return {"hits": [], "total": 0}

        hits = []
        seen_videos = set()
        if result.hits and result.hits.hits:
            for hit in result.hits.hits:
                source = hit.source if hasattr(hit, 'source') else {}
                video_id = source.get('video_id')
                if video_id in seen_videos:
                    continue
                seen_videos.add(video_id)

                source.pop('words', None)
                formatted_doc = source.copy()
                if hasattr(hit, 'highlight') and hit.highlight:
                    highlights = hit.highlight.get('sentence_text', [])
                    if highlights:
                        formatted_doc['sentence_text'] = highlights[0]

                hits.append({
                    "_score": hit.score if hasattr(hit, 'score') and hit.score is not None else 0.0,
                    "_source": source,
                    "_formatted": formatted_doc,
                })

        total = result.hits.total if result.hits else 0
        return {"hits": hits, "total": total}

    async def get_transcript(self, video_id: str, language: str, center_position: Optional[int] = None) -> dict:
        window_size = 50
        per_page = 250
        table_name = self._resolve_table(language)
        filter_conditions: list[dict] = [{"equals": {"video_id": video_id}}]
        if center_position is not None:
            start_pos = max(0, int(center_position) - window_size)
            end_pos = int(center_position) + window_size
            filter_conditions.append({
                "range": {
                    "position": {
                        "gte": start_pos,
                        "lte": end_pos
                    }
                }
            })
        search_request = {
            "table": table_name,
            "query": {"bool": {"must": filter_conditions}},
            "limit": per_page,
            "sort": [{"position": "asc"}]
        }
        try:
            result = await self.search_api.search(search_request)
        except Exception as e:
            logger.error(f"Transcript fetch error in {table_name}: {e}")
            return {"hits": {"hits": []}}
        parsed_hits = []
        if result.hits and result.hits.hits:
            for hit in result.hits.hits:
                source = hit.source if hasattr(hit, 'source') else {}
                if 'words' in source and isinstance(source['words'], str):
                    try:
                        source['words'] = json.loads(source['words'])
                    except json.JSONDecodeError:
                        source['words'] = []
                parsed_hits.append({"_source": source})
        total = result.hits.total if result.hits else 0
        return {
            "hits": {
                "hits": parsed_hits,
                "total": {"value": total}
            }
        }
