import {Component, EventEmitter, Input, Output} from '@angular/core';
import {VchUi, VchUiModelTypes} from '../interfaces/vch';
import {VchGeneralComponent} from '../shared/components/vch-general/vch-general.component';
import {VchComputeComponent} from '../shared/components/vch-compute/vch-compute.component';
import {Observable} from 'rxjs/Observable';

export type VchConfigureTabs = VchGeneralComponent | VchComputeComponent;

@Component({
  selector: 'vic-configure-tabs',
  templateUrl: './configure-tabs.component.html',
  styleUrls: ['./configure-tabs.component.scss']
})
export class ConfigureTabsComponent {

  @Input() model: VchUi;
  @Input() readOnly = false;

  @Output() currentTabModelChanged: EventEmitter<Observable<VchUi>> = new EventEmitter<Observable<VchUi>>();
  @Output() tabFocus: EventEmitter<VchConfigureTabs> = new EventEmitter();

  modelChange(model: Observable<VchUi>) {
    this.currentTabModelChanged.emit(model);
  }

  focusTab(tab: VchConfigureTabs) {
    this.tabFocus.emit(tab);
  }
}
