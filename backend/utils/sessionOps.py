import uuid
import os
import json

from fastapi import APIRouter, Request, HTTPException
from dotenv import load_dotenv

from constants.reddisClient import redis
from constants.qstashClient import qstash_client, receiver
from constants.supabaseClient import sb_client, storage_client

load_dotenv()

BACKEND_URL = os.environ.get('BACKEND_URL', '')
SESSION_TTL = 10800  # 3 hours in seconds

router = APIRouter()


@router.get('/verifySession')
def verify_session(session_id: str):
    """Check if a session is still active in Redis."""
    value = redis.get(f"session:{session_id}")
    if value:
        return {"active": True, "session_id": session_id}
    return {"active": False, "session_id": session_id}

@router.post('/createSession')
def create_session():
    """
    Creates a new session:
    1. Generate UUID4
    2. Store in Redis with 3h TTL
    3. Create root folder in Supabase Storage
    4. Insert marker rows in documents & projects tables
    5. Queue QStash delayed cleanup message
    """
    session_id = str(uuid.uuid4())

    try:
        # 1. Store session in Redis with TTL
        redis.set(f"session:{session_id}", "active", ex=SESSION_TTL)

        # 2. Create root folder in Supabase Storage (upload a .keep placeholder)
        storage_client.upload(
            path=f"{session_id}/.keep",
            file=b"",
            file_options={
                "content-type": "application/octet-stream",
                "upsert": "true",
            },
        )

        # 3. Insert marker rows with session_id into both tables
        sb_client.table("documents").insert({
            "session_id": session_id,
            "subject": "__session_init__",
            "content": f"Session {session_id} initialized",
            "embedding": [0.0] * 768,  # zero-vector placeholder
        }).execute()

        sb_client.table("projects").insert({
            "session_id": session_id,
        }).execute()

        # 4. Queue delayed cleanup via QStash (fires after 3 hours)
        callback_url = f"{BACKEND_URL}/deleteSession"
        qstash_client.message.publish_json(
            url=callback_url,
            body={"session_id": session_id},
            delay="3h",
        )

        return {"session_id": session_id, "ttl_seconds": SESSION_TTL}

    except Exception as e:
        # Best-effort rollback: remove Redis key if anything failed
        redis.delete(f"session:{session_id}")
        raise HTTPException(status_code=500, detail=f"Session creation failed: {str(e)}")


@router.post('/deleteSession')
async def delete_session(request: Request):
    """
    QStash webhook callback — cleans up all data for a session.
    Verifies the Upstash-Signature header before proceeding.
    """
    # 1. Verify QStash signature
    signature = request.headers.get("upstash-signature")
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")

    env = os.environ.get('ENV', 'DEV')
    if env != 'DEV':
        if not signature:
            raise HTTPException(status_code=400, detail="Missing Upstash-Signature header")
        try:
            receiver.verify(
                body=body_str,
                signature=signature,
                url=f"{BACKEND_URL}/deleteSession",
            )
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid QStash signature")

    # 2. Parse session_id from body
    try:
        payload = json.loads(body_str)
        session_id = payload["session_id"]
    except (json.JSONDecodeError, KeyError):
        raise HTTPException(status_code=400, detail="Invalid payload — expected {session_id}")

    print(f"[cleanup] Deleting all data for session: {session_id}")

    # 3. Delete rows from documents table
    try:
        sb_client.table("documents").delete().eq("session_id", session_id).execute()
        print(f"[cleanup] Removed documents for session {session_id}")
    except Exception as e:
        print(f"[cleanup] Failed to delete documents: {e}")

    # 4. Delete rows from projects table
    try:
        sb_client.table("projects").delete().eq("session_id", session_id).execute()
        print(f"[cleanup] Removed projects for session {session_id}")
    except Exception as e:
        print(f"[cleanup] Failed to delete projects: {e}")

    # 5. Remove all files under {session_id}/ in Supabase Storage
    try:
        listed = storage_client.list(session_id)
        paths = [f"{session_id}/{obj['name']}" for obj in listed]
        if paths:
            storage_client.remove(paths)
        print(f"[cleanup] Removed {len(paths)} storage files for session {session_id}")
    except Exception as e:
        print(f"[cleanup] Failed to clean storage: {e}")

    # 6. Delete Redis key
    try:
        redis.delete(f"session:{session_id}")
        print(f"[cleanup] Removed Redis key for session {session_id}")
    except Exception as e:
        print(f"[cleanup] Failed to delete Redis key: {e}")

    return {"status": "cleaned", "session_id": session_id}
