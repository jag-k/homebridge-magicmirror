import {Axios} from 'axios';
import {CharacteristicGetCallback, CharacteristicSetCallback, CharacteristicValue, Logging} from 'homebridge';
import {Config} from './settings';

type StringFunction<T> = string | ((value: T) => string);

export class BaseActions {
  readonly request: Axios;
  readonly config: Config;
  readonly log: Logging;

  constructor(config: Config, log: Logging) {
    this.config = config;
    this.log = log;
    const {remoteURL} = config;
    const baseURL = remoteURL.endsWith('/') ? remoteURL : remoteURL + '/';
    this.request = new Axios({
      baseURL,
    });

    if (config.apiKey) {
      this.request.defaults.headers['Authorization'] = `apiKey ${config.apiKey}`;
    }
  }

  catch(callback: CharacteristicGetCallback | CharacteristicSetCallback) {
    return (error: Error) => {
      this.log.error(`${error.name}: ${error.message}`);
      callback(error);
    };
  }


  getter(url: string, converter: (data) => CharacteristicValue, log?: string) {
    return (callback: CharacteristicGetCallback, id?: string): void => {
      const processID = id ? `[${id}] ` : '';
      const state = (value: CharacteristicValue) => {
        if (log) {
          this.log.info(`${processID}${log} ${value}`);
        }
        callback(undefined, value);
      };

      if (url.startsWith('/')) {
        url = url.slice(1);
      }

      this.request.get(url)
        .then(
          ({data, status}) => {
            data = typeof data === 'string' ? JSON.parse(data) : data;
            this.log.debug(`${processID}[Getter] Data from '${this.request.defaults.baseURL}${url}' (${status}): ${JSON.stringify(data)}`);
            state(converter(data));
          })
        .catch(this.catch(callback));
    };
  }

  setter<T, L = T>(
    url: StringFunction<T | L>,
    valueConverter?: (value: T) => L,
    log?: StringFunction<T | L>,
  ) {
    return (value: T | L, callback: CharacteristicSetCallback, id?: string) => {
      const processID = id ? `[${id}] ` : '';
      this.log.debug(processID + `[Setter] Input value: ${value}`);
      if (valueConverter) {
        value = valueConverter(value as T);
      }
      let requestUrl = typeof url === 'string' ? `${url}/${value}` : url(value);

      if (requestUrl.startsWith('/')) {
        requestUrl = requestUrl.slice(1);
      }

      this.request.get(requestUrl)
        .then(({data, status}) => {
          data = typeof data === 'string' ? JSON.parse(data) : data;
          this.log.debug(
            `${processID}[Setter] Data from '${this.request.defaults.baseURL}${requestUrl}' (${status}): ${JSON.stringify(data)}`,
          );
          if (log) {
            this.log.info(processID + (typeof log === 'string' ? `${log} ${value}` : log(value)));
          }
          callback(undefined);
        })
        .catch(this.catch(callback));
    };
  }
}


export function brightnessConvertFromHomeKit(value: number): number {
  return Math.round(1.9 * value + 10);
}

export function brightnessConvertToHomeKit(value: number): number {
  return Math.round((value - 10) / 1.9);
}

