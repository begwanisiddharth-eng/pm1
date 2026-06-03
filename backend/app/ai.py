import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI
from pydantic import BaseModel

_ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_ENV_PATH)

MODEL = "gpt-4o-mini"


class AIChatCard(BaseModel):
    id: str
    title: str
    details: str


class AIChatColumn(BaseModel):
    id: str
    title: str
    cardIds: list[str]


class AIChatBoard(BaseModel):
    columns: list[AIChatColumn]
    # cards as list to stay compatible with OpenAI structured output schema constraints
    cards: list[AIChatCard]


class AIChatResponse(BaseModel):
    message: str
    board: AIChatBoard | None = None


def get_client() -> OpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY is not set")
    return OpenAI(api_key=api_key)


def chat(messages: list[dict]) -> AIChatResponse:
    client = get_client()
    response = client.beta.chat.completions.parse(
        model=MODEL,
        messages=messages,
        response_format=AIChatResponse,
    )
    parsed = response.choices[0].message.parsed
    if parsed is None:
        return AIChatResponse(message="I wasn't able to process that request.")
    return parsed
