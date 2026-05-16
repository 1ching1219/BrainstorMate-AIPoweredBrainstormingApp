import os
import random

# Template fallbacks used when no API key is configured
_FEEDBACK_TEMPLATES = {
    'Designer': [
        "From a design perspective, I think we should consider improving the user flow for better usability.",
        "The visual hierarchy could be more intuitive. Let's prioritize the most important elements.",
        "Have we considered how this design will work on mobile devices? Responsive design is crucial here.",
        "The current color scheme may present accessibility issues. We should ensure sufficient contrast ratios.",
        "I suggest we simplify the navigation to reduce cognitive load for users.",
    ],
    'Engineer': [
        "We need to consider the scalability of this solution as user adoption grows.",
        "This architecture might introduce potential bottlenecks. Let's review the performance implications.",
        "From a technical standpoint, we should implement proper error handling for edge cases.",
        "We could optimize this by implementing a caching layer to reduce redundant computations.",
        "Let's ensure our approach is maintainable long-term with proper documentation and testing.",
    ],
    'Finance': [
        "Based on our projections, this feature could increase revenue by approximately 12% in Q3.",
        "We should analyze the ROI implications before committing resources to this initiative.",
        "From a financial perspective, we need to consider both the direct and indirect costs.",
        "This investment has a potential payback period of 9 months, which aligns with our goals.",
        "We should allocate a contingency budget to manage unexpected development costs.",
    ],
    'Professor': [
        "Recent research in this field suggests that our approach should incorporate more user feedback loops.",
        "There's an interesting parallel here with the problem solving frameworks discussed in innovation theory.",
        "I'd recommend examining the case studies from similar implementations in adjacent industries.",
        "The theoretical foundation for this approach is sound, but we should validate with empirical testing.",
        "Let's apply first principles thinking to break down this complex problem into manageable components.",
    ],
    'default': [
        "I have some insights that might be helpful for our discussion.",
        "Let's consider additional factors that could influence our decision.",
        "Based on my analysis, there are several trade-offs we should evaluate.",
        "I'd suggest we gather more data before finalizing this approach.",
        "We should align on our key objectives before proceeding further.",
    ]
}

_RESPONSE_TEMPLATES = {
    'Designer': [
        "That's an interesting point from a design perspective.",
        "Looking at this through a design lens, I'd suggest considering the user experience impacts.",
        "We should ensure the visual design supports the functionality you're describing.",
    ],
    'Engineer': [
        "From a technical standpoint, we should consider the implementation complexity.",
        "I'd recommend evaluating the system architecture implications of this approach.",
        "Let's think about how we can make this solution scalable and maintainable.",
    ],
    'Finance': [
        "When analyzing the financial implications, we should consider both short and long-term ROI.",
        "This approach could impact our budget forecasting for the next quarter.",
        "Let's evaluate the cost-benefit ratio before proceeding.",
    ],
    'Professor': [
        "The theoretical framework you're describing has interesting practical applications.",
        "Research in this area suggests we should consider alternative approaches as well.",
        "Let's analyze this systematically based on established methodologies.",
    ],
    'default': [
        "That's a valuable contribution to our discussion.",
        "I appreciate your perspective on this matter.",
        "Let's explore that idea further in our meeting.",
    ]
}


def _get_openai_client():
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except Exception:
        return None


def _openai_model():
    return os.getenv('OPENAI_MODEL', 'gpt-4o')


def _extract_text_content(choice):
    """Best-effort extraction for SDK variants where content may be a string or parts list."""
    content = getattr(getattr(choice, 'message', None), 'content', None)
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                text = item.get('text')
                if isinstance(text, str) and text.strip():
                    parts.append(text.strip())
            elif hasattr(item, 'text') and isinstance(item.text, str) and item.text.strip():
                parts.append(item.text.strip())
        return "\n".join(parts).strip()
    return ""


def generate_ai_feedback(role, meeting_context=None):
    """Generate AI feedback based on the agent's role. Uses OpenAI when key is set."""
    client = _get_openai_client()
    model = _openai_model()

    if client:
        try:
            context_note = ""
            if meeting_context:
                context_note = f"\n\nRecent conversation:\n{meeting_context}"

            prompt = (
                f"You are a {role} in a collaborative brainstorming session. "
                f"Provide a brief, insightful comment or suggestion relevant to your expertise "
                f"(1-2 sentences max).{context_note}"
            )
            print(f"[AI DEBUG] generate_ai_feedback | model={model} role={role}")
            for max_tokens in (300, 700):
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    max_completion_tokens=max_tokens,
                )
                choice = response.choices[0]
                finish_reason = choice.finish_reason
                parsed_content = _extract_text_content(choice)
                print(
                    f"[AI DEBUG] feedback response | max_tokens={max_tokens} "
                    f"finish_reason={finish_reason} content={repr(parsed_content)}"
                )

                if parsed_content:
                    return parsed_content

                if finish_reason != 'length':
                    break

            # content is None/empty (or no visible text) — fall through to template
            print(f"[AI DEBUG] content is None/empty after retry, using template fallback")
        except Exception as e:
            print(f"[AI DEBUG] OpenAI error in generate_ai_feedback: {type(e).__name__}: {e}")

    templates = _FEEDBACK_TEMPLATES.get(role, _FEEDBACK_TEMPLATES['default'])
    result = random.choice(templates)
    print(f"[AI DEBUG] generate_ai_feedback using template: {repr(result)}")
    return result


def generate_ai_response(message, role):
    """Generate AI response to a user message. Uses OpenAI when key is set."""
    client = _get_openai_client()
    model = _openai_model()

    if client:
        try:
            prompt = (
                f"You are a {role} in a collaborative brainstorming session. "
                f"A participant just said: \"{message}\"\n"
                f"Respond as a {role} with a brief, helpful comment (1-2 sentences)."
            )
            print(f"[AI DEBUG] generate_ai_response | model={model} role={role} message={repr(message[:80])}")
            for max_tokens in (300, 700):
                response = client.chat.completions.create(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    max_completion_tokens=max_tokens,
                )
                choice = response.choices[0]
                finish_reason = choice.finish_reason
                parsed_content = _extract_text_content(choice)
                print(
                    f"[AI DEBUG] response reply | max_tokens={max_tokens} "
                    f"finish_reason={finish_reason} content={repr(parsed_content)}"
                )

                if parsed_content:
                    return parsed_content

                if finish_reason != 'length':
                    break

            print(f"[AI DEBUG] content is None/empty after retry, using template fallback")
        except Exception as e:
            print(f"[AI DEBUG] OpenAI error in generate_ai_response: {type(e).__name__}: {e}")

    templates = _RESPONSE_TEMPLATES.get(role, _RESPONSE_TEMPLATES['default'])
    result = random.choice(templates)
    print(f"[AI DEBUG] generate_ai_response using template: {repr(result)}")
    return result
