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

import {Component} from '@angular/core';
import {ConfigureVchService} from '../../configure-vch.service';
import {GlobalsService} from '../../../shared/globals.service';
import {ConfigureVchBase} from '../../configure-vch-base';
import {ActivatedRoute} from '@angular/router';
import {globalProperties} from '../../../../environments/properties';

@Component({
  selector: 'vic-configure-vch-modal-general',
  styleUrls: ['./configure-vch-modal-general.component.scss'],
  templateUrl: './configure-vch-modal-general.component.html'
})

export class ConfigureVchModalGeneralComponent extends ConfigureVchBase {

  public helpLink = globalProperties.vhcDocsGeneral;

  constructor(protected globalsService: GlobalsService,
              protected configureVchService: ConfigureVchService,
              protected activatedRoute: ActivatedRoute) {
    super(globalsService, configureVchService, activatedRoute);
  }

}
