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

import {Component, ElementRef, OnDestroy, OnInit, Renderer, ViewChild} from '@angular/core';
import {GlobalsService} from '../../shared/globals.service';
import {CONFIGURE_VCH_MODAL_HEIGHT} from '../../shared/constants/index';
import {Modal} from '@clr/angular';
import {BehaviorSubject} from 'rxjs/BehaviorSubject';
import {ActivatedRoute} from '@angular/router';
import {
  VchApi,
  VchUi,
  VchUiModelTypes
} from '../../interfaces/vch';
import {Observable} from 'rxjs/Observable';
import {ConfigureVchService} from '../configure-vch.service';
import {ConfigureTabsComponent, VchConfigureTabs} from '../configure-tabs.component';
import {
  processPayloadFromApiToUi,
  processPayloadFromUiToApi
} from '../../shared/utils/vch/vch-utils';
import {HttpErrorResponse} from '@angular/common/http';


@Component({
  selector: 'vic-configure-vch-modal',
  styleUrls: ['configure-vch-modal.component.scss'],
  templateUrl: './configure-vch-modal.component.html'
})

export class ConfigureVchModalComponent implements OnInit, OnDestroy {

  @ViewChild('modal') modal: Modal;
  @ViewChild('tabsComponent') tabsComponent: ConfigureTabsComponent;

  public vchId: string;
  public vchInfo: Observable<VchUi>;
  public currentTabModelPayload: BehaviorSubject<VchUiModelTypes> = new BehaviorSubject(null);
  public showCli = false;
  public errorMsgs: string[];
  public loading = false;
  public errorFlag = false;
  public currentFormIsInvalid = false;
  private currentTab: VchConfigureTabs;

  constructor(private globalsService: GlobalsService,
              private activatedRoute: ActivatedRoute,
              private configureVchService: ConfigureVchService,
              private renderer: Renderer,
              private el: ElementRef) {
  }

  ngOnInit() {
    this.vchId = this.activatedRoute.snapshot.url[0].path;
    this.vchInfo = this.configureVchService.getVchInfo(this.vchId)
      .map(processPayloadFromApiToUi)
      .do(() => this.showCli = true);

    this.resizeToParentFrame();
    this.modal.open();
  }

  ngOnDestroy() { }

  /**
   * Resize the parent modal
   */
  resizeToParentFrame(p: Window = parent) {
    // "context error" warning shows up during unit tests (but they still pass).
    // this can be avoided by running the logic a tick later
    setTimeout(() => {
      const clrModalEl = p.document.querySelector('clr-modal');
      // resize only if the parent modal is there. this prevents the unit tests from failing
      if (clrModalEl === null) {
        return;
      }
      const targetIframeEl = <HTMLElement>clrModalEl.querySelector('iframe');
      const modalContentEl = <HTMLElement>clrModalEl.querySelector('.modal-content');
      const modalHeaderEl = <HTMLElement>clrModalEl.querySelector('.modal-header');
      const modalBodyEl = <HTMLElement>clrModalEl.querySelector('.modal-body');
      const modalDialogEl = <HTMLElement>clrModalEl.querySelector('.modal-dialog');

      if (modalHeaderEl !== null) {
        modalHeaderEl.parentNode.removeChild(modalHeaderEl);
      }

      this.renderer.setElementStyle(modalContentEl, 'overflow', 'hidden');
      this.renderer.setElementStyle(modalDialogEl, 'height', '75vh');
      this.renderer.setElementStyle(modalBodyEl, 'height', `${CONFIGURE_VCH_MODAL_HEIGHT}px`);
      this.renderer.setElementStyle(modalBodyEl, 'min-height', `${CONFIGURE_VCH_MODAL_HEIGHT}px`);
      this.renderer.setElementStyle(targetIframeEl, 'width', '100%');
      this.renderer.setElementStyle(targetIframeEl, 'height', '100%');
      this.renderer.setElementStyle(
        this.el.nativeElement.querySelector('.clr-wizard'),
        'height',
        '100vh'
      );
    });
  }

  /**
   * Close the H5 Client modal
   */
  onCancel() {
    const webPlatform = this.globalsService.getWebPlatform();
    webPlatform.closeDialog();
  }

  /**
   * TODO: Implement API PATCH request
   */
  onSave() {
    if (this.currentTab) {
      this.errorFlag = false;
      this.loading = true;
      this.currentTab.onCommit()
        .switchMap((payload: VchUi) => {
          const apiPayload = processPayloadFromUiToApi(payload);
          return this.configureVchService.patchVch(this.vchId, apiPayload);
        })
        .subscribe(
          (payload: VchApi) => {
            this.errorFlag = false;
            this.loading = false;
            this.onCancel();
          },
          (error: HttpErrorResponse) => {
            this.loading = false;
            this.errorFlag = true;
            this.errorMsgs = Array.isArray(error) ? error : [error.message];
          }
        )
    }
  }

  currentTabModelChanged(model: VchUiModelTypes) {
    this.currentTabModelPayload.next(model);
  }

  onTabFocus(currentTab: VchConfigureTabs) {
    this.currentTab = currentTab;
  }

  isCurrentTabInvalid(): boolean {
    return !this.currentTab || !this.currentTab.form || !this.currentTab.form.valid;
  }

}
