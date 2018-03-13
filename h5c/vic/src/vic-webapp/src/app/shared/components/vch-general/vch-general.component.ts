import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {Subscription} from 'rxjs/Subscription';
import {ipOrFqdnPattern, numberPattern, supportedCharsPattern} from '../../utils/validators';
import {VchUiGeneral} from '../../../interfaces/vch';
import {Observable} from 'rxjs/Observable';
import {CreateVchWizardService} from '../../../create-vch-wizard/create-vch-wizard.service';

@Component({
  selector: 'vic-vch-general',
  templateUrl: './vch-general.component.html',
  styleUrls: ['./vch-general.component.scss']
})
export class VchGeneralComponent  implements OnInit, OnDestroy {

  @Input() model: VchUiGeneral;
  @Input() readOnly: boolean;

  @Output() modelChanged: EventEmitter<VchUiGeneral> = new EventEmitter();
  @Output() focus: EventEmitter<VchGeneralComponent> = new EventEmitter();

  private containerNameConventionPattern = /^(.*)({id}|{name})(.*)$/;
  private syslogAddressPattern = /^(tcp|udp):\/\/(.*):(.*)$/;
  private debugOptions: {value: number, display: string}[] = [
    {value: 0, display: '0 - Verbose logging is disabled'},
    {value: 1, display: '1 - Provides extra verbosity in the logs'},
    {value: 2, display: '2 - Exposes server on more interfaces, launches pprof in container VMs'},
    {value: 3, display: '3 - Disables recovery logic and logs sensitive data'}
  ];
  private formValueChangesSubscription: Subscription;
  private readonly initialModel: VchUiGeneral = {
    name: 'virtual-container-host',
    containerNameConvention: '',
    debug: this.debugOptions[0].value,
    syslogAddress: ''
  };

  public vicApplianceIp: string;
  public form: FormGroup;

  constructor(private formBuilder: FormBuilder,
              private createWzService: CreateVchWizardService) {}

  ngOnInit() {
    if (!this.model) {
      this.model = this.initialModel;
    }

    const [,
      containerNameConventionPrefix = '',
      containerNameConvention = '{name}',
      containerNameConventionPostfix = ''
    ] = this.model.containerNameConvention.match(this.containerNameConventionPattern) || [];

    const [,
      syslogTransport = 'tcp',
      syslogHost = '',
      syslogPort = '',
    ] = (this.model && this.model.syslogAddress.match(this.syslogAddressPattern)) || [];

    this.form = this.formBuilder.group({
      name: [this.model.name, [ Validators.required,
        Validators.maxLength(80),
        Validators.pattern(supportedCharsPattern)]],
      containerNameConventionPrefix,
      containerNameConvention,
      containerNameConventionPostfix,
      debug: this.model.debug || 0,
      syslogTransport,
      syslogHost: [syslogHost, [Validators.pattern(ipOrFqdnPattern)]],
      syslogPort: [syslogPort, [Validators.maxLength(5),
        Validators.pattern(numberPattern)]]
    });

    this.modelChanged.emit(this.model);
    this.focus.emit(this);

    this.formValueChangesSubscription = this.form
      .valueChanges
      .subscribe(value => {
      if (this.form.valid) {
        this.model.name = value.name.trim();
        this.model.debug = value.debug;

        const prefix = value.containerNameConventionPrefix.trim();
        const postfix = value.containerNameConventionPostfix.trim();

        if (prefix || postfix) {
          this.model.containerNameConvention =
            `${prefix}${value.containerNameConvention}${postfix}`;
        }

        /!* tslint:disable:no-shadowed-variable *!/
        const {
          syslogTransport,
          syslogHost,
          syslogPort
        } = value;

        if (syslogHost && syslogPort) {
          this.model.syslogAddress = `${syslogTransport}://${syslogHost}:${syslogPort}`;
        }

        this.modelChanged.emit(this.model);
      }
    });
  }

  onPageLoad() { }

  ngOnDestroy() {
    this.formValueChangesSubscription.unsubscribe();
  }

  /**
   * Async validation for the Name section
   * This calls the VchCreationWizardService to check if the provided name
   * is unique among VirtualApps and ResourcePools on VC and then returns
   * an observable of the name or any error
   * @returns {Observable<any>}
   */
  onCommit(): Observable<any> {
    return Observable
      .zip(
        this.createWzService.getVicApplianceIp(),
        this.createWzService.checkVchNameUniqueness(this.form.get('name').value)
      )
      .catch(err => {
        // if any failure occurrs, unset the vicApplianceIp var
        this.vicApplianceIp = null;
        return Observable.throw(err);
      })
      .switchMap((arr) => {
        this.vicApplianceIp = arr[0];
        const isUnique = arr[1];
        if (!isUnique) {
          this.form.get('name').setErrors({
            resourcePoolExists: true
          });
          return Observable.throw(
            ['There is already a VirtualApp or ResourcePool that exists with the same name']);
        }

        return Observable.of({general: this.model});
      });
  }

  isFormControlInvalid(controlName: string) {
    const control = this.form.get(controlName);
    return control.invalid && (control.dirty || control.touched);
  }

  /*toApiPayload(): VchApiGeneral {
    return {
      name: this.model.name,
      debug: this.model.debug,
      syslog_addr: this.model.syslogAddress,
      container: {
        name_convention: this.model.containerNameConvention
      }
    }
  }*/
}
