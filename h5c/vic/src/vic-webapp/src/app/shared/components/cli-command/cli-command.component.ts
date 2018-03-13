import {Component, Input, OnInit} from '@angular/core';
import {Observable} from 'rxjs/Observable';
import {getClientOS} from '../../utils/detection';
import {FormBuilder, FormGroup} from '@angular/forms';
import {camelCasePattern} from '../../utils';
import {isUploadableFileObject} from '../../utils/model-checker';

type CommandType = 'create' | 'configure';

@Component({
  selector: 'vic-cli-command',
  templateUrl: './cli-command.component.html',
  styleUrls: ['./cli-command.component.scss']
})
export class CliCommandComponent implements OnInit {

  @Input()
  payload: Observable<any>;

  @Input()
  showCliCommand = true;

  @Input()
  commandType: CommandType;

  @Input()
  disabled = false;

  public form: FormGroup;
  public copySucceeded: boolean = null;
  public cliCommand: Observable<string>;
  private skippedParams = [
    'computeResource'
  ];

  constructor(private formBuilder: FormBuilder) {
    this.form = this.formBuilder.group({targetOS: null, cliCommand: null});
  }

  ngOnInit() {
    const targetOSStream: Observable<string> = this.form.get('targetOS')
      .valueChanges
      .distinctUntilChanged()
      .startWith(getClientOS());

    const modelPayload: Observable<any> = this.payload;

    this.cliCommand = Observable.combineLatest(
        targetOSStream,
        modelPayload
      )
      .map(([targetOS, payload]) =>  {
        const cliCommand = this.toCliArguments(targetOS, payload);
        this.form.patchValue({targetOS: targetOS, cliCommand: cliCommand});
        return cliCommand;
      });
  }

  /**
   * Document copy event handler
   */
  copyCliCommand(): void {
    try {
      document.addEventListener('copy', this.copyCliCommandToClipboard.bind(this));
      this.copySucceeded = document.execCommand('copy');
      Observable.timer(1500)
        .subscribe(() => {
          this.copySucceeded = null;
        });
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * Sets the clipboard data with the cliCommand form value
   */
  copyCliCommandToClipboard(event: ClipboardEvent) {
    event.clipboardData.setData('text/plain', this.form.get('cliCommand').value);
    event.preventDefault();
    document.removeEventListener('copy', this.copyCliCommandToClipboard);
  }

  /**
   * Convert camelcase keys into dash-separated ones, remove fields with
   * an empty array, and then return the array joined
   * @returns {string} vic-machine compatible arguments
   */
  toCliArguments(targetOS: string, payloadModel: any): string {
    if (!targetOS || !payloadModel || !this.commandType) {
      return null;
    }

    const payload = this.processPayload(payloadModel);
    const results = [];

    let vicMachineBinary = `vic-machine-${targetOS}`;
    const createCommand = this.commandType;
    if (targetOS !== 'windows') {
      vicMachineBinary = `./${vicMachineBinary}`;
    }
    results.push(vicMachineBinary);
    results.push(createCommand);

    for (const section in payload) {
      if (!payload[section]) {
        continue;
      }
      // if there is only one entry in the section and it's of string type
      // add it to results array here
      let val = payload[section];
      if (typeof val === 'string' || typeof val === 'boolean' || typeof val === 'number') {
        if (typeof val === 'string') {
          val = this.escapeSpecialCharsForCLI(val);
          if (!val.trim()) {
            continue;
          }
        }
        results.push(`--${section} ${this.valueToString(val)}`);
        continue;
      }
      for (const key in payload[section]) {
        if (!(payload[section][key]) || payload[section][key] === '0') {
          continue;
        }
        const newKey = key.replace(camelCasePattern, '$1-$2').toLowerCase();
        let value = payload[section][key];
        if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
          if (typeof value === 'string') {
            value = this.escapeSpecialCharsForCLI(value);
            if (!value.trim()) {
              continue;
            }
          }
          results.push(`--${newKey} ${this.valueToString(value)}`);

        } else {
          // repeat adding multiple, optional fields with the same key
          for (const i in value) {
            if (!value[i] || value[i] === '0') {
              continue;
            }

            const rawValue = value[i];
            if (typeof rawValue === 'string') {
              if (!rawValue.trim()) {
                continue;
              }
              results.push(`--${newKey} ${rawValue}`);

            } else if (typeof rawValue === 'object') {
              if (isUploadableFileObject(rawValue)) {
                results.push(`--${newKey} ${rawValue.name}`);
              } else {
                for (const j in rawValue) {
                  if (!rawValue[j] || rawValue[j] === '0') {
                    continue;
                  }
                  results.push(`--${j.replace(camelCasePattern, '$1-$2').toLowerCase()} ${this.escapeSpecialCharsForCLI(rawValue[j])}`);
                }
              }
            }
          }
        }
      }
    }
    return results.join(' ');
  }

  private valueToString(value: any): string {
    if (typeof value === 'string') {
      return value;
    } else if (typeof value === 'boolean') {
          return '';
    } else if (typeof value === 'number') {
      return value.toString();
    }
  }

  private escapeSpecialCharsForCLI(text) {
    return text.replace(/([() ])/g, '\\$&');
  }

  /**
   * Transform payload to something vic-machine command friendly
   */
  private processPayload(payload: any): any {
    const results = JSON.parse(JSON.stringify(payload));

    // transform image store entry
    if (results['storageCapacity']) {
      results['storageCapacity']['imageStore'] =
        results['storageCapacity']['imageStore'] + (results['storageCapacity']['fileFolder'] || '');
      delete results['storageCapacity']['fileFolder'];

      results['storageCapacity']['baseImageSize'] = results['storageCapacity']['baseImageSize']
        + results['storageCapacity']['baseImageSizeUnit'].replace('i', '');
      delete results['storageCapacity']['baseImageSizeUnit'];

      // transform each volume store entry
      const volumeStoresRef = results['storageCapacity']['volumeStore'];
      results['storageCapacity']['volumeStore'] =
        volumeStoresRef.map(volStoreObj => {
          return `${volStoreObj['volDatastore']}${volStoreObj['volFileFolder']}:${volStoreObj['dockerVolName']}`;
        });
    }

    // transform gateways with routing destinations
    if (results['networks']) {
      if (results['networks']['clientNetworkRouting']) {
        results['networks']['clientNetworkGateway'] =
          results['networks']['clientNetworkRouting'].join(',') + ':' + results['networks']['clientNetworkGateway'];
        delete results['networks']['clientNetworkRouting'];
      }

      if (results['networks']['managementNetworkRouting']) {
        results['networks']['managementNetworkGateway'] =
          results['networks']['managementNetworkRouting'].join(',') + ':' + results['networks']['managementNetworkGateway'];
        delete results['networks']['managementNetworkRouting'];
      }

      // transform each container network entry

      const containerNetworksRef = results['networks']['containerNetworks'];
      results['networks']['containerNetworks'] =
        containerNetworksRef.map(containerNetObj => {
          if (containerNetObj['containerNetworkType'] === 'dhcp') {
            const net = {
              containerNetwork: containerNetObj['containerNetwork'] +
              ':' + containerNetObj['containerNetworkLabel'],
              containerNetworkFirewall: containerNetObj['containerNetwork'] +
              ':' + containerNetObj['containerNetworkFirewall']
            };

            if (containerNetObj['containerNetworkDns']) {
              net['containerNetworkDns'] = containerNetObj['containerNetwork'] +
                ':' + containerNetObj['containerNetworkDns'];
            }

            return net;
          } else {
            return {
              containerNetwork: containerNetObj['containerNetwork'] +
              ':' + containerNetObj['containerNetworkLabel'],
              containerNetworkIpRange: containerNetObj['containerNetwork'] +
              ':' + containerNetObj['containerNetworkIpRange'],
              containerNetworkGateway: containerNetObj['containerNetwork'] +
              ':' + containerNetObj['containerNetworkGateway'],
              containerNetworkDns: containerNetObj['containerNetwork'] +
              ':' + containerNetObj['containerNetworkDns'],
              containerNetworkFirewall: containerNetObj['containerNetwork'] +
              ':' + containerNetObj['containerNetworkFirewall']
            };
          }
        });
    }

    // transform server cert and key
    if (results['security']) {
      if (results['security']['tlsServerCert']) {
        results['security']['tlsServerCert'] = results['security']['tlsServerCert']['name']
      }

      if (results['security']['tlsServerKey']) {
        results['security']['tlsServerKey'] = results['security']['tlsServerKey']['name']
      }
    }

    // remove password
    if (results['operations']) {
      if (results['operations']['opsPassword']) {
        delete results['operations']['opsPassword'];
      }
    }

    return results;
  }

}
