from app.database import hash_password, verify_password


# --- hash_password ---

def test_hash_password_returns_correct_format() -> None:
    h = hash_password("secret")
    parts = h.split(":")
    assert len(parts) == 5
    assert parts[0] == "pbkdf2"
    assert parts[1] == "sha256"
    assert parts[2] == "100000"


def test_hash_password_different_salts_each_call() -> None:
    h1 = hash_password("same")
    h2 = hash_password("same")
    assert h1 != h2


def test_hash_password_stores_iterations() -> None:
    h = hash_password("test")
    assert h.split(":")[2] == "100000"


# --- verify_password ---

def test_verify_password_correct_password_returns_true() -> None:
    h = hash_password("correct")
    assert verify_password("correct", h) is True


def test_verify_password_wrong_password_returns_false() -> None:
    h = hash_password("correct")
    assert verify_password("wrong", h) is False


def test_verify_password_empty_string_returns_false() -> None:
    h = hash_password("correct")
    assert verify_password("", h) is False


def test_verify_password_malformed_hash_returns_false() -> None:
    assert verify_password("anything", "notahash") is False
    assert verify_password("anything", "") is False
    assert verify_password("anything", "a:b:c") is False


def test_verify_password_tampered_key_returns_false() -> None:
    h = hash_password("original")
    parts = h.split(":")
    parts[-1] = "00" * 32
    tampered = ":".join(parts)
    assert verify_password("original", tampered) is False


def test_verify_password_round_trip_multiple_passwords() -> None:
    for pw in ["short", "a longer passphrase", "P@$$w0rd!", "   spaces   "]:
        h = hash_password(pw)
        assert verify_password(pw, h) is True
        assert verify_password(pw + "x", h) is False
