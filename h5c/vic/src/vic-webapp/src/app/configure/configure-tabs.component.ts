import {Component, EventEmitter, Input, Output} from '@angular/core';
import {VchUi, VchUiModelTypes} from '../interfaces/vch';
import {VchGeneralComponent} from '../shared/components/vch-general/vch-general.component';
import {VchComputeComponent} from '../shared/components/vch-compute/vch-compute.component';

export type Tabs = VchGeneralComponent | VchComputeComponent;

@Component({
  selector: 'vic-configure-tabs',
  templateUrl: './configure-tabs.component.html',
  styleUrls: ['./configure-tabs.component.scss']
})
export class ConfigureTabsComponent {

  @Input() model: VchUi;
  @Input() readOnly = false;

  @Output() modelChanged: EventEmitter<VchUiModelTypes> = new EventEmitter<VchUiModelTypes>();
  // @Output() focus: EventEmitter<VchUiModelKeys> = new EventEmitter();

  public currentTab: Tabs;

  modelChange(model: VchUiModelTypes) {
    this.modelChanged.emit(model);
  }

  focusTab(tab: Tabs) {
    this.currentTab = tab;
  }
}
