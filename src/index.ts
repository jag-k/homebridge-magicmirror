import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  CharacteristicEventTypes,
  CharacteristicGetCallback,
  CharacteristicSetCallback,
  CharacteristicValue,
  HAP,
  Logging,
  Service,
} from 'homebridge';
import {ACCESSORY_NAME, Config, MMMConfig, MMRemoteResponse} from './settings';
import {author} from '../package.json';
import {any, BaseActions, brightnessConvertFromHomeKit, brightnessConvertToHomeKit, mmmName} from './helpers';

let hap: HAP;

export = (api: API) => {
  hap = api.hap;
  api.registerAccessory(ACCESSORY_NAME, MagicMirror);
};

class Actions extends BaseActions {
  getMonitorStatus = this.getter(
    '/api/monitor',
    data => data.monitor === 'on',
    'Current monitor state:',
  );

  setMonitorStatus = this.setter<boolean, string>(
    '/api/monitor',
    value => value ? 'on' : 'off',
    'Monitor state was set to',
  );

  getBrightness = this.getter(
    '/api/brightness',
    data => brightnessConvertToHomeKit(data.result as number),
    'Current brightness:',
  );

  getBrightnessBoolean = this.getter(
    '/api/brightness',
    data => brightnessConvertToHomeKit(data.result as number) > 0,
    'Current brightness (boolean):',
  );

  setBrightness = this.setter<number, number>(
    '/api/brightness',
    (value) => brightnessConvertFromHomeKit(value),
    (value) => `Brightness set to ${value} (${brightnessConvertToHomeKit(value)}%)`,
  );

  getMMMState = (name: string) => this.getter<MMRemoteResponse<MMMConfig[]>>(
    `/api/module/${name}`,
    (data) => !any((data.data as MMMConfig[]).map(m => m.hidden)),
    `Current showing state of '${name}':`,
  );

  setMMMState = (name: string) => this.setter<boolean, string>(
    `/api/module/${name}`,
    (value) => value ? 'show' : 'hide',
    `'${name}' state was set to`,
  );
}

class MagicMirror implements AccessoryPlugin {
  private readonly log: Logging;
  private readonly name: string;
  private readonly config: Config;
  private readonly actions: Actions;
  private readonly services: Service[];

  private brightness = 0;

  constructor(log: Logging, config: AccessoryConfig) {
    this.log = log;
    this.name = config.name;
    this.config = config as Config;
    this.actions = new Actions(this.config, this.log);
    this.services = [];

    const mmService = new hap.Service.Lightbulb(this.name);
    mmService
      .getCharacteristic(hap.Characteristic.On)
      .on(CharacteristicEventTypes.GET, this.onGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.onSet.bind(this));

    mmService
      .getCharacteristic(hap.Characteristic.Brightness)
      .on(CharacteristicEventTypes.GET, this.brightnessGet.bind(this))
      .on(CharacteristicEventTypes.SET, this.brightnessSet.bind(this));

    this.services.push(mmService);

    if (this.config.monitorSwitcher) {
      const mmMonitor = new hap.Service.Switch(this.name + ' monitor');
      mmMonitor
        .getCharacteristic(hap.Characteristic.On)
        .on(CharacteristicEventTypes.GET, this.getMonitor.bind(this))
        .on(CharacteristicEventTypes.SET, this.setMonitor.bind(this));

      this.services.push(mmMonitor);
    }

    for (const name of this.config.moduleList) {
      const displayName = mmmName(name);
      const mmmSwitcher = new hap.Service.Switch(displayName, name);
      mmmSwitcher
        .getCharacteristic(hap.Characteristic.On)
        .on(CharacteristicEventTypes.GET, this.getMMMState(name).bind(this))
        .on(CharacteristicEventTypes.SET, this.setMMMState(name).bind(this));
      this.services.push(mmmSwitcher);
      this.log(`Added ${this.services.length} '${displayName}' (${name}: ${mmmSwitcher.UUID}) module control`);
    }

    const informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, this.config.manufacturer || author.name)
      .setCharacteristic(hap.Characteristic.Model, this.config.model || 'MagicMirror');

    this.services.push(informationService);
    log.info('MagicMirror finished initializing!');
  }

  identify(): void {
    this.log('Identify!');
    this.log.warn(JSON.stringify(this.config));
  }

  getServices(): Service[] {
    this.log.warn(`Services count: ${this.services.length}`);
    return this.services;
  }

  onGet(callback: CharacteristicGetCallback): void {
    if (this.config.useRealMonitorDisabling) {
      this.actions.getMonitorStatus(callback, 'Monitor');
    } else {
      this.actions.getBrightnessBoolean(callback, 'Brightness');
    }
  }


  onSet(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    if (this.config.useRealMonitorDisabling) {
      this.actions.setMonitorStatus(value as boolean, callback, 'Monitor');
    } else {
      this.actions.setBrightness(value ? (this.brightness || 100) : 0, callback, 'Brightness');
    }
  }

  getMonitor(callback: CharacteristicGetCallback): void {
    this.actions.getMonitorStatus(callback, 'getMonitor');
  }

  setMonitor(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    this.actions.setMonitorStatus(value as boolean, callback, 'setMonitor');
  }

  brightnessGet(callback: CharacteristicGetCallback): void {
    const cb: CharacteristicGetCallback = (status, value) => {
      if (!status) {
        this.brightness = value as number;
      }
      return callback(status, value);
    };
    this.actions.getBrightness(cb, 'brightnessGet');
  }

  brightnessSet(value: CharacteristicValue, callback: CharacteristicSetCallback): void {
    this.brightness = value as number;
    this.actions.setBrightness(value as number, callback, 'brightnessSet');
  }


  getMMMState = (name: string) =>
    (callback: CharacteristicSetCallback): void =>
      this.actions.getMMMState(name)(callback, name);

  setMMMState = (name: string) =>
    (value: CharacteristicValue, callback: CharacteristicSetCallback): void =>
      this.actions.setMMMState(name)(value as boolean, callback, name);

}
