"""
MQTT Listener Service
─────────────────────
Background daemon that maintains a persistent connection to HiveMQ
and listens for incoming telemetry from the Home_Automation firmware.
"""

import asyncio
import json
import aiomqtt
from app.config import get_settings
from app.database import AsyncSessionLocal
from app.services import sensor_service
from app.models import User
from sqlalchemy import select

settings = get_settings()

async def run_mqtt_listener():
    """
    Background task to listen to room/telemetry and other inbound MQTT messages.
    """
    if not settings.mqtt_broker:
        print("MQTT Broker not configured. Skipping persistent listener.")
        return

    print(f"Starting persistent MQTT listener for broker: {settings.mqtt_broker}")
    
    tls_params = aiomqtt.TLSParameters() if settings.mqtt_port in (8883, 8884) else None
    
    while True:
        try:
            async with aiomqtt.Client(
                hostname=settings.mqtt_broker,
                port=settings.mqtt_port,
                username=settings.mqtt_user or None,
                password=settings.mqtt_pass or None,
                tls_params=tls_params,
                identifier="artemis-backend-listener"
            ) as client:
                await client.subscribe("room/telemetry")
                print("MQTT listener subscribed to room/telemetry")
                
                async for message in client.messages:
                    if message.topic.matches("room/telemetry"):
                        try:
                            payload = json.loads(message.payload.decode())
                            # Map firmware keys to backend keys
                            mapped_data = {}
                            if "temp" in payload:
                                mapped_data["temperature"] = payload["temp"]
                            if "hum" in payload:
                                mapped_data["humidity"] = payload["hum"]
                            if "pres" in payload:
                                mapped_data["motion"] = payload["pres"]
                                
                            if mapped_data:
                                async with AsyncSessionLocal() as db:
                                    # We need an owner_id for the automations
                                    user_query = await db.execute(select(User).limit(1))
                                    admin_user = user_query.scalar_one_or_none()
                                    if admin_user:
                                        await sensor_service.process_and_store_readings(db, admin_user.id, mapped_data)
                                        
                        except json.JSONDecodeError:
                            print("Received invalid JSON on room/telemetry")
                        except Exception as e:
                            print(f"Error processing telemetry: {e}")
                            
        except aiomqtt.MqttError as e:
            print(f"MQTT Listener disconnected: {e}. Reconnecting in 5 seconds...")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"MQTT Listener fatal error: {e}")
            await asyncio.sleep(5)
