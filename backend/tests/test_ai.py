import os
from unittest.mock import patch

import pytest

from app.ai import MODEL, get_client


def test_model_is_gpt4o_mini() -> None:
    assert MODEL == "gpt-4o-mini"


def test_get_client_raises_if_api_key_missing() -> None:
    get_client.cache_clear()
    try:
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="OPENAI_API_KEY"):
                get_client()
    finally:
        get_client.cache_clear()
