import {Component, Input, OnInit} from '@angular/core';
import {VchComponentBase} from '../vch-component-base';
import {VchContainerNetworkUi, VchUiNetwork, VchUiStorageVolumeStore} from '../../../interfaces/vch';
import {Observable} from 'rxjs/Observable';
import {CreateVchWizardService} from '../../../create-vch-wizard/create-vch-wizard.service';
import {GlobalsService} from '../../globals.service';
import {ConfigureVchService} from '../../../configure/configure-vch.service';
import {FormArray, FormBuilder, Validators} from '@angular/forms';
import {cidrPattern, ipPattern, numberPattern, supportedCharsPattern} from '../../utils/validators';
import {cidrListPattern, ipListPattern} from '../../utils';
import {ComputeResource} from '../../../interfaces/compute.resource';

@Component({
  selector: 'vic-vch-network',
  templateUrl: './vch-network.component.html',
  styleUrls: ['./vch-network.component.scss']
})
export class VchNetworkComponent extends VchComponentBase implements OnInit {

  @Input() resourceObjName: any;
  @Input() datacenter: ComputeResource;
  @Input() model: VchUiNetwork;

  initialModel: VchUiNetwork = {
    bridgeNetwork: '',
    bridgeNetworkRange: '172.16.0.0/12',
    publicNetwork: '',
    publicNetworkIp: '',
    publicNetworkType: 'dhcp',
    publicNetworkGateway: '',
    dnsServer: '',
    clientNetwork: '',
    clientNetworkIp: '',
    clientNetworkType: 'dhcp',
    clientNetworkGateway: '',
    clientNetworkRouting: '',
    managementNetwork: '',
    managementNetworkIp: '',
    managementNetworkType: 'dhcp',
    managementNetworkGateway: '',
    managementNetworkRouting: '',
    containerNetworks: [],
    httpProxy: '',
    httpProxyPort: '',
    httpsProxy: '',
    httpsProxyPort: ''
  };

  public inAdvancedMode = false;
  public portgroupsLoading = true;
  public portgroups: any[] = [];
  public bridgeNetworkExpanded = false;
  public publicNetworkExpanded = false;

  constructor(
    protected formBuilder: FormBuilder,
    protected createWzService: CreateVchWizardService,
    protected globalsService: GlobalsService,
    protected configureService: ConfigureVchService
  ) {
    super(formBuilder, createWzService, globalsService, configureService);
    this.updateCurrentForm(this.initialModel);
  }

  ngOnInit() {
    if (this.model) {
      if (this.model.clientNetwork || this.model.managementNetwork) {
        this.inAdvancedMode = true;
      }
    }
    super.ngOnInit();
  }

  protected updateCurrentForm(model: VchUiNetwork) {
    console.log('updateCurrentForm:', model);
    this.form = this.formBuilder.group({
      bridgeNetwork: [model.bridgeNetwork, Validators.required],
      bridgeNetworkRange: [model.bridgeNetworkRange, Validators.required],
      publicNetwork: [model.publicNetwork, Validators.required],
      publicNetworkIp: [{ value: model.publicNetworkIp, disabled: model.publicNetworkIp ? false : true }, [
        Validators.required,
        Validators.pattern(cidrPattern)
      ]],
      publicNetworkType: model.publicNetworkType,
      publicNetworkGateway: [{ value: model.publicNetworkGateway, disabled: model.publicNetworkGateway ? false : true }, [
        Validators.required,
        Validators.pattern(ipPattern)
      ]],
      dnsServer: [model.dnsServer, Validators.pattern(ipListPattern)],
      clientNetwork: model.clientNetwork,
      clientNetworkIp: [{ value: model.clientNetworkIp, disabled: model.clientNetworkIp ? false : true }, [
        Validators.required,
        Validators.pattern(cidrPattern)
      ]],
      clientNetworkType: model.clientNetworkType,
      clientNetworkGateway: [{ value: model.clientNetworkGateway, disabled: model.clientNetworkGateway ? false : true }, [
        Validators.required,
        Validators.pattern(ipPattern)
      ]],
      clientNetworkRouting: [{ value: model.clientNetworkRouting, disabled: model.clientNetworkRouting ? false : true }, [
        Validators.pattern(cidrListPattern)
      ]],
      managementNetwork: model.managementNetwork,
      managementNetworkIp: [{ value: model.managementNetworkIp, disabled: model.managementNetworkIp ? false : true }, [
        Validators.required,
        Validators.pattern(cidrPattern)
      ]],
      managementNetworkType: model.managementNetworkType,
      managementNetworkGateway: [{ value: model.managementNetworkGateway, disabled: model.managementNetworkGateway ? false : true }, [
        Validators.required,
        Validators.pattern(ipPattern)
      ]],
      managementNetworkRouting: [{ value: model.managementNetworkRouting, disabled: model.managementNetworkRouting ? false : true }, [
        Validators.pattern(cidrListPattern)
      ]],
      containerNetworks: this.formBuilder.array(model.containerNetworks.length > 0 ?
        this.model.containerNetworks
          .map(container => this.createNewContainerNetworkEntry(container)) : [this.createNewContainerNetworkEntry()]),
      httpProxy: model.httpProxy,
      httpProxyPort: [
        model.httpProxyPort,
        [
          Validators.maxLength(5),
          Validators.pattern(numberPattern)
        ]
      ],
      httpsProxy: model.httpsProxy,
      httpsProxyPort: [
        model.httpsProxyPort,
        [
          Validators.maxLength(5),
          Validators.pattern(numberPattern)
        ]
      ]
    });
  }

  protected updateCurrentModel() {
    if (this.form.valid) {
      this.model.bridgeNetwork = this.form.get('bridgeNetwork').value;
      this.model.publicNetwork = this.form.get('publicNetwork').value;

      if (this.form.get('bridgeNetworkRange').value) {
        this.model.bridgeNetworkRange = this.form.get('bridgeNetworkRange').value;
      }

      if (this.form.get('publicNetworkType').value === 'static') {
        this.model.publicNetworkIp = this.form.get('publicNetworkIp').value;
        this.model.publicNetworkGateway = this.form.get('publicNetworkGateway').value;
      }

      if (this.form.get('dnsServer').value) {
        this.model.dnsServer = this.form.get('dnsServer').value.split(',').map(v => v.trim());
      }

      const httpProxyValue = this.form.get('httpProxy').value;
      const httpProxyPortValue = this.form.get('httpProxyPort').value;
      const httpsProxyValue = this.form.get('httpsProxy').value;
      const httpsProxyPortValue = this.form.get('httpsProxyPort').value;

      if (this.inAdvancedMode) {

        if (this.form.get('clientNetwork').value) {
          this.model.clientNetwork = this.form.get('clientNetwork').value;

          if (this.form.get('clientNetworkType').value === 'static') {
            this.model.clientNetworkIp = this.form.get('clientNetworkIp').value;
            this.model.clientNetworkGateway = this.form.get('clientNetworkGateway').value;
            this.model.clientNetworkRouting = this.form.get('clientNetworkRouting').value.split(',').map(v => v.trim());
          }
        }

        if (this.form.get('managementNetwork').value) {
          this.model.managementNetwork = this.form.get('managementNetwork').value;

          if (this.form.get('managementNetworkType').value === 'static') {
            this.model.managementNetworkIp = this.form.get('managementNetworkIp').value;
            this.model.managementNetworkGateway = this.form.get('managementNetworkGateway').value;
            this.model.managementNetworkRouting = this.form.get('managementNetworkRouting').value.split(',').map(v => v.trim());
          }
        }

        this.model.containerNetworks = this.form.get('containerNetworks')
          .value
          .filter(entry => entry['containerNetwork']);

        if (httpProxyValue && httpProxyPortValue) {
          this.model.httpProxy = `http://${httpProxyValue}:${httpProxyPortValue}`;
        }

        if (httpsProxyValue && httpsProxyPortValue) {
          this.model.httpsProxy = `https://${httpsProxyValue}:${httpsProxyPortValue}`;
        }
      } else {
        this.model.containerNetworks = [];
      }

      return Observable.of({ networks: this.model });
    }
  }

  onCommit(): Observable<{ [key: string]: VchUiNetwork }> {
    return Observable.of({ networks: this.model });
  }

  // -----------------------------------------------------------------------------------

  addNewContainerNetworkEntry() {
    const containerNetworks = this.form.get('containerNetworks') as FormArray;
    const newContainerNetworkEntity = this.createNewContainerNetworkEntry();
    newContainerNetworkEntity.controls['containerNetworkLabel'].enable();
    containerNetworks.push(newContainerNetworkEntity);
  }

  removeContainerNetworkEntry(index: number) {
    const containerNetworks = this.form.get('containerNetworks') as FormArray;
    containerNetworks.removeAt(index);
  }

  createNewContainerNetworkEntry(container?: VchContainerNetworkUi) {
    return this.formBuilder.group({
      containerNetwork: container ? container.containerNetwork : '',
      containerNetworkIpRange: [{ value: container ? container.containerNetworkIpRange : '', disabled: true }, Validators.required],
      containerNetworkType: [{ value: container ? container.containerNetworkType : 'dhcp', disabled: true }],
      containerNetworkDns: [{ value: container ? container.containerNetworkDns : '', disabled: true }, [
        Validators.pattern(ipPattern)
      ]],
      containerNetworkGateway: [{ value: container ? container.containerNetworkGateway : '', disabled: true }, [
        Validators.required,
        Validators.pattern(ipPattern)
      ]],
      containerNetworkLabel: [{ value: container ? container.containerNetworkLabel : '', disabled: true }, [
        Validators.required,
        Validators.pattern(supportedCharsPattern)
      ]],
      containerNetworkFirewall: [{ value: container ? container.containerNetworkFirewall : '', disabled: true }]
    });
  }

  loadPortgroups(computeResourceObjName: string) {
    this.portgroupsLoading = true;
    this.createWzService.getDistributedPortGroups(this.datacenter, computeResourceObjName)
      .subscribe(v => {
        this.portgroups = v;
        if (this.model.bridgeNetwork) {
          this.form.get('bridgeNetwork').setValue(this.getPortGroupText(this.model.bridgeNetwork));
        }
        if (this.model.publicNetwork) {
          this.form.get('publicNetwork').setValue(this.getPortGroupText(this.model.publicNetwork));
        }
        if (this.model.clientNetwork) {
          this.form.get('clientNetwork').setValue(this.getPortGroupText(this.model.clientNetwork));
        }
        if (this.model.managementNetwork) {
          this.form.get('managementNetwork').setValue(this.getPortGroupText(this.model.managementNetwork));
        }

        if (this.form.get('containerNetworks').value.length > 0) {
          const containerNetworks = this.form.get('containerNetworks') as FormArray;
          this.form.get('containerNetworks').value.forEach((control, index) => {
            containerNetworks.at(index).get('containerNetwork').setValue(this.getPortGroupText(control.containerNetwork));
          });
        }

        this.portgroupsLoading = false;
      }, err => console.error(err));
  }

  getPortGroupText(portgroupId: string): string {
    const portgroup = this.portgroups.find(pg => pg.objRef.split(':')[3] === portgroupId);
    return portgroup ? portgroup.text : '';
  }

  onPageLoad() {
    console.log('resourceObjName:', this.resourceObjName);
    console.log('datacenter:', this.datacenter);
    if (this.portgroups.length) {
      this.loadPortgroups(this.resourceObjName);
      return;
    }

    this.form.get('publicNetworkType').valueChanges
      .subscribe(v => {
        if (v === 'dhcp') {
          this.form.get('publicNetworkIp').disable();
          this.form.get('publicNetworkGateway').disable();
          this.form.get('dnsServer').setValidators([
            Validators.pattern(ipListPattern)
          ]);
          this.form.get('dnsServer').updateValueAndValidity();
        } else {
          this.form.get('publicNetworkIp').enable();
          this.form.get('publicNetworkGateway').enable();
          this.form.get('dnsServer').setValidators([
            Validators.required,
            Validators.pattern(ipListPattern)
          ]);
          this.form.get('dnsServer').updateValueAndValidity();
        }
      });

    this.form.get('clientNetworkType').valueChanges
      .subscribe(v => {
        if (v === 'dhcp') {
          this.form.get('clientNetworkIp').disable();
          this.form.get('clientNetworkGateway').disable();
          this.form.get('clientNetworkRouting').disable();
        } else {
          this.form.get('clientNetworkIp').enable();
          this.form.get('clientNetworkGateway').enable();
          this.form.get('clientNetworkRouting').enable();
        }
      });

    this.form.get('managementNetworkType').valueChanges
      .subscribe(v => {
        if (v === 'dhcp') {
          this.form.get('managementNetworkIp').disable();
          this.form.get('managementNetworkGateway').disable();
          this.form.get('managementNetworkRouting').disable();
        } else {
          this.form.get('managementNetworkIp').enable();
          this.form.get('managementNetworkGateway').enable();
          this.form.get('managementNetworkRouting').enable();
        }
      });

    this.form.get('containerNetworks').valueChanges
      .subscribe(v => {
        v.forEach((item, index) => {
          const controls = this.form.get('containerNetworks')['controls'][index]['controls'];
          const networkControl = controls['containerNetwork'];
          const networkTypeControl = controls['containerNetworkType'];
          const labelControl = controls['containerNetworkLabel'];
          const ipRangeControl = controls['containerNetworkIpRange'];
          const gatewayControl = controls['containerNetworkGateway'];
          const dnsControl = controls['containerNetworkDns'];
          const firewallControl = controls['containerNetworkFirewall'];

          if (networkControl.value) {
            if (labelControl.disabled) {
              labelControl.enable();
            }
            if (networkTypeControl.disabled) {
              networkTypeControl.enable();
            }
            if (dnsControl.disabled) {
              dnsControl.enable();
            }
            if (firewallControl.disabled) {
              firewallControl.enable();
            }
            if (networkTypeControl.value === 'static') {
              if (ipRangeControl.disabled) {
                ipRangeControl.enable();
              }
              if (gatewayControl.disabled) {
                gatewayControl.enable();
              }
              dnsControl.setValidators([
                Validators.required,
                Validators.pattern(ipPattern)
              ]);
            } else {
              if (ipRangeControl.enabled) {
                ipRangeControl.disable();
              }
              if (gatewayControl.enabled) {
                gatewayControl.disable();
              }
              dnsControl.setValidators([
                Validators.pattern(ipPattern)
              ]);
            }
          } else {
            if (labelControl.enabled) {
              labelControl.disable();
            }
            if (networkTypeControl.enabled) {
              networkTypeControl.disable();
            }
            if (ipRangeControl.enabled) {
              ipRangeControl.disable();
            }
            if (gatewayControl.enabled) {
              gatewayControl.disable();
            }
            if (dnsControl.enabled) {
              dnsControl.disable();
            }
            if (firewallControl.enabled) {
              firewallControl.disable();
            }
            dnsControl.setValidators([
              Validators.pattern(ipPattern)
            ]);
          }

          dnsControl.updateValueAndValidity({onlySelf: false, emitEvent: false});
        });
      });

    // load portgroups
    this.loadPortgroups(this.resourceObjName);
  }

  toggleAdvancedMode() {
    this.inAdvancedMode = !this.inAdvancedMode;
  }

}

