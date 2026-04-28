"""
Gemini MCP Core
───────────────
Handles the interaction with the Gemini API, tool definition, and orchestration.
"""
from google import genai
from google.genai import types
from app.config import get_settings

settings = get_settings()

# Initialize Client. Use the gemini api key from config if available.
if settings.gemini_api_key:
    client = genai.Client(api_key=settings.gemini_api_key)
else:
    client = None

SYSTEM_PROMPT = """
You are Artemis, an AI-powered smart home virtual assistant.
You act as an ambient intelligence. You understand natural language, evaluate sensor data, and seamlessly execute actions.
You are friendly, conversational, and calmly confident. You provide short, natural responses. You never nag or over-explain unless asked.
You have access to tools that can read sensors or control devices.

CRITICAL RULES:
1. When asked to control a device, you MUST use the `control_device` tool.
2. Only say you did something IF the tool call succeeds. The user relies on you for real-time status.
3. Be proactive. If sensors show environmental changes that warrant action, suggest it.

The user's request will be accompanied by the CURRENT CONTEXT (time, sensors, device states).
"""

def get_tools_definition():
    """Defines the available tools for the Gemini model."""
    return types.Tool(
        function_declarations=[
            types.FunctionDeclaration(
                name="control_device",
                description="Turn a specific smart home device on or off, or set its attributes like color and brightness.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "device_name": types.Schema(
                            type=types.Type.STRING,
                            description="The plain English name of the device (e.g., 'fan', 'lights', 'studio fan')."
                        ),
                        "action": types.Schema(
                            type=types.Type.STRING,
                            description="The action: 'on', 'off', or 'set'."
                        ),
                        "payload": types.Schema(
                            type=types.Type.OBJECT,
                            description="Required if action is 'set'. A dictionary of capabilities to update. e.g. {'brightness': 75, 'color': '#FF0000'}."
                        )
                    },
                    required=["device_name", "action"]
                )
            ),
            types.FunctionDeclaration(
                name="execute_function",
                description="Execute a predefined software or hardware function/macro.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "function_name": types.Schema(
                            type=types.Type.STRING,
                            description="The name of the function to execute (e.g., 'Morning Summary Email', 'Deep Shield')."
                        ),
                        "parameters": types.Schema(
                            type=types.Type.OBJECT,
                            description="A JSON object containing any necessary parameters for the function."
                        )
                    },
                    required=["function_name"]
                )
            ),
            types.FunctionDeclaration(
                name="get_sensor_data",
                description="Retrieve the latest real-time sensor data from the smart home.",
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={},
                )
            )
        ]
    )

async def chat_with_artemis(user_message: str, context_str: str, history: list[dict] = None) -> types.GenerateContentResponse | None:
    """
    Sends the message to Gemini and returns the response.
    """
    if not client:
        return None

    # Construct the full prompt adding context
    prompt = f"<CONTEXT>\n{context_str}\n</CONTEXT>\n\nUser Message: {user_message}"

    contents = []
    
    # Add history
    if history:
        for msg in history:
            contents.append(
                types.Content(
                    role=msg["role"], 
                    parts=[types.Part.from_text(p["text"]) for p in msg["parts"]]
                )
            )
            
    # Add new prompt
    contents.append(
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)]
        )
    )

    
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=[get_tools_definition()],
        temperature=0.4
    )

    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=contents,
        config=config
    )
    return response

