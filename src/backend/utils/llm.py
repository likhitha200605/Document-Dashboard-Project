import requests

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "phi"


def generate_summary(metrics: dict, text: str, domain: str = "general") -> str:
    """Generate a professional summary using Ollama phi model."""

    metrics_text = "\n".join(
        [f"- {k.replace('_', ' ').title()}: {v:,.2f}" for k, v in list(metrics.items())[:20]]
    )
    doc_snippet = text[:1200].strip()

    prompt = (
        f"You are a {domain} analyst. Generate a concise, professional 3-4 sentence summary "
        f"based on the extracted data below. Focus on key insights and notable figures. "
        f"Only output the final answer, no preamble.\n\n"
        f"Extracted Metrics:\n{metrics_text}\n\n"
        f"Document Excerpt:\n{doc_snippet}"
    )

    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": MODEL, "prompt": prompt, "stream": False},
            timeout=60,
        )
        response.raise_for_status()
        result = response.json()
        return result.get("response", "").strip()

    except requests.exceptions.ConnectionError:
        return _fallback_summary(metrics, domain)
    except requests.exceptions.Timeout:
        return _fallback_summary(metrics, domain)
    except Exception:
        return _fallback_summary(metrics, domain)


def _fallback_summary(metrics: dict, domain: str = "general") -> str:
    if not metrics:
        return "No quantitative data was found in this document."

    count = len(metrics)
    sorted_items = sorted(metrics.items(), key=lambda x: x[1], reverse=True)
    top = sorted_items[:3]
    highlights = "; ".join(
        [f"{k.replace('_', ' ').title()} = {v:,.0f}" for k, v in top]
    )

    return (
        f"This {domain} document contains {count} extracted metric(s). "
        f"Top figures: {highlights}. "
        f"Review the dashboard below for a full breakdown of all extracted data points."
    )
