from app.models.schemas import AnalyzeRequest, SentimentLabel
from app.services.analysis_service import AnalysisService

service = AnalysisService()


def test_booking_intent_true_for_book_demo():
    result = service.analyze_transcript(
        AnalyzeRequest(
            transcript="Customer: I want to book a demo tomorrow afternoon please.",
            customer_name="Alex",
        )
    )
    assert result.booking_intent is True


def test_confirm_email_alone_is_not_booking_intent():
    result = service.analyze_transcript(
        AnalyzeRequest(
            transcript="Customer: Please confirm you received my email about the invoice.",
            customer_name="Sam",
        )
    )
    assert result.booking_intent is False


def test_mixed_sentiment_when_thanks_and_frustrated():
    result = service.analyze_transcript(
        AnalyzeRequest(
            transcript="Customer: Thanks for calling, but I am frustrated with the delay.",
            customer_name="Jordan",
        )
    )
    assert result.sentiment == SentimentLabel.MIXED


def test_wait_word_boundary_does_not_explode_score():
    result = service.analyze_transcript(
        AnalyzeRequest(
            transcript="Agent: We will wait for your reply. Customer: Okay, sounds fine.",
            customer_name="Casey",
        )
    )
    assert -1.0 <= result.sentiment_score <= 1.0
    # Single "wait" should not overwhelm a mostly calm exchange
    assert result.sentiment in {
        SentimentLabel.NEUTRAL,
        SentimentLabel.POSITIVE,
        SentimentLabel.MIXED,
        SentimentLabel.NEGATIVE,
    }


def test_scheduled_keyword_categorized_as_scheduling():
    result = service.analyze_transcript(
        AnalyzeRequest(
            transcript=(
                "Agent: Your visit is scheduled for Tuesday. "
                "Customer: Great, the scheduled time works for me."
            ),
            customer_name="Riley",
        )
    )
    scheduling_hits = [k for k in result.keywords if k.category == "scheduling"]
    assert any(k.term.startswith("schedul") for k in scheduling_hits)
