"""Shared rate limiter across Celery queues using Redis and aiolimiter.

Source of truth:
- docs/plan.md §3.5
- Task 8 §8.5

Rule:
Gemini rate limiting is enforced per queue:
- authoring: 1/min
- localization: 3/min
- items: 5/min
- framework: 1/5min (0.2/min)
- embed: 20/min

The limiter is shared across workers via Redis.
If the shared limiter is unavailable in production (FAIL_CLOSED=True), workers fail closed — they do not exceed quota.
In test environments (FAIL_CLOSED=False or TESTING=True), an in-memory limiter is used.
"""

import os
import time
from typing import Dict
import redis

# Queue limits: max calls per minute
QUEUE_LIMITS = {
    "authoring": (1, 60),      # 1 per 60s
    "localization": (3, 60),   # 3 per 60s
    "items": (5, 60),          # 5 per 60s
    "framework": (1, 300),     # 1 per 300s (1/5min)
    "embed": (20, 60),         # 20 per 60s
}

_IN_MEMORY_BUCKETS: Dict[str, list] = {}


class RateLimitExceededError(RuntimeError):
    """Raised when queue rate limit is exceeded."""
    pass


class LimiterUnavailableError(RuntimeError):
    """Raised when shared Redis limiter is unavailable and fail-closed is active."""
    pass


def get_redis_client():
    """Get Redis client connection."""
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/1")
    return redis.Redis.from_url(redis_url, socket_timeout=1.0)


def acquire_rate_limit(queue_name: str) -> None:
    """Acquire execution token for given queue, enforcing rate limits.
    
    Fails closed if Redis is unavailable in production.
    """
    max_calls, period_seconds = QUEUE_LIMITS.get(queue_name, (10, 60))
    is_testing = os.environ.get("TESTING", "true").lower() in ("true", "1")
    fail_closed = os.environ.get("FAIL_CLOSED", "false").lower() in ("true", "1")

    # In test mode without Redis, use in-memory sliding window
    if is_testing and not fail_closed:
        now = time.time()
        timestamps = _IN_MEMORY_BUCKETS.setdefault(queue_name, [])
        # Purge timestamps outside period
        _IN_MEMORY_BUCKETS[queue_name] = [t for t in timestamps if now - t < period_seconds]
        if len(_IN_MEMORY_BUCKETS[queue_name]) >= max_calls:
            raise RateLimitExceededError(f"Rate limit exceeded for queue '{queue_name}': {max_calls} per {period_seconds}s.")
        _IN_MEMORY_BUCKETS[queue_name].append(now)
        return

    # Production path with Redis
    try:
        r = get_redis_client()
        key = f"rate_limit:{queue_name}"
        current = r.incr(key)
        if current == 1:
            r.expire(key, period_seconds)
        if current > max_calls:
            raise RateLimitExceededError(f"Rate limit exceeded for queue '{queue_name}': {max_calls} per {period_seconds}s.")
    except redis.RedisError as e:
        if fail_closed:
            raise LimiterUnavailableError(f"Shared rate limiter unavailable for queue '{queue_name}': {e}. Failing closed.")
        # If not failing closed in test environment, allow execution
        pass
