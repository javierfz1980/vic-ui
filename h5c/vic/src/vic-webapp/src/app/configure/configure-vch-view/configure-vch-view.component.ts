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
import {GlobalsService} from '../../shared/globals.service';
import {
  CONFIGURE_VCH_MODAL_HEIGHT,
  CONFIGURE_VCH_MODAL_URL,
  CONFIGURE_VCH_MODAL_WIDTH
} from '../../shared/constants/index';
import {ConfigureVchService} from '../configure-vch.service';
import {ActivatedRoute} from '@angular/router';
import {Observable} from 'rxjs/Observable';
import {SharesLevel, VchApi, VchUi} from '../../interfaces/vch';

@Component({
  selector: 'vic-configure-vch-view',
  styleUrls: ['configure-vch-view.component.scss'],
  templateUrl: './configure-vch-view.component.html'
})

export class ConfigureVchViewComponent implements OnInit, OnDestroy {

  public vchId: string;
  public vchInfo: Observable<VchUi>;

  constructor(private globalsService: GlobalsService,
              private configureVchService: ConfigureVchService,
              private activatedRoute: ActivatedRoute) { }

  ngOnInit() {
    this.vchId = this.activatedRoute.snapshot.url[0].path;
    this.vchInfo = this.configureVchService.getVchInfo(this.vchId)
      .map((vch: VchApi) => {
        console.log('configure view VchApi: ', vch);
        const uiModel: VchUi = {
          general: {
            name: vch.name,
            containerNameConvention: vch.container.name_convention || '',
            debug: vch.debug,
            syslogAddress: vch.syslog_addr || ''
          },
          compute: {
            cpuLimit: vch.compute.cpu.limit ? vch.compute.cpu.limit.value : null,
            memoryLimit: vch.compute.memory.limit ? vch.compute.memory.limit.value : null,
            cpuReservation: vch.compute.cpu.reservation ? vch.compute.cpu.reservation.value : null,
            cpuShares: vch.compute.cpu.shares.level,
            memoryShares: vch.compute.memory.shares.level,
            memoryReservation: vch.compute.memory.reservation ? vch.compute.memory.reservation.value : null,
            endpointCpu: vch.endpoint.cpu.sockets,
            endpointMemory: vch.endpoint.memory.value,
            computeResource: vch.compute.resource.id
          }
        };
        console.log('configure view VchUi: ', uiModel);
        return uiModel;
      });
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
