/*
 Copyright 2018 VMware, Inc. All Rights Reserved.

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

import {Component, OnDestroy, OnInit} from '@angular/core';
import {GlobalsService} from '../shared/globals.service';
import {
  CONFIGURE_VCH_MODAL_HEIGHT,
  CONFIGURE_VCH_MODAL_URL,
  CONFIGURE_VCH_MODAL_WIDTH, VIC_APPLIANCE_PORT
} from '../shared/constants/index';
import {HttpClient} from '@angular/common/http';
import {ConfigureVchService} from '../services/configure-vch.service';
import {Observable} from 'rxjs/Observable';
import {Headers, Http, RequestOptions} from '@angular/http';
import {
  getServerInfoByVchObjRef,
  getServerServiceGuidFromObj
} from '../shared/utils/object-reference';
import {VirtualContainerHost} from '../vch-view/vch.model';
import {ServerInfo} from '../shared/vSphereClientSdkTypes';
import {ActivatedRoute, Params} from '@angular/router';
import {VicGeneralService} from '../services/vic-general.service';

@Component({
  selector: 'vic-configure-vch-view',
  styleUrls: ['configure-vch-view.component.scss'],
  templateUrl: './configure-vch-view.component.html'
})

export class ConfigureVchViewComponent implements OnInit, OnDestroy {

  public vchId: string;

  constructor(private globalsService: GlobalsService,
              private configureVchService: ConfigureVchService,
              private vicGeneralService: VicGeneralService,
              private activatedRoute: ActivatedRoute,
              private http: Http) { }

  ngOnInit() {

    this.vchId = this.activatedRoute.snapshot.url[0].path;
    this.configureVchService.getVchInfo(this.vchId)
      .subscribe( response => console.log('response: ', response));

    // --- HARCODED DATA --------------------------------------------------------------
    // const vch = 'urn:vmomi:VirtualMachine:vm-171:816c4bdf-dbeb-4087-ba84-6cee1da73098'};
    // const targetHostname = 'sc-rdops-vm03-dhcp-66-193.eng.vmware.com';
    // const targetThumbprint = '2D:03:4E:02:D6:1D:CE:7C:6D:68:E3:87:64:11:45:28:B9:56:0B:C4';
    // --------------------------------------------------------------------------------

    /*this.vchId = this.activatedRoute.snapshot.url[0].path;
    const vch = <VirtualContainerHost>{id: this.vchId};

    Observable.combineLatest(
      this.vicGeneralService.getVicApplianceIp(),
      this.vicGeneralService.acquireCloneTicket(vch.id.split(':')[4])
    ).subscribe(([serviceHost, cloneTicket]) => {
      const vchId = vch.id.split(':')[3];
      const servicePort = VIC_APPLIANCE_PORT;
      const vc = getServerInfoByVchObjRef(
        this.globalsService.getWebPlatform().getUserSession().serversInfo,
        vch
      );

      const targetHostname = vc ? vc.name : null;
      const targetThumbprint = vc ? vc.thumbprint : null;
      const url = `https://${serviceHost}:${servicePort}/container/target/${targetHostname}/vch/${vchId}?thumbprint=${targetThumbprint}`;
      const headers  = new Headers({
        'Content-Type': 'application/json',
        'X-VMWARE-TICKET': cloneTicket
      });

      const options  = new RequestOptions({ headers: headers });
      this.http.get(url, options)
        .map(response => response.json())
        .subscribe(response => {
          console.log('vch info: ', response);
        });
    });*/
  }


  ngOnDestroy() { }

  launchVchConfigureModal() {
    const webPlatform = this.globalsService.getWebPlatform();
    webPlatform.openModalDialog(
      ' ',
      `${CONFIGURE_VCH_MODAL_URL}`,
      CONFIGURE_VCH_MODAL_WIDTH,
      CONFIGURE_VCH_MODAL_HEIGHT,
      this.vchId
    );
  }
}
