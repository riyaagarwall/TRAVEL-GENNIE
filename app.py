import os
import json
from flask import Flask, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from the .env file into the system environment
load_dotenv()

# Initialize the Flask web application
app = Flask(__name__)

# Read OpenAI configuration from environment variables
api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_BASE_URL") or None  # None means use the standard OpenAI URL
model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")  # Default to gpt-4o-mini if not specified

# Create the OpenAI client instance with our configuration
client = OpenAI(
    api_key=api_key,
    base_url=base_url
)


# Health check endpoint to verify that the server is running properly
@app.route("/health", methods=["GET"])
def health_check():
    # Return a simple JSON response indicating the server status
    return jsonify({"status": "ok"})


# Main endpoint to generate a travel itinerary
@app.route("/api/plan", methods=["POST"])
def plan_trip():
    # Parse the incoming JSON data sent by the client
    data = request.get_json()
    destination = data.get("destination")
    days = data.get("days")

    # Define the system prompt with instructions and the exact JSON schema required
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
        f"Provide an itinerary with exactly {days} day(s). "
        "Use rough cost estimates rather than exact prices."
    )

    # Define the user prompt containing the trip details
    user_prompt = f"Create a {days}-day travel itinerary for {destination}."

    # Call the OpenAI Chat Completions API requesting a JSON object response
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        response_format={"type": "json_object"}
    )

    # Extract the raw JSON string from the model's message content
    raw_content = response.choices[0].message.content

    # Parse the raw JSON string into a Python dictionary
    itinerary_data = json.loads(raw_content)

    # Return the parsed itinerary as a JSON response to the caller
    return jsonify(itinerary_data)


# Run the Flask development server when executing this script directly
if __name__ == "__main__":
    # debug=True automatically reloads the server on code changes
    app.run(host="127.0.0.1", port=5000, debug=True)
