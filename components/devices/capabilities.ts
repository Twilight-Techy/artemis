/** Mirrors backend `DeviceType` enum — kept here to avoid circular imports with `types.ts`. */
export type DeviceType =
  | 'light'
  | 'climate'
  | 'fan'
  | 'media'
  | 'sensor'
  | 'security'
  | 'switch'
  | 'other';

const ALL_DEVICE_TYPES: DeviceType[] = [
  'light',
  'climate',
  'fan',
  'media',
  'sensor',
  'security',
  'switch',
  'other',
];

export function parseDeviceType(value: string | undefined, fallback: DeviceType = 'switch'): DeviceType {
  if (value && (ALL_DEVICE_TYPES as string[]).includes(value)) return value as DeviceType;
  return fallback;
}

/** Keys on the flattened `Device` model that hold capability state. */
export type DeviceStateField = 'intensity' | 'color' | 'colorTemp' | 'temperature' | 'speed' | 'volume';

/** Declarative controls derived from device type + capabilities JSON (merged). */
export type DeviceControl =
  | {
      id: string;
      ui: 'slider';
      stateKey: string;
      label: string;
      min: number;
      max: number;
      field: DeviceStateField;
    }
  | {
      id: string;
      ui: 'steps';
      stateKey: string;
      label: string;
      stepCount: number;
      labels?: string[];
      field: DeviceStateField;
    }
  | {
      id: string;
      ui: 'color';
      stateKey: string;
      label: string;
      field: DeviceStateField;
    }
  | {
      id: string;
      ui: 'thermostat';
      stateKey: string;
      label: string;
      min: number;
      max: number;
      step: number;
      field: DeviceStateField;
    };

const DEFAULT_CAPS: Record<DeviceType, Record<string, unknown>> = {
  light: { power: true, brightness: { mode: 'percentage', min: 0, max: 100 } },
  fan: { power: true, speed: { mode: 'steps', count: 3 } },
  climate: { power: true, temperature: { min: 16, max: 30, step: 1 } },
  media: { power: true, volume: { mode: 'percentage', min: 0, max: 100 } },
  sensor: {},
  security: { power: true },
  switch: { power: true },
  other: { power: true },
};

function asRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

export function mergeCapabilitySpecs(deviceType: DeviceType, rawCaps: unknown): Record<string, unknown> {
  const base = { ...DEFAULT_CAPS[deviceType] };
  const raw = asRecord(rawCaps);
  const merged: Record<string, unknown> = { ...base, ...raw };
  if (typeof merged.speed_steps === 'number' && merged.speed == null) {
    merged.speed = { mode: 'steps', count: merged.speed_steps };
  }
  return merged;
}

function normalizeBrightness(spec: unknown): DeviceControl | null {
  if (spec === false) return null;
  if (spec === true) {
    return {
      id: 'brightness',
      ui: 'slider',
      stateKey: 'brightness',
      label: 'Brightness',
      min: 0,
      max: 100,
      field: 'intensity',
    };
  }
  if (typeof spec === 'object' && spec !== null) {
    const o = spec as Record<string, unknown>;
    const mode = o.mode as string | undefined;
    if (mode === 'steps') {
      const count = Math.max(2, Math.min(12, Number(o.count) || 3));
      const labels = Array.isArray(o.labels) ? (o.labels as string[]).slice(0, count) : undefined;
      return {
        id: 'brightness',
        ui: 'steps',
        stateKey: 'brightness',
        label: 'Brightness',
        stepCount: count,
        labels,
        field: 'intensity',
      };
    }
    const min = Number(o.min) || 0;
    const max = Number(o.max) || 100;
    return {
      id: 'brightness',
      ui: 'slider',
      stateKey: 'brightness',
      label: 'Brightness',
      min,
      max,
      field: 'intensity',
    };
  }
  return null;
}

function normalizeColorTemp(spec: unknown): DeviceControl | null {
  if (!spec || spec === false) return null;
  if (spec === true) {
    return {
      id: 'color_temp',
      ui: 'slider',
      stateKey: 'color_temp',
      label: 'White tone',
      min: 2700,
      max: 6500,
      field: 'colorTemp',
    };
  }
  if (typeof spec === 'object' && spec !== null) {
    const o = spec as Record<string, unknown>;
    const min = Number(o.min) || 2700;
    const max = Number(o.max) || 6500;
    return {
      id: 'color_temp',
      ui: 'slider',
      stateKey: 'color_temp',
      label: 'White tone',
      min,
      max,
      field: 'colorTemp',
    };
  }
  return null;
}

function normalizeSpeed(spec: unknown): DeviceControl | null {
  if (spec === false) return null;
  if (spec === true) {
    return {
      id: 'speed',
      ui: 'steps',
      stateKey: 'speed',
      label: 'Fan speed',
      stepCount: 3,
      field: 'speed',
    };
  }
  if (typeof spec === 'number' && spec >= 2) {
    return {
      id: 'speed',
      ui: 'steps',
      stateKey: 'speed',
      label: 'Fan speed',
      stepCount: spec,
      field: 'speed',
    };
  }
  if (typeof spec === 'object' && spec !== null) {
    const o = spec as Record<string, unknown>;
    if (o.mode === 'percentage') {
      const min = Number(o.min) || 0;
      const max = Number(o.max) || 100;
      return {
        id: 'speed',
        ui: 'slider',
        stateKey: 'speed',
        label: 'Fan speed',
        min,
        max,
        field: 'speed',
      };
    }
    if (o.mode === 'steps') {
      const count = Math.max(2, Math.min(12, Number(o.count) || 3));
      const labels = Array.isArray(o.labels) ? (o.labels as string[]).slice(0, count) : undefined;
      return {
        id: 'speed',
        ui: 'steps',
        stateKey: 'speed',
        label: 'Fan speed',
        stepCount: count,
        labels,
        field: 'speed',
      };
    }
  }
  return null;
}

function normalizeVolume(spec: unknown): DeviceControl | null {
  if (!spec || spec === false) return null;
  if (spec === true) {
    return {
      id: 'volume',
      ui: 'slider',
      stateKey: 'volume',
      label: 'Volume',
      min: 0,
      max: 100,
      field: 'volume',
    };
  }
  if (typeof spec === 'object' && spec !== null) {
    const o = spec as Record<string, unknown>;
    const min = Number(o.min) || 0;
    const max = Number(o.max) || 100;
    return {
      id: 'volume',
      ui: 'slider',
      stateKey: 'volume',
      label: 'Volume',
      min,
      max,
      field: 'volume',
    };
  }
  return null;
}

function normalizeTemperature(spec: unknown): DeviceControl | null {
  if (!spec || spec === false) return null;
  if (spec === true) {
    return {
      id: 'temperature',
      ui: 'thermostat',
      stateKey: 'temperature',
      label: 'Temperature target',
      min: 16,
      max: 30,
      step: 1,
      field: 'temperature',
    };
  }
  if (typeof spec === 'object' && spec !== null) {
    const o = spec as Record<string, unknown>;
    const min = Number(o.min) || 16;
    const max = Number(o.max) || 30;
    const step = Number(o.step) || 1;
    return {
      id: 'temperature',
      ui: 'thermostat',
      stateKey: 'temperature',
      label: 'Temperature target',
      min,
      max,
      step,
      field: 'temperature',
    };
  }
  return null;
}

/**
 * Ordered controls for the device detail modal (power is handled separately).
 */
export function buildDeviceControls(deviceType: DeviceType, mergedCaps: Record<string, unknown>): DeviceControl[] {
  const out: DeviceControl[] = [];

  if (deviceType === 'light') {
    const b = normalizeBrightness(mergedCaps.brightness);
    if (b) out.push(b);
    const ct = normalizeColorTemp(mergedCaps.color_temp);
    if (ct) out.push(ct);
    if (mergedCaps.rgb_color === true) {
      out.push({ id: 'color', ui: 'color', stateKey: 'color', label: 'Color', field: 'color' });
    }
  }

  if (deviceType === 'climate') {
    const t = normalizeTemperature(mergedCaps.temperature);
    if (t) out.push(t);
  }

  if (deviceType === 'fan') {
    const s = normalizeSpeed(mergedCaps.speed);
    if (s) out.push(s);
  }

  if (deviceType === 'media') {
    const v = normalizeVolume(mergedCaps.volume);
    if (v) out.push(v);
  }

  return out;
}

/** Full capability spec to persist for a device type (type defaults only). */
export function persistedCapabilitiesForDeviceType(deviceType: DeviceType): Record<string, unknown> {
  return mergeCapabilitySpecs(deviceType, {});
}

/**
 * Initial `state` JSON for a new device (matches keys expected by `mapBackendDevice` / command handler).
 */
export function defaultDeviceStateForDeviceType(deviceType: DeviceType): Record<string, unknown> {
  const merged = mergeCapabilitySpecs(deviceType, {});
  const controls = buildDeviceControls(deviceType, merged);
  const state: Record<string, unknown> = { is_on: false };

  for (const c of controls) {
    if (c.ui === 'slider') {
      if (c.stateKey === 'brightness') state[c.stateKey] = c.max;
      else if (c.stateKey === 'color_temp') state[c.stateKey] = 4000;
      else if (c.stateKey === 'speed') state[c.stateKey] = c.min;
      else state[c.stateKey] = Math.round((c.min + c.max) / 2);
    } else if (c.ui === 'steps') {
      state[c.stateKey] = 1;
    } else if (c.ui === 'color') {
      state[c.stateKey] = '#FFFFFF';
    } else if (c.ui === 'thermostat') {
      state[c.stateKey] = 22;
    }
  }

  if (deviceType === 'sensor') {
    state.is_on = true;
    state.reading = 0;
    state.unit = '°C';
  }
  if (deviceType === 'security') {
    state.is_on = true;
    state.armed = false;
  }

  return state;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Populate flattened Device fields from `state` using resolved controls. */
export function applyStateToDeviceFields(
  deviceType: DeviceType,
  state: Record<string, unknown>,
  controls: DeviceControl[],
  target: Record<string, unknown>,
): void {
  for (const c of controls) {
    if (c.ui === 'slider') {
      const raw = state[c.stateKey];
      const num = typeof raw === 'number' ? raw : Number(raw);
      let fallback = (c.min + c.max) / 2;
      if (c.stateKey === 'brightness') fallback = c.max;
      if (c.stateKey === 'color_temp') fallback = 4000;
      const v = Number.isFinite(num) ? num : fallback;
      (target as any)[c.field] = clamp(v, c.min, c.max);
    } else if (c.ui === 'steps') {
      const raw = state[c.stateKey];
      let step = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(step)) step = 1;
      (target as any)[c.field] = clamp(Math.round(step), 1, c.stepCount);
    } else if (c.ui === 'color') {
      const col = state[c.stateKey];
      (target as any)[c.field] = typeof col === 'string' ? col : '#FFFFFF';
    } else if (c.ui === 'thermostat') {
      const raw = state[c.stateKey] ?? state.target_temp;
      let t = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(t)) t = 22;
      (target as any)[c.field] = clamp(Math.round(t / c.step) * c.step, c.min, c.max);
    }
  }

  if (deviceType === 'sensor') {
    if (state.reading !== undefined && state.unit) {
      target.statusText = `${state.reading}${state.unit}`;
    } else {
      target.statusText = typeof state.status === 'string' ? state.status : 'Active';
    }
  }

  if (deviceType === 'security') {
    target.statusText = state.armed ? 'Armed' : 'Disarmed';
  }

  if (deviceType === 'switch' || deviceType === 'other') {
    target.statusText = state.is_on ? 'On' : 'Off';
  }
}

/** Maps UI field updates to backend state keys for /command payload. */
export function devicePartialToStatePayload(updates: {
  intensity?: number;
  color?: string;
  colorTemp?: number;
  temperature?: number;
  speed?: number;
  volume?: number;
}): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (updates.intensity !== undefined) payload.brightness = updates.intensity;
  if (updates.color !== undefined) payload.color = updates.color;
  if (updates.colorTemp !== undefined) payload.color_temp = updates.colorTemp;
  if (updates.temperature !== undefined) payload.temperature = updates.temperature;
  if (updates.speed !== undefined) payload.speed = updates.speed;
  if (updates.volume !== undefined) payload.volume = updates.volume;
  return payload;
}

/** Progress 0–100 for list cards (lights / fans). */
export function getDeviceLevelBarPercent(device: {
  isOn: boolean;
  type: DeviceType;
  intensity?: number;
  speed?: number;
  controls: DeviceControl[];
}): number | null {
  if (!device.isOn) return null;
  if (device.type === 'light' && device.intensity !== undefined) {
    const c = device.controls.find((x) => x.id === 'brightness');
    if (c?.ui === 'steps') return (device.intensity / c.stepCount) * 100;
    if (c?.ui === 'slider') return ((device.intensity - c.min) / (c.max - c.min)) * 100;
    return device.intensity;
  }
  if (device.type === 'fan' && device.speed !== undefined) {
    const c = device.controls.find((x) => x.id === 'speed');
    if (c?.ui === 'steps') return (device.speed / c.stepCount) * 100;
    if (c?.ui === 'slider') return ((device.speed - c.min) / (c.max - c.min)) * 100;
    return device.speed;
  }
  return null;
}
