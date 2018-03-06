import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {FormBuilder, Validators} from '@angular/forms';
import {Subscription} from 'rxjs/Subscription';
import {ipOrFqdnPattern, numberPattern, supportedCharsPattern} from '../../utils/validators';
import {VchApiGeneral, VchUiGeneral} from '../../../interfaces/vch';
import {VchForm} from '../vch-form';

@Component({
  selector: 'vic-vch-general',
  templateUrl: './vch-general.component.html',
  styleUrls: ['./vch-general.component.scss']
})
export class VchGeneralComponent extends VchForm implements OnInit, OnDestroy {

  @Input() model: VchUiGeneral;

  @Input() readOnly: boolean;

  @Output() modelChanged: EventEmitter<VchUiGeneral> = new EventEmitter();

  private containerNameConventionPattern = /^(.*)({id}|{name})(.*)$/;
  private syslogAddressPattern = /^(tcp|udp):\/\/(.*):(.*)$/;
  private formValueChangesSubscription: Subscription;

  constructor(private formBuilder: FormBuilder) {
    super();
  }

  ngOnInit() {
    const name = this.model.name;

    const [
      ,
      containerNameConventionPrefix = '',
      containerNameConvention = '{name}',
      containerNameConventionPostfix = ''
    ] = this.model.containerNameConvention.match(this.containerNameConventionPattern) || [];

    const debug = this.model.debug || 0;

    const [
      ,
      syslogTransport = 'tcp',
      syslogHost = '',
      syslogPort = '',
    ] = this.model.containerNameConvention.match(this.syslogAddressPattern) || [];

    this.form = this.formBuilder.group({
      name: [
        name,
        [
          Validators.required,
          Validators.maxLength(80),
          Validators.pattern(supportedCharsPattern)
        ]
      ],
      containerNameConventionPrefix,
      containerNameConvention,
      containerNameConventionPostfix,
      debug,
      syslogTransport,
      syslogHost: [
        syslogHost,
        [
          Validators.pattern(ipOrFqdnPattern)
        ]
      ],
      syslogPort: [
        syslogPort,
        [
          Validators.maxLength(5),
          Validators.pattern(numberPattern)
        ]
      ]
    });
    this.modelChanged.emit(this.model);

    this.formValueChangesSubscription = this.form.valueChanges.subscribe(value => {
      if (this.form.valid) {
        this.model.name = value.name.trim();
        this.model.debug = value.debug;

        const prefix = value.containerNameConventionPrefix.trim(),
          postfix = value.containerNameConventionPostfix.trim();

        if (prefix || postfix) {
          this.model.containerNameConvention =
            prefix + value.containerNameConvention + postfix;
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

  ngOnDestroy() {
    this.formValueChangesSubscription.unsubscribe();
  }

  toApiPayload(): VchApiGeneral {
    return {
      name: this.model.name,
      debug: this.model.debug, //arseInt(this.model.debug, 10),
      syslog_addr: this.model.syslogAddress,
      container: {
        name_convention: this.model.containerNameConvention
      }
    }
  }
}
