import re
from collections import defaultdict

# ── Stop words to reject as metric keys ──────────────────────────────────────
STOP_WORDS = {
    "the", "and", "for", "are", "this", "that", "with", "from", "was", "has",
    "had", "not", "but", "our", "all", "any", "its", "per", "use", "can",
    "may", "also", "each", "been", "were", "will", "just", "than", "then",
    "they", "them", "their", "would", "could", "should", "about", "above",
    "after", "before", "between", "into", "over", "under", "such", "both",
    "only", "same", "more", "less", "most", "other", "within", "without",
    "page", "section", "figure", "table", "note", "ref", "see", "including",
}

# ── Domain keyword signatures ─────────────────────────────────────────────────
DOMAIN_SIGNATURES = {
    "finance":    ["revenue", "profit", "loss", "ebitda", "margin", "equity",
                   "assets", "liabilities", "cash", "dividend", "eps", "roe",
                   "budget", "expenditure", "income", "sales", "turnover"],
    "education":  ["students", "enrollment", "graduates", "faculty", "courses",
                   "pass rate", "attendance", "scholarship", "admission", "cgpa",
                   "grade", "score", "marks", "university", "college"],
    "healthcare": ["patients", "beds", "mortality", "recovery", "cases",
                   "admissions", "discharge", "surgery", "dosage", "clinical",
                   "trials", "hospital", "vaccine", "infection"],
    "ngo":        ["beneficiaries", "volunteers", "donations", "grants",
                   "outreach", "impact", "households", "communities", "programs",
                   "funding", "aid", "relief", "projects"],
    "government": ["population", "gdp", "tax", "allocation", "ministry",
                   "scheme", "census", "constituency", "votes", "districts",
                   "departments", "expenditure", "policy", "regulation"],
    "technology": ["users", "downloads", "requests", "latency", "uptime",
                   "errors", "deployments", "servers", "api", "throughput",
                   "coverage", "bugs", "releases", "sprints"],
}

# ── Category buckets for grouping metrics ────────────────────────────────────
CATEGORY_KEYWORDS = {
    "financial":   ["revenue", "profit", "loss", "sales", "budget", "cost",
                    "expense", "income", "cash", "fund", "grant", "donation",
                    "tax", "gdp", "expenditure", "earning", "turnover", "asset",
                    "liabilit", "equity", "dividend"],
    "people":      ["student", "employee", "staff", "patient", "user", "member",
                    "beneficiar", "volunteer", "faculty", "population", "voter",
                    "customer", "client", "worker", "resident", "household"],
    "performance": ["rate", "ratio", "margin", "score", "percentage", "growth",
                    "increase", "decrease", "change", "index", "average", "mean",
                    "median", "yield", "return", "efficiency"],
    "volume":      ["count", "total", "number", "quantity", "amount", "sum",
                    "unit", "item", "case", "order", "transaction", "download",
                    "visit", "request", "project", "program"],
}


def normalize_key(key: str) -> str:
    key = key.lower().strip()
    key = re.sub(r"[^a-z0-9\s]", "", key)
    key = re.sub(r"\s+", "_", key)
    return key.strip("_")


def categorize_metric(key: str) -> str:
    key_lower = key.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in key_lower for kw in keywords):
            return category
    return "other"


def detect_domain(text: str) -> str:
    text_lower = text.lower()
    scores = {}
    for domain, keywords in DOMAIN_SIGNATURES.items():
        scores[domain] = sum(1 for kw in keywords if kw in text_lower)
    best = max(scores, key=scores.get)
    return best if scores[best] >= 2 else "general"


def _is_valid_key(raw_key: str) -> bool:
    key = raw_key.lower().strip()
    if len(key) < 3:
        return False
    if key in STOP_WORDS:
        return False
    # reject keys that are purely numeric or very short after cleaning
    cleaned = re.sub(r"[^a-z]", "", key)
    if len(cleaned) < 3:
        return False
    return True


def parse_metrics(text: str) -> dict:
    """
    Extract keyword-number pairs from document text.
    Returns { norm_key: { value, raw_key, category, unit, confidence } }
    """
    raw_hits: dict[str, list] = defaultdict(list)

    # Pattern A: "Label: $1,234.56" or "Label = 99.5%"
    for m in re.finditer(
        r"([A-Za-z][A-Za-z &\/\(\)]{1,50}?)\s*[:=]\s*"
        r"([\$£€₹]?)\s*([\d,]+(?:\.\d+)?)\s*(%|bn|mn|k|cr|lakh)?",
        text, re.IGNORECASE
    ):
        label, currency, num_str, unit_suffix = m.group(1), m.group(2), m.group(3), m.group(4) or ""
        _register(raw_hits, label, num_str, currency, unit_suffix, confidence=0.9)

    # Pattern B: "Label – 1,234" (dash/en-dash separator)
    for m in re.finditer(
        r"([A-Za-z][A-Za-z &\/]{1,40}?)\s*[–\-]\s*([\d,]+(?:\.\d+)?)\s*(%|bn|mn|k)?",
        text, re.IGNORECASE
    ):
        label, num_str, unit_suffix = m.group(1), m.group(2), m.group(3) or ""
        _register(raw_hits, label, num_str, "", unit_suffix, confidence=0.75)

    # Pattern C: "Word(s) followed by number on same line" (table rows, loose text)
    for m in re.finditer(
        r"^([A-Za-z][A-Za-z \t]{2,35}?)\s{2,}([\$£€₹]?)\s*([\d,]+(?:\.\d+)?)\s*(%|bn|mn|k)?",
        text, re.MULTILINE | re.IGNORECASE
    ):
        label, currency, num_str, unit_suffix = m.group(1), m.group(2), m.group(3), m.group(4) or ""
        _register(raw_hits, label, num_str, currency, unit_suffix, confidence=0.6)

    # Pattern D: inline "X of Y" style — "enrollment of 4500"
    for m in re.finditer(
        r"([A-Za-z][A-Za-z ]{2,30}?)\s+of\s+([\d,]+(?:\.\d+)?)",
        text, re.IGNORECASE
    ):
        label, num_str = m.group(1), m.group(2)
        _register(raw_hits, label, num_str, "", "", confidence=0.55)

    # ── Aggregate: pick best (highest-confidence, then highest value) ─────────
    metrics = {}
    for norm_key, hits in raw_hits.items():
        best = max(hits, key=lambda h: (h["confidence"], h["value"]))
        metrics[norm_key] = best

    metrics = _deduplicate(metrics)
    return metrics


def _register(raw_hits, label, num_str, currency, unit_suffix, confidence):
    label = label.strip()
    if not _is_valid_key(label):
        return

    num_str = num_str.replace(",", "")
    try:
        value = float(num_str)
    except ValueError:
        return

    # Apply unit multipliers
    suffix = unit_suffix.lower() if unit_suffix else ""
    if suffix in ("bn",):
        value *= 1_000_000_000
    elif suffix in ("mn",):
        value *= 1_000_000
    elif suffix in ("cr",):
        value *= 10_000_000
    elif suffix in ("lakh",):
        value *= 100_000
    elif suffix == "k":
        value *= 1_000

    # Reject noise values
    if value < 1 or value > 999_000_000_000_000:
        return

    unit = ""
    if suffix == "%":
        unit = "%"
    elif currency in ("$", "£", "€", "₹"):
        unit = currency

    norm_key = normalize_key(label)
    if not norm_key or len(norm_key) < 3:
        return

    raw_hits[norm_key].append({
        "value": value,
        "raw_key": label,
        "unit": unit,
        "category": categorize_metric(label),
        "confidence": confidence,
    })


def _deduplicate(metrics: dict) -> dict:
    """Remove keys whose normalized form is a strict substring of a longer key
    AND they share the same value — keep the more descriptive key."""
    keys = list(metrics.keys())
    to_remove = set()
    for k1 in keys:
        for k2 in keys:
            if k1 != k2 and k1 in k2 and metrics[k1]["value"] == metrics[k2]["value"]:
                to_remove.add(k1)
    return {k: v for k, v in metrics.items() if k not in to_remove}


def build_response_metrics(raw_metrics: dict) -> dict:
    """Convert internal metric dicts to simple { key: value } for API response."""
    return {k: v["value"] for k, v in raw_metrics.items()}


def build_rich_metrics(raw_metrics: dict) -> list:
    """Return full metric detail list for the frontend dashboard."""
    result = []
    for norm_key, meta in raw_metrics.items():
        result.append({
            "key": norm_key,
            "label": meta["raw_key"],
            "value": meta["value"],
            "unit": meta["unit"],
            "category": meta["category"],
            "confidence": round(meta["confidence"], 2),
        })
    # Sort by confidence desc, then value desc
    result.sort(key=lambda x: (-x["confidence"], -x["value"]))
    return result
