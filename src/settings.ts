import {AccessoryConfig} from 'homebridge';

export const ACCESSORY_NAME = 'MagicMirror';

export interface Config extends AccessoryConfig {
  name: string;
  remoteURL: string;
  apiKey?: string;
  useRealMonitorDisabling?: boolean;
  monitorSwitcher?: boolean;
  model?: string;
  manufacturer?: string;
}

