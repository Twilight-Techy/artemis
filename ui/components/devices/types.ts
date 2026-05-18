/**
 * Frontend device model: backend `capabilities` + `state` flattened for UI,
 * with `controls` describing which widgets the device detail modal should show.
 */

import {
  mergeCapabilitySpecs,
  buildDeviceControls,
  applyStateToDeviceFields,
  type DeviceType,
  type DeviceControl,
} from './capabilities';

export type { DeviceType, DeviceControl, DeviceStateField } from './capabilities';
export { parseDeviceType } from './capabilities';

export interface Device {
  id: string;
  roomId: string;
  roomRawId: string;
  name: string;
  type: DeviceType;
  isOn: boolean;
  isOnline: boolean;
  /** Resolved control widgets for the detail modal (from type defaults ∩ device capabilities). */
  controls: DeviceControl[];

  intensity?: number;
  color?: string;
  colorTemp?: number;
  temperature?: number;
  speed?: number;
  volume?: number;
  position?: number;
  statusText?: string;
}

/**
 * Maps a raw backend device response + room name into a frontend Device.
 */
export function mapBackendDevice(raw: any, roomName: string): Device {
  const state = asRecord(raw.state);
  const type = raw.device_type as DeviceType;
  const merged = mergeCapabilitySpecs(type, raw.capabilities);
  const controls = buildDeviceControls(type, merged);

  const device: Device = {
    id: raw.id,
    roomId: roomName,
    roomRawId: raw.room_id,
    name: raw.name,
    type,
    isOn: state.is_on === true,
    isOnline: raw.is_online !== false,
    controls,
  };

  applyStateToDeviceFields(type, state, controls, device as unknown as Record<string, unknown>);
  return device;
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}
