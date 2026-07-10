"""
Gemini MCP Core
───────────────
Handles the interaction with the Gemini API, tool definition, and orchestration.
"""
from google import genai
from google.genai import types
from google.genai import errors as genai_errors
from app.config import get_settings
import asyncio
import logging

logger = logging.getLogger(__name__)


class GeminiQuotaError(Exception):
    """Raised when the Gemini API returns a 429 Resource Exhausted error."""
    pass


class GeminiServiceError(Exception):
    """Raised for general, non-quota Gemini API errors."""
    pass

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
4. REASONING RULE: Whenever you decide to call a tool, you must do TWO things:
   First, write ONE short, casual question in plain English asking the user if they'd like you to go ahead. Phrase it as a direct question, not an explanation. Mention the device and room if relevant. No markdown, no bullet points.
   Examples: "Want me to switch off the Studio fan?", "Should I dim the Bedroom lights to 40%?"
   Second, you MUST populate the tool's `reasoning_trace` parameter with a continuous list detailing your observations and logical deductions. 
   Example of reasoning_trace:
   "• I observed the temperature is 28°C in the Studio.
   • The threshold for cooling is set to 26°C.
   • Therefore, I suggest turning on the fan."

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
                        ),
                        "reasoning_trace": types.Schema(
                            type=types.Type.STRING,
                            description="A short continuous list detailing your observations and logical deductions that led to suggesting this action."
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
                        ),
                        "reasoning_trace": types.Schema(
                            type=types.Type.STRING,
                            description="A short continuous list detailing your observations and logical deductions that led to suggesting this action."
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
                    parts=[types.Part.from_text(text=p["text"]) for p in msg["parts"]]
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

    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.gemini_model,
            contents=contents,
            config=config
        )
        return response
    except genai_errors.ClientError as e:
        status_code = getattr(e, "status_code", None) or getattr(e, "code", None)
        if status_code == 429:
            logger.warning("Gemini API quota exhausted (429): %s", e)
            raise GeminiQuotaError("Gemini API free-tier quota exhausted. Please try again later.") from e
        logger.error("Gemini ClientError (%s): %s", status_code, e)
        raise GeminiServiceError(f"Gemini API error ({status_code}): {e}") from e
    except Exception as e:
        logger.exception("Unexpected error calling Gemini API")
        raise GeminiServiceError(f"Unexpected Gemini error: {e}") from e


async def summarise_tool_result(
    user_message: str,
    tool_name: str,
    tool_args: dict,
    tool_result: dict,
    succeeded: bool,
    history: list[dict] = None,
) -> str:
    """
    Completes the Gemini agentic loop after a tool has been executed.

    Sends the three-turn conversation:
        user  -> original request
        model -> function_call (what Gemini decided to do)
        tool  -> function_response (what actually happened)

    Gemini then writes the natural-language reply that Artemis speaks back to the
    user, confirming (or explaining the failure of) the action.

    Falls back to a simple canned string if the call fails.
    """
    if not client:
        return "Done!" if succeeded else "Something went wrong — please try again."

    contents = []
    
    if history:
        for msg in history:
            contents.append(
                types.Content(
                    role=msg["role"], 
                    parts=[types.Part.from_text(text=p["text"]) for p in msg["parts"]]
                )
            )

    # Turn 1: user
    contents.append(types.Content(
        role="user",
        parts=[types.Part.from_text(text=user_message)]
    ))

    # Turn 2: model's original function call decision
    contents.append(types.Content(
        role="model",
        parts=[types.Part.from_function_call(name=tool_name, args=tool_args)]
    ))

    # Turn 3: the actual tool result fed back in
    contents.append(types.Content(
        role="user", # Function responses must come from user/tool role
        parts=[
            types.Part.from_function_response(
                name=tool_name,
                response={"result": tool_result, "success": succeeded}
            )
        ]
    ))

    SUMMARY_SYSTEM_PROMPT = """
You are Artemis, an AI-powered smart home virtual assistant.
The user requested an action, you decided to use a tool, and the tool has now successfully executed (or failed).
Your job is to provide a very short, friendly, and conversational confirmation to the user that the action was completed.
Do not explain how you did it. Do not ask any questions. Just confirm the execution in a natural way.
Examples: "All set! The lights are off.", "I've turned on the studio fan for you."
"""

    config = types.GenerateContentConfig(
        system_instruction=SUMMARY_SYSTEM_PROMPT,
        temperature=0.5
    )

    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.gemini_model,
            contents=contents,
            config=config
        )
        return response.text.strip() if response.text else ("Done!" if succeeded else "That didn't work — let me know if you'd like to try again.")
    except Exception:
        logger.warning("summarise_tool_result fallback triggered", exc_info=True)
        return "Done!" if succeeded else "Something went wrong — please try again."


async def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/mp4") -> str | None:
    """
    Transcribes audio bytes using Gemini 2.5 Flash.
    """
    if not client:
        return None

    prompt = "Transcribe the speech in this audio exactly. Do not add any extra text, markdown, or conversational formatting. If you hear silence, return an empty string."
    
    try:
        response = await asyncio.to_thread(
            client.models.generate_content,
            model=settings.gemini_model,
            contents=[
                prompt,
                types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
            ]
        )
        return response.text.strip() if response.text else None
    except genai_errors.ClientError as e:
        status_code = getattr(e, "status_code", None) or getattr(e, "code", None)
        if status_code == 429:
            logger.warning("Gemini API quota exhausted during transcription (429): %s", e)
            raise GeminiQuotaError("Gemini API free-tier quota exhausted.") from e
        logger.error("Gemini transcription ClientError (%s): %s", status_code, e)
        raise GeminiServiceError(f"Gemini transcription error ({status_code}): {e}") from e
    except Exception as e:
        logger.exception("Unexpected error during Gemini transcription")
        raise GeminiServiceError(f"Unexpected Gemini error: {e}") from e

