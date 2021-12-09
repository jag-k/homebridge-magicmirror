import {AccessoryConfig} from 'homebridge';

export const ACCESSORY_NAME = 'MagicMirror';

export interface Config extends AccessoryConfig {
  name: string;
  remoteURL: string;
  apiKey?: string;
  useRealMonitorDisabling?: boolean;
  monitorSwitcher?: boolean;
  moduleList: string[];
  model?: string;
  manufacturer?: string;
  enableModulesSwitcher?: boolean;
}

export interface MMMConfig {
  index: number;
  identifier: string;
  name: string;
  path: string;
  file: string;
  hiddenOnStartup?: boolean;
  disabled?: boolean;
  position?:
    'top_bar' | 'bottom_bar' |
    'top_left' | 'top_center' | 'top_right' |
    'upper_third' | 'middle_center' | 'lower_third' |
    'bottom_left' | 'bottom_center' | 'bottom_right' |
    'fullscreen_above' | 'fullscreen_below';
  header?: string;
  configDeepMerge: boolean;
  config: {
    [key: string]: unknown;
  };
  classes?: string;
  hidden: boolean;
  lockStrings: string[];
  actions?: {
    [key: string]: unknown;
  };
}

export interface MMRemoteResponse<T = unknown> {
  success: boolean;
  data?: T;

  [key: string]: unknown;
}
