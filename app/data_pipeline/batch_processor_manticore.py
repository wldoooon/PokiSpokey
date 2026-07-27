import os
import json
import asyncio
import argparse
import httpx
import hashlib
import manticoresearch
from jsonl_reader import read_jsonl_lines

MANTICORE_URL = os.getenv("MANTICORE_URL", "http://localhost:9308")
TABLE_NAME = "japanese_dataset"

def generate_sentence_id(video_id: str, position: int) -> int:
    """Generate a collision-free 64-bit integer ID from video_id and position.
    
    Uses composite key: upper 48 bits = video_id hash, lower 16 bits = position.
    Collisions require BOTH a video hash collision AND the same sentence position,
    making the probability effectively 0% even at 30M+ documents.
    """
    if position > 65535:
        raise ValueError(f"Position {position} exceeds 16-bit limit (65535)")
    video_hash = int(hashlib.md5(video_id.encode()).hexdigest()[:12], 16)  # 48-bit hash
    return (video_hash << 16) | position


async def get_api_client():
    config = manticoresearch.Configuration(host=MANTICORE_URL)
    return manticoresearch.ApiClient(config)


async def execute_sql(sql: str) -> dict:
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MANTICORE_URL}/sql?mode=raw",
            data={"query": sql},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        result = response.json()
        if isinstance(result, list):
            return result[0] if result else {}
        return result


async def create_table(reset: bool = False):
    if reset:
        print(f"Dropping table: {TABLE_NAME}...")
        result = await execute_sql(f"DROP TABLE IF EXISTS {TABLE_NAME}")
        if result.get("error"):
            print(f"Drop warning: {result['error']}")
        else:
            print(f"Dropped table: {TABLE_NAME}")
    
    create_sql = f"""CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
        sentence_text text,
        video_id string,
        channel string,
        category_title string,
        category_type string,
        language string,
        video_title string,
        words string,
        start float,
        end_time float,
        position int
    ) charset_table='non_cjk' ngram_chars='japanese' ngram_len='1' html_strip='1'"""
    
    print(f"Creating table: {TABLE_NAME}...")
    result = await execute_sql(create_sql)
    
    if result.get("error"):
        error_msg = result["error"]
        if "already exists" in error_msg.lower():
            print(f"Table {TABLE_NAME} already exists")
        else:
            print(f"Create table error: {error_msg}")
            raise Exception(error_msg)
    else:
        print(f"Created table: {TABLE_NAME}")
    
    verify = await execute_sql("SHOW TABLES")
    tables = [row.get("Table") for row in verify.get("data", [])]
    if TABLE_NAME in tables:
        print(f"Verified: {TABLE_NAME} exists in database")
    else:
        print(f"Warning: {TABLE_NAME} not found in SHOW TABLES")


async def get_stats():
    try:
        result = await execute_sql(f"SHOW TABLE {TABLE_NAME} STATUS")
        print(f"\\nTable Stats for '{TABLE_NAME}':")
        
        if result.get("error"):
            print(f"   Error: {result['error']}")
            return
        
        data = result.get("data", [])
        for row in data:
            var_name = row.get("Variable_name", "")
            value = row.get("Value", "")
            if var_name in ["indexed_documents", "disk_bytes", "ram_bytes"]:
                if "bytes" in var_name:
                    mb = int(value) / 1024 / 1024
                    print(f"   {var_name}: {mb:.2f} MB")
                else:
                    print(f"   {var_name}: {value}")
        
    except Exception as e:
        print(f"Could not get stats: {e}")


async def import_documents(index_api: manticoresearch.IndexApi, file_path: str, batch_size: int = 1000):
    batch = []
    total_imported = 0
    video_count = 0
    
    print(f"\\nStarting import from: {file_path}")
    print(f"   Batch size: {batch_size}")
    
    for line_num, video_doc in enumerate(read_jsonl_lines(file_path), 1):
        video_id = video_doc.get("video_id", "")
        video_title = video_doc.get("title", "")
        channel = video_doc.get("channel", "")
        category = video_doc.get("category", "")
        movie_name = video_doc.get("movie_name", "")
        language = video_doc.get("language", "en")
        sentences = video_doc.get("sentences", [])
        
        if not sentences:
            continue
        
        video_count += 1
        
        for position, sentence in enumerate(sentences):
            doc_id = generate_sentence_id(video_id, position)
            
            manticore_doc = {
                "replace": {
                    "table": TABLE_NAME,
                    "id": doc_id,
                    "doc": {
                        "sentence_text": sentence.get("sentence_text", ""),
                        "video_id": video_id,
                        "channel": channel,
                        "category_id": {"Anime": 1, "Drama": 2, "Street": 3, "Podcasts": 4}.get(category, 1),
                        "category_type": movie_name,
                        "language": language,
                        "video_title": video_title,
                        "words": json.dumps(sentence.get("words", [])),
                        "start": float(sentence.get("start", 0)),
                        "end_time": float(sentence.get("end", 0)),
                        "position": position
                    }
                }
            }
            
            batch.append(manticore_doc)
            
            if len(batch) >= batch_size:
                await flush_batch(index_api, batch)
                total_imported += len(batch)
                print(f"   Imported {total_imported} sentences from {video_count} videos...", end="\r")
                batch = []
    
    if batch:
        await flush_batch(index_api, batch)
        total_imported += len(batch)
    
    print(f"\nImport complete!")
    print(f"   Videos processed: {video_count}")
    print(f"   Sentences imported: {total_imported}")
    return total_imported


async def flush_batch(index_api: manticoresearch.IndexApi, batch: list):
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            ndjson_body = "\n".join(json.dumps(doc) for doc in batch)
            response = await index_api.bulk(ndjson_body)
            if response.errors:
                print(f"\nBulk partial failure: {response.error}")
                print(f"   Skipped lines: {response.skipped_lines}, Current line: {response.current_line}")
            return  # Exit function
            
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"\nBulk error (attempt {attempt+1}/{max_retries}): {e}")
                print(f"Waiting {retry_delay}s before retry...")
                await asyncio.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
            else:
                print(f"\nFinal Bulk insert error: {e}")
                print("Falling back to single inserts...")
                for doc in batch:
                    try:
                        doc_data = doc.get("replace") or doc.get("insert")
                        await index_api.insert(doc_data)
                    except Exception as single_err:
                        print(f"   Failed document: {doc_data['doc'].get('video_id')}: {single_err}")


async def main():
    parser = argparse.ArgumentParser(description="Import JSONL data into Manticore Search")
    parser.add_argument("--file", "-f", help="Path to JSONL file")
    parser.add_argument("--reset", "-r", action="store_true", help="Drop and recreate table")
    parser.add_argument("--batch-size", "-b", type=int, default=1000, help="Batch size for imports")
    parser.add_argument("--stats", "-s", action="store_true", help="Show table stats and exit")
    parser.add_argument("--create-table", "-c", action="store_true", help="Just create table and exit")
    
    args = parser.parse_args()
    
    if args.stats:
        await get_stats()
        return
    
    if args.create_table:
        await create_table(reset=args.reset)
        return
    
    if not args.file:
        parser.error("--file is required for import (or use --create-table or --stats)")
    
    async with manticoresearch.ApiClient(
        manticoresearch.Configuration(host=MANTICORE_URL)
    ) as api_client:
        
        index_api = manticoresearch.IndexApi(api_client)
        
        await create_table(reset=args.reset)
        await import_documents(index_api, args.file, batch_size=args.batch_size)
        await get_stats()


if __name__ == "__main__":
    asyncio.run(main())
