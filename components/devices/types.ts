/**
 * Frontend device types – mirrors backend DeviceType enum.
 * Each backend device has `capabilities` (what the device supports)
 * and `state` (current values).  The frontend flattens those into
 * a single `Device` object so the UI can render controls directly.
 */

export type DeviceType =
  | 'light'
  | 'climate'
  | 'fan'
  | 'media'
  | 'sensor'
  | 'security'
  | 'switch'
  | 'other';

export interface Device {
  id: string;
  roomId: string;      // Room name (resolved from room_id)
  roomRawId: string;   // Raw room UUID for API calls
  name: string;
  type: DeviceType;
  isOn: boolean;
  isOnline: boolean;

  // ── Capability-driven attributes ──
  intensity?: number;      // 0-100 brightness for lights
  color?: string;          // hex for RGB lights / LED strips
  colorTemp?: number;      // Kelvin for white-temp lights
  temperature?: number;    // target temp for climate
  speed?: number;          // 1-3 for fans
  speedSteps?: number;     // max speed steps (from capabilities)
  volume?: number;         // 0-100 for media
  position?: number;       // 0-100 for shades
  statusText?: string;     // freeform status (appliances, sensors)
}

/**
 * Maps a raw backend device response + room name into a frontend Device.
 */
export function mapBackendDevice(raw: any, roomName: string): Device {
  const state = raw.state || {};
  const caps  = raw.capabilities || {};
  const type  = raw.device_type as DeviceType;

  const device: Device = {
    id: raw.id,
    roomId: roomName,
    roomRawId: raw.room_id,
    name: raw.name,
    type,
    isOn: state.is_on ?? false,
    isOnline: raw.is_online ?? true,
  };

  // Populate type-specific fields from state + capabilities
  if (type === 'light') {
    if (caps.brightness)  device.intensity  = state.brightness ?? 100;
    if (caps.rgb_color)   device.color      = state.color ?? '#FFFFFF';
    if (caps.color_temp)  device.colorTemp  = state.color_temp ?? 4000;
  }

  if (type === 'climate') {
    device.temperature = state.temperature ?? state.target_temp ?? 22;
  }

  if (type === 'fan') {
    device.speed      = state.speed ?? 1;
    device.speedSteps = caps.speed_steps ?? 3;
  }

  if (type === 'media') {
    device.volume = state.volume ?? 50;
  }

  if (type === 'sensor') {
    // Build a human-readable status from latest reading
    if (state.reading !== undefined && state.unit) {
      device.statusText = `${state.reading}${state.unit}`;
    } else {
      device.statusText = state.status ?? 'Active';
    }
  }

  if (type === 'security') {
    device.statusText = state.armed ? 'Armed' : 'Disarmed';
  }

  if (type === 'switch' || type === 'other') {
    device.statusText = state.is_on ? 'On' : 'Off';
  }

  return device;
}
