import re
from collections import Counter

from app.models.schemas import AnalyzeRequest, AnalyzeResponse, KeywordHit, SentimentBreakdown, SentimentLabel


POSITIVE_TERMS = {
    "great", "excellent", "thank", "thanks", "perfect", "happy", "wonderful",
    "appreciate", "helpful", "awesome", "glad", "pleased", "confirm", "confirmed",
    "sounds good", "works for me", "looking forward",
}

NEGATIVE_TERMS = {
    "frustrated", "angry", "upset", "disappointed", "cancel", "cancelled", "problem",
    "issue", "complaint", "unacceptable", "rude", "wait", "waiting", "never",
    "worst", "terrible", "not happy", "unhappy",
}

BOOKING_TERMS = {
    "schedule", "book", "booking", "appointment", "reserve", "reservation",
    "confirm", "confirmed", "tomorrow", "next week", "available", "slot",
    "calendar", "see you", "looking forward",
}

RISK_TERMS = {
    "lawyer", "legal", "sue", "complaint", "refund", "chargeback", "supervisor",
    "manager", "escalate", "regulator", "report you",
}

TOPIC_PATTERNS: dict[str, list[str]] = {
    "scheduling": ["schedule", "appointment", "calendar", "availability", "slot"],
    "pricing": ["price", "cost", "fee", "payment", "invoice", "quote"],
    "support": ["help", "issue", "problem", "fix", "support", "troubleshoot"],
    "cancellation": ["cancel", "reschedule", "postpone", "change"],
    "onboarding": ["welcome", "setup", "getting started", "new account"],
}


class AnalysisService:
    """Rule-based mock NLP engine for transcript analysis."""

    def analyze_transcript(self, request: AnalyzeRequest) -> AnalyzeResponse:
        text = request.transcript.strip()
        lowered = text.lower()

        positive_hits = self._count_phrase_hits(lowered, POSITIVE_TERMS)
        negative_hits = self._count_phrase_hits(lowered, NEGATIVE_TERMS)
        booking_hits = self._count_phrase_hits(lowered, BOOKING_TERMS)
        risk_flags = self._detect_risk_flags(lowered)

        total_polarity = positive_hits + negative_hits + 1
        positive_ratio = positive_hits / total_polarity
        negative_ratio = negative_hits / total_polarity
        neutral_ratio = max(0.0, 1.0 - positive_ratio - negative_ratio)

        sentiment_score = round((positive_hits - negative_hits) / max(total_polarity, 1), 4)
        sentiment_score = max(-1.0, min(1.0, sentiment_score))
        sentiment = self._label_sentiment(sentiment_score, positive_hits, negative_hits)

        booking_confidence = min(1.0, round(booking_hits / 4, 4))
        booking_intent = booking_hits >= 2 or any(term in lowered for term in ("book", "schedule", "confirm"))

        keywords = self._extract_keywords(lowered)
        topics = self._detect_topics(lowered)
        summary = self._generate_summary(sentiment, booking_intent, topics, request.customer_name)

        return AnalyzeResponse(
            sentiment=sentiment,
            sentiment_score=sentiment_score,
            sentiment_breakdown=SentimentBreakdown(
                positive=round(positive_ratio, 4),
                neutral=round(neutral_ratio, 4),
                negative=round(negative_ratio, 4),
            ),
            booking_intent=booking_intent,
            booking_confidence=booking_confidence,
            keywords=keywords,
            summary=summary,
            topics=topics,
            risk_flags=risk_flags,
        )

    def _count_phrase_hits(self, text: str, phrases: set[str]) -> int:
        return sum(1 for phrase in phrases if phrase in text)

    def _label_sentiment(self, score: float, positive: int, negative: int) -> SentimentLabel:
        if positive > 0 and negative > 0:
            return SentimentLabel.MIXED
        if score >= 0.25:
            return SentimentLabel.POSITIVE
        if score <= -0.25:
            return SentimentLabel.NEGATIVE
        return SentimentLabel.NEUTRAL

    def _extract_keywords(self, text: str) -> list[KeywordHit]:
        tokens = re.findall(r"[a-zA-Z']{4,}", text)
        stopwords = {
            "that", "this", "with", "have", "from", "they", "would", "there",
            "about", "could", "should", "their", "which", "because", "really",
        }
        filtered = [token for token in tokens if token not in stopwords]
        counter = Counter(filtered)
        keywords: list[KeywordHit] = []
        for term, count in counter.most_common(8):
            category = self._categorize_term(term)
            keywords.append(KeywordHit(term=term, count=count, category=category))
        return keywords

    def _categorize_term(self, term: str) -> str:
        for category, patterns in TOPIC_PATTERNS.items():
            if term in patterns:
                return category
        if term in {"thank", "thanks", "great", "happy", "sorry"}:
            return "sentiment"
        return "general"

    def _detect_topics(self, text: str) -> list[str]:
        topics = []
        for topic, patterns in TOPIC_PATTERNS.items():
            if any(pattern in text for pattern in patterns):
                topics.append(topic)
        return topics or ["general inquiry"]

    def _detect_risk_flags(self, text: str) -> list[str]:
        flags = []
        for term in RISK_TERMS:
            if term in text:
                flags.append(f"Detected escalation language: '{term}'")
        if text.count("!") >= 3:
            flags.append("High punctuation intensity may indicate frustration")
        if "hold" in text and ("forever" in text or "long time" in text):
            flags.append("Customer expressed dissatisfaction with wait time")
        return flags

    def _generate_summary(
        self,
        sentiment: SentimentLabel,
        booking_intent: bool,
        topics: list[str],
        customer_name: str | None,
    ) -> str:
        subject = customer_name or "The customer"
        topic_text = ", ".join(topics)
        booking_text = (
            "Strong booking intent was detected."
            if booking_intent
            else "No clear booking intent was detected."
        )
        return (
            f"{subject} engaged in a {sentiment.value} conversation focused on {topic_text}. "
            f"{booking_text} Automated rule-based analysis generated this summary."
        )
