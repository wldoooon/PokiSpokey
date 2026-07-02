def normalize_scores(hits: list[dict]) -> None:
    """Normalize _score to _norm_score in [0.0, 1.0] in-place."""
    if not hits:
        return
    scores = [h["_score"] for h in hits]
    min_s, max_s = min(scores), max(scores)
    score_range = max_s - min_s if max_s != min_s else 1.0
    for h in hits:
        h["_norm_score"] = (h["_score"] - min_s) / score_range


def z_interleave(category_lists: list[list[dict]], limit: int, diversity_cap: int, block_size: int = 2) -> list[dict]:
    """
    Strict round-robin block interleaving: cycles through categories in order,
    taking a block of `block_size` items from each per turn. Scores are used
    only within each category to rank items — not to pick which category goes next.
    Guarantees even distribution: 2 from cat A, 2 from cat B, 2 from cat C, repeat.
    """
    n = len(category_lists)
    pointers = [0] * n
    counts = [0] * n
    merged: list[dict] = []
    seen_videos: set[str] = set()
    cat_idx = 0
    consecutive_skips = 0

    while len(merged) < limit:
        if consecutive_skips >= n:
            break  # all categories exhausted or capped

        i = cat_idx % n
        cat_idx += 1

        # Advance past already-seen video_ids
        while pointers[i] < len(category_lists[i]) and category_lists[i][pointers[i]]["_source"].get("video_id") in seen_videos:
            pointers[i] += 1

        if pointers[i] >= len(category_lists[i]) or counts[i] >= diversity_cap:
            consecutive_skips += 1
            continue

        consecutive_skips = 0

        # Take up to block_size items from this category
        added = 0
        while added < block_size and len(merged) < limit and pointers[i] < len(category_lists[i]):
            hit = category_lists[i][pointers[i]]
            pointers[i] += 1
            video_id = hit["_source"].get("video_id", "")
            if video_id in seen_videos:
                continue
            seen_videos.add(video_id)
            counts[i] += 1
            merged.append(hit)
            added += 1
            if counts[i] >= diversity_cap:
                break

    return merged
