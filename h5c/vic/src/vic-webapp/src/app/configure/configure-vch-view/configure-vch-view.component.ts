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
import {VchUi} from '../../interfaces/vch';
import {processPayloadFromApiToUi} from '../../shared/utils/vch/vch-utils';

@Component({
  selector: 'vic-configure-vch-view',
  styleUrls: ['configure-vch-view.component.scss'],
  templateUrl: './configure-vch-view.component.html'
})

export class ConfigureVchViewComponent implements OnInit {

  public vchId: string;
  public vchInfo: Observable<VchUi>;

  constructor(private globalsService: GlobalsService,
              private configureVchService: ConfigureVchService,
              private activatedRoute: ActivatedRoute) {
  }

  ngOnInit() {
    this.vchId = this.activatedRoute.snapshot.url[0].path;
    this.vchInfo = this.configureVchService.getVchInfo(this.vchId)
      .map(processPayloadFromApiToUi);
  }

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
