export type DeviceType = 'light' | 'climate' | 'appliance' | 'media' | 'shade' | 'sensor';

export interface Device {
  id: string;
  roomId: string;
  name: string;
  type: DeviceType;
  isOn: boolean;
  // Specific device attributes
  intensity?: number;      // 0-100 for lights
  color?: string;          // hex for led strips
  temperature?: number;    // target temp for climate
  volume?: number;         // 0-100 for media
  position?: number;       // 0-100 for shades
  statusText?: string;     // Text for appliances, e.g. "Storage 40%"
}
