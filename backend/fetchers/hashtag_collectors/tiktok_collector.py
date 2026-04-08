from __future__ import annotations

from backend.processors.hashtag_analyzer import HashtagAnalyzer


class TikTokCollector:
    def run(self, window_hours: int = 48, prev_window_hours: int = 48, limit: int = 50) -> int:
        return HashtagAnalyzer().update_trending_hashtags(
            platforms=["tiktok"],
            window_hours=window_hours,
            prev_window_hours=prev_window_hours,
            limit=limit,
        )


if __name__ == "__main__":
    updated = TikTokCollector().run()
    print(f"updated={updated}")

