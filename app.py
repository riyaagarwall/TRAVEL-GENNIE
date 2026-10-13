import os
import json
# pyrefly: ignore [missing-import]
import openai
from openai import OpenAI
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

# Load environment variables from the .env file into the system environment
load_dotenv()

# Initialize the Flask web application
app = Flask(__name__)

# Cache variable to hold the OpenAI client instance once created
_openai_client = None


def get_client():
    """
    Lazily creates and returns the OpenAI client.
    This ensures the app can start and /health works even if the API key is missing.
    """
    global _openai_client

    # Only create the client if it has not been created yet
    if _openai_client is None:
        api_key = os.getenv("OPENAI_API_KEY")

        # Verify that the API key exists and is not just empty whitespace
        if not api_key or not api_key.strip():
            raise ValueError("MISSING_API_KEY")

        # Optional custom base URL (e.g. for proxies or alternate providers)
        base_url = os.getenv("OPENAI_BASE_URL") or None

        # Instantiate the client
        _openai_client = OpenAI(
            api_key=api_key.strip(),
            base_url=base_url
        )

    return _openai_client


def validate_request(data):
    """
    Validates and cleans the incoming JSON payload.
    Returns (cleaned_params, None) if valid, or (None, error_message) if invalid.
    """
    # 1. The request body must be a JSON object (Python dictionary)
    if not isinstance(data, dict):
        return None, "Request body must be a JSON object."

    # 2. Destination: required, string, trimmed, non-empty, max 200 characters
    destination = data.get("destination")
    if not isinstance(destination, str) or not destination.strip():
        return None, "Destination is required and cannot be empty."
    destination = destination.strip()
    if len(destination) > 200:
        return None, "Destination must be 200 characters or less."

    # 3. Days: required whole number (integer, not boolean) between 1 and 14
    days = data.get("days")
    if isinstance(days, bool) or not isinstance(days, int) or days < 1 or days > 14:
        return None, "Days must be a whole number between 1 and 14."

    # 4. Budget: optional, one of "budget", "mid-range", "luxury" (default "mid-range")
    budget = data.get("budget", "mid-range")
    allowed_budgets = {"budget", "mid-range", "luxury"}
    if not isinstance(budget, str) or budget.lower() not in allowed_budgets:
        return None, "Budget must be one of: budget, mid-range, luxury."
    budget = budget.lower()

    # 5. Style: optional, one of "relaxed", "balanced", "packed" (default "balanced")
    style = data.get("style", "balanced")
    allowed_styles = {"relaxed", "balanced", "packed"}
    if not isinstance(style, str) or style.lower() not in allowed_styles:
        return None, "Style must be one of: relaxed, balanced, packed."
    style = style.lower()

    # 6. Interests: optional text, max 200 characters (default "general sightseeing")
    interests = data.get("interests", "general sightseeing")
    if not isinstance(interests, str):
        return None, "Interests must be text."
    interests = interests.strip()
    if not interests:
        interests = "general sightseeing"
    elif len(interests) > 200:
        return None, "Interests must be 200 characters or less."

    # Return the sanitized and defaulted values
    return {
        "destination": destination,
        "days": days,
        "budget": budget,
        "style": style,
        "interests": interests
    }, None


# Home page route: renders the main web application UI
@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


# Health check endpoint: always returns 200 OK regardless of API key presence
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"})


# Travel planning endpoint: validates input, calls AI, and returns itinerary
@app.route("/api/plan", methods=["POST"])
def plan_trip():
    # Parse incoming JSON safely (silent=True avoids crashing on malformed/missing JSON)
    data = request.get_json(silent=True)

    # Validate request payload
    params, error_msg = validate_request(data)
    if error_msg:
        # Return 400 Bad Request immediately without calling OpenAI
        return jsonify({"error": error_msg}), 400

    # Model name from environment variables (default: gpt-4o-mini)
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Define system prompt with JSON schema, budget, style, and interests instructions
    system_prompt = (
        "You are an expert travel planner. You generate personalized day-by-day itineraries. "
        "You MUST respond ONLY with a valid JSON object matching this exact schema:\n"
        "{\n"
        '  "title": "Trip Title",\n'
        '  "summary": "Short summary of the trip",\n'
        '  "days": [\n'
        "    {\n"
        '      "day": 1,\n'
        '      "theme": "Theme for the day",\n'
        '      "activities": [\n'
        "        {\n"
        '          "time": "Morning",\n'
        '          "title": "Activity name",\n'
        '          "description": "Short description of what to do",\n'
        '          "est_cost": "Rough cost estimate (e.g., $15 or Free)"\n'
        "        }\n"
        "      ]\n"
        "    }\n"
        "  ],\n"
        '  "tips": ["Local tip 1", "Local tip 2"]\n'
        "}\n"
        f"Provide an itinerary with exactly {params['days']} day(s).\n"
        f"Budget level: {params['budget']}.\n"
        f"Travel pace/style: {params['style']}.\n"
        f"Interests: {params['interests']}.\n"
        "Use rough cost estimates rather than exact prices."
    )

    # Define the user prompt
    user_prompt = (
        f"Create a {params['days']}-day itinerary for {params['destination']}. "
        f"Budget: {params['budget']}. Travel style: {params['style']}. "
        f"Interests: {params['interests']}."
    )

    # Attempt to call the OpenAI API with specific error handling
    try:
        client = get_client()
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
    except ValueError as e:
        if str(e) == "MISSING_API_KEY":
            return jsonify({"error": "The server is missing its API key."}), 500
        return jsonify({"error": "The AI request failed. Please try again."}), 502
    except openai.AuthenticationError:
        return jsonify({"error": "The API key was rejected."}), 500
    except openai.RateLimitError:
        return jsonify({"error": "Rate limit reached. Try again shortly."}), 429
    except openai.APIConnectionError:
        return jsonify({"error": "Could not reach the AI service."}), 502
    except openai.OpenAIError:
        return jsonify({"error": "The AI request failed. Please try again."}), 502
    except Exception:
        return jsonify({"error": "The AI request failed. Please try again."}), 502

    # Extract the raw text from the AI response
    raw_content = response.choices[0].message.content

    # Parse and validate the structure of the JSON returned by the AI
    try:
        itinerary_data = json.loads(raw_content)
    except Exception:
        return jsonify({"error": "The AI returned an unreadable plan. Please try again."}), 502

    # Verify that 'days' is a non-empty list and each day has an 'activities' list
    days_list = itinerary_data.get("days") if isinstance(itinerary_data, dict) else None
    if not isinstance(days_list, list) or len(days_list) == 0:
        return jsonify({"error": "The AI returned an unreadable plan. Please try again."}), 502

    for day_entry in days_list:
        if not isinstance(day_entry, dict) or not isinstance(day_entry.get("activities"), list):
            return jsonify({"error": "The AI returned an unreadable plan. Please try again."}), 502

    # Return the validated itinerary data to the client
    return jsonify(itinerary_data)


# Start the development server if run directly
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
