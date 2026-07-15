import asyncio
import aiomqtt
import json
import os
import ssl
import sys
from dotenv import load_dotenv

load_dotenv()

if os.name == 'nt':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

async def main():
    if len(sys.argv) < 2:
        print("Usage: python send_bulb.py <on|off>")
        sys.exit(1)
        
    state = sys.argv[1].lower()
    if state not in ['on', 'off']:
        print("Error: state must be either 'on' or 'off'")
        sys.exit(1)

    broker = os.getenv("MQTT_BROKER")
    port = int(os.getenv("MQTT_PORT", 8883))
    user = os.getenv("MQTT_USER")
    password = os.getenv("MQTT_PASS")

    tls_context = ssl.create_default_context()

    print(f"Connecting to {broker}:{port} as {user}...")

    try:
        async with aiomqtt.Client(
            hostname=broker,
            port=port,
            username=user,
            password=password,
            tls_context=tls_context
        ) as client:
            topic = "room/command"
            # Payload expects a boolean for bulb1
            bulb_state = True if state == 'on' else False
            payload = json.dumps({"bulb1": bulb_state})
            print(f"Publishing to {topic}: {payload}")
            await client.publish(topic, payload)
            print("Success!")
    except Exception as e:
        print(f"Failed to publish MQTT message: {e}")

if __name__ == "__main__":
    asyncio.run(main())
