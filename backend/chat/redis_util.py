import json 
from .redis_client import redis_client

def save_temp_message(sender_id, receiver_id, content, ttl=604800):
    """Save message to Redis. Default TTL: 7 days (604800 seconds)"""
    key = f"chat:{sender_id}:{receiver_id}"
    message = {
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "content": content,
    }
    redis_client.rpush(key, json.dumps(message))
    redis_client.expire(key, ttl)  # Set 7-day TTL by default

def get_temp_messages(sender_id, receiver_id):
    """Fetch messages from Redis WITHOUT deleting them. Messages persist until manually removed or TTL expires."""
    key = f"chat:{sender_id}:{receiver_id}"
    messages = [json.loads(m) for m in redis_client.lrange(key, 0, -1)]
    return messages

def remove_temp_message(sender_id, receiver_id, content):
    """Remove a specific message from Redis (when saved to vault)"""
    key = f"chat:{sender_id}:{receiver_id}"
    messages = redis_client.lrange(key, 0, -1)
    for msg in messages:
        msg_obj = json.loads(msg)
        if msg_obj["content"] == content:
            redis_client.lrem(key, 1, msg)
            break

def cleanup_all_temp_messages(sender_id, receiver_id):
    """Delete ALL ephemeral messages (called on tab switch or logout)"""
    key = f"chat:{sender_id}:{receiver_id}"
    redis_client.delete(key)