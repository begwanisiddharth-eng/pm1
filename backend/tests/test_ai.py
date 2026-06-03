import os
from unittest.mock import MagicMock, patch

import pytest

from app.ai import MODEL, ask, get_client


def test_model_is_gpt4o_mini() -> None:
    assert MODEL == "gpt-4o-mini"


def test_get_client_raises_if_api_key_missing() -> None:
    with patch.dict(os.environ, {}, clear=True):
        with pytest.raises(ValueError, match="OPENAI_API_KEY"):
            get_client()


def test_ask_calls_openai_with_prompt() -> None:
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "4"
    with patch("app.ai.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client
        result = ask("What is 2+2?")
    assert result == "4"
    mock_client.chat.completions.create.assert_called_once_with(
        model=MODEL,
        messages=[{"role": "user", "content": "What is 2+2?"}],
    )


def test_ask_returns_empty_string_for_none_content() -> None:
    mock_response = MagicMock()
    mock_response.choices[0].message.content = None
    with patch("app.ai.get_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_get_client.return_value = mock_client
        result = ask("Hello?")
    assert result == ""


@pytest.mark.skipif(
    not os.environ.get("OPENAI_API_KEY"),
    reason="OPENAI_API_KEY not set — skipping live API test",
)
def test_ask_live_2_plus_2() -> None:
    result = ask("What is 2+2? Reply with just the number.")
    assert "4" in result
