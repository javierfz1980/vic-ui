/*
 Copyright 2017 VMware, Inc. All Rights Reserved.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

import {Component, Input, OnInit} from '@angular/core';
import {VchComponentBase} from '../vch-component-base';
import {
  defaultCertificateKeySize, serverCertSourceAutogenerated, serverCertSourceExisting, VchNetworkView, TlsCaView,
  VchSecurityView
} from '../../../interfaces/vch';
import {Observable} from 'rxjs/Observable';
import {CreateVchWizardService} from '../../../create-vch-wizard/create-vch-wizard.service';
import {FormArray, FormBuilder, Validators} from '@angular/forms';
import {numberPattern} from '../../utils/validators';
import {ComputeResource} from '../../../interfaces/compute.resource';
import {CertificateInfo, parseCertificatePEMFileContent, parsePrivateKeyPEMFileContent, PrivateKeyInfo} from '../../utils/certificates';
import {getServerHostnameFromObj, getServerThumbprintFromObj} from '../../utils/object-reference';
import {I18nService} from '../../i18n.service';
import {ConfigureVchService} from '../../../configure/configure-vch.service';
import {GlobalsService} from '../../globals.service';

@Component({
  selector: 'vic-vch-security',
  templateUrl: './vch-security.component.html',
  styleUrls: ['./vch-security.component.scss']
})
export class VchSecurityComponent extends VchComponentBase implements OnInit {

  @Input() vchName: string;
  @Input() datacenter: ComputeResource;
  @Input() model: VchSecurityView;

  protected readonly apiModelKey = 'security';
  protected readonly initialModel: VchSecurityView = {
    serverCertSource: serverCertSourceAutogenerated,
    certificateKeySize: defaultCertificateKeySize,
    useClientAuth: true,
    tlsCa: []
  };

  public readonly serverCertSourceExistingConst = serverCertSourceExisting;
  public readonly serverCertSourceAutogeneratedConst = serverCertSourceAutogenerated;
  public tlsServerCertContents: TlsCaView = null;
  public tlsServerKeyContents: TlsCaView = null;
  public tlsServerError: string = null;
  // array that keeps track of TLS CA files' name and content
  public tlsCaContents: TlsCaView[] = [];
  public tlsCaError: string = null;
  private _isSetup = false;

  constructor(
    protected formBuilder: FormBuilder,
    protected createWzService: CreateVchWizardService,
    protected globalsService: GlobalsService,
    protected configureService: ConfigureVchService,
    public i18n: I18nService
  ) {
    super(formBuilder, createWzService, globalsService, configureService);
    this.updateCurrentForm(this.initialModel);
  }

  ngOnInit() {
    super.ngOnInit();
    this.ensureFirstTlsCaIsRequired();
  }

  protected updateCurrentForm(model: VchSecurityView) {
    this.form = this.formBuilder.group({
      serverCertSource: model.serverCertSource,
      organization: model.organization,
      useClientAuth: model.useClientAuth,
      noTlsverify: model.noTlsverify,
      tlsCname: [model.tlsCname, [Validators.required]],
      certificateKeySize: [model.certificateKeySize ? model.certificateKeySize : defaultCertificateKeySize,
        [Validators.required, Validators.pattern(numberPattern)]],
      tlsServerCert: [model.tlsServerCert, [Validators.required]],
      tlsServerKey: [model.tlsServerKey, [Validators.required]],
      tlsCas: this.formBuilder.array(model.tlsCa && model.tlsCa.length > 0 ? [
          ...(model.tlsCa.map(cert => this.createNewFormArrayEntry('tlsCas', cert.name))),
          this.createNewFormArrayEntry('tlsCas')
        ] : [
          this.createNewFormArrayEntry('tlsCas')
        ])
    });

    this.tlsCaContents = model.tlsCa ? model.tlsCa : [];
    this.tlsServerCertContents = model.tlsServerCert;
    this.tlsServerKeyContents = model.tlsServerKey;

    this.updateServerFieldsStatus(model.serverCertSource);
    this.updateClientFieldStatus(model.useClientAuth);
  }

  protected updateCurrentModel() {
    if (this.form.valid || this.readOnly) {
      const serversInfo = this.globalsService.getWebPlatform().getUserSession().serversInfo;
      const useClientAuthValue = this.form.get('useClientAuth').value;
      const serverCertSourceValue = this.form.get('serverCertSource').value;
      const tlsCnameValue = this.form.get('tlsCname').value;
      const orgValue = this.form.get('organization').value;
      const certKeySizeValue = parseInt(this.form.get('certificateKeySize').value, 10);

      const currentModel: VchSecurityView = {
        useClientAuth: useClientAuthValue,
        serverCertSource: serverCertSourceValue,
        tlsCa: useClientAuthValue ? this.tlsCaContents : [],
        user: this.createWzService.getUserId(),
        thumbprint: getServerThumbprintFromObj(serversInfo, this.datacenter),
        target: `${getServerHostnameFromObj(serversInfo, this.datacenter)}${(this.datacenter.text ? '/' + this.datacenter.text : '')}`
      };

      if (serverCertSourceValue === 'autogenerated') {
        if (tlsCnameValue) {
          currentModel.tlsCname = tlsCnameValue;
        }
        if (orgValue) {
          currentModel.organization = orgValue;
        }
        if (certKeySizeValue) {
          currentModel.certificateKeySize = certKeySizeValue;
        }
      } else {
        currentModel.tlsServerKey = this.tlsServerKeyContents;
        currentModel.tlsServerCert = this.tlsServerCertContents;
      }

      currentModel.noTlsverify = !useClientAuthValue;

      this.model = currentModel;
    }
  }

  onPageLoad() {
    if (this._isSetup) {
      return;
    }

    this.form.get('tlsCname').setValue(this.vchName);
    this.form.get('serverCertSource').valueChanges
      .subscribe(v => {
        this.updateServerFieldsStatus(v);
      });

    this.form.get('useClientAuth').valueChanges
      .subscribe(v => {
        this.updateClientFieldStatus(v);
      });

    this._isSetup = true;
  }

  onCommit(): Observable<{[key: string]: VchSecurityView }> {
    return Observable.of({[this.apiModelKey]: this.model});
  }

  // ------------------------------------------------------

  private updateServerFieldsStatus(source: string) {
    if (source === serverCertSourceAutogenerated) {
      this.form.get('tlsCname').enable();
      this.form.get('certificateKeySize').enable();
      this.form.get('tlsServerCert').disable();
      this.form.get('tlsServerKey').disable();
    } else {
      this.form.get('tlsCname').disable();
      this.form.get('certificateKeySize').disable();
      this.form.get('tlsServerCert').enable();
      this.form.get('tlsServerKey').enable();
    }
  }

  private updateClientFieldStatus(useClientAuth: boolean) {
    if (useClientAuth) {
      this.form.get('tlsCas').enable();
    } else {
      this.form.get('tlsCas').disable();
    }
  }

  ensureFirstTlsCaIsRequired() {
    const firstTlsCa = (this.form.get('tlsCas') as FormArray).at(0).get('tlsCa');
    firstTlsCa.setValidators([Validators.required]);
    firstTlsCa.updateValueAndValidity();
  }

  addNewFormArrayEntry(controlName: string) {
    const control = this.form.get(controlName) as FormArray;
    if (!control) {
      return;
    }
    control.push(this.createNewFormArrayEntry(controlName));
  }

  createNewFormArrayEntry(controlName: string, value: string = '') {
    if (controlName === 'tlsCas') {
      return this.formBuilder.group({
        tlsCa: value
      });
    }
  }

  removeFormArrayEntry(controlName: string, index: number) {
    const control = this.form.get(controlName) as FormArray;
    if (!control) {
      return;
    }

    if (controlName === 'tlsCas') {
      if (index > 0 || (index === 0 && control.controls.length > 1)) {
        // remove the input control only if the current control is not the first one
        // and splice the internal array
        control.removeAt(index);
        this.tlsCaContents.splice(index, 1);
      } else {
        // clear the input and shift the internal array
        this.tlsCaContents.shift();
        control.controls[index].reset();
      }
      this.ensureFirstTlsCaIsRequired();
    } else {
      control.removeAt(index);
    }
  }

  /**
   * On Change event read the content of the file and add it to the
   * corresponding array or overwrite the value at the given index
   * @param {Event} evt change event on file input
   * @param {string} targetField used to determine which field to push data to
   * @param {number} index FormArray index
   * @param {boolean} isLast is FormArray last element
   */
  addFileContent(evt: Event, targetField: string, index: number, isLast: boolean) {
    const fr = new FileReader();
    const fileList: FileList = evt.target['files'];

    const fileReaderOnLoadFactory = (filename: string) => {
      let certificate: CertificateInfo;
      let privateKey: PrivateKeyInfo;

      switch (targetField) {
        case 'tlsServerCert': return (event) => {
          try {
            certificate = parseCertificatePEMFileContent(event.target.result);
          } catch (e) {
            this.tlsServerError = this.i18n.translate('vch.security.failedToParseClientPemCer');
            return;
          }

          this.form.get('tlsServerCert').setValue(filename);
          this.tlsServerCertContents = {
            name: filename,
            content: event.target.result,
            expires: certificate.expires
          };
        };
        case 'tlsServerKey': return (event) => {
          try {
            privateKey = parsePrivateKeyPEMFileContent(event.target.result);
          } catch (e) {
            this.tlsServerError = this.i18n.translate('vch.security.failedToParseServerPemKey');
            return;
          }

          this.form.get('tlsServerKey').setValue(filename);
          this.tlsServerKeyContents = {
            name: filename,
            content: event.target.result,
            algorithm: privateKey.algorithm
          };
        };
        case 'tlsCas': return (event) => {
          let targetArray: any[];

          targetArray = this.tlsCaContents;

          try {
            certificate = parseCertificatePEMFileContent(event.target.result);
          } catch (e) {
            this.tlsCaError = this.i18n.translate('vch.security.failedToParseServerPemCer');
            return;
          }

          if (isLast) {
            this.addNewFormArrayEntry(targetField);
          }

          const value = {
            name: filename,
            content: event.target.result,
            expires: certificate.expires
          };

          if (targetArray[index]) {
            // overwrite if value already exists at this index
            targetArray[index] = value;
          } else {
            targetArray.push(value);
          }

          if (targetField === 'tlsCas') {
            (this.form.get('tlsCas') as FormArray).at(index).get('tlsCa').setValue(filename);
          }
        };
      }
    };

    // since input is without the 'multiple' attribute we are sure that
    // only one entry will be available under FileList
    const fileInstance: File = fileList[0];
    switch (targetField) {
      case 'tlsCas': {
        this.tlsCaError = fileInstance ? null : this.i18n.translate('vch.security.failedToLoadCliCertPem');
        break;
      }
      case 'tlsServerCert': {
        this.tlsServerError = fileInstance ? null : this.i18n.translate('vch.security.failedToLoadServCertPem');
        break;
      }
      case 'tlsServerKey': {
        this.tlsServerError = fileInstance ? null : this.i18n.translate('vch.security.failedToLoadServKeyPem');
        break;
      }
    }

    fr.onload = fileReaderOnLoadFactory(fileInstance.name);
    fr.readAsText(fileInstance);
  }

  /**
   * Clear the file reader error messages. This method is called when clr-tab's
   * clrTabsCurrentTabContentChanged event is fired
   */
  clearFileReaderError() {
    this.tlsCaError = this.tlsServerError = null;
  }

}
