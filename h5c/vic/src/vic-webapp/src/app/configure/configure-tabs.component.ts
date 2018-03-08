import {Component, EventEmitter, Input, Output} from '@angular/core';
import {VchUi, VchUiModelTypes} from '../interfaces/vch';
import {VchGeneralComponent} from '../shared/components/vch-general/vch-general.component';
import {VchComputeComponent} from '../shared/components/vch-compute/vch-compute.component';

export type VchConfigureTabs = VchGeneralComponent | VchComputeComponent;

@Component({
  selector: 'vic-configure-tabs',
  templateUrl: './configure-tabs.component.html',
  styleUrls: ['./configure-tabs.component.scss']
})
export class ConfigureTabsComponent {

  @Input() model: VchUi;
  @Input() readOnly = false;

  @Output() modelChanged: EventEmitter<VchUiModelTypes> = new EventEmitter<VchUiModelTypes>();
  @Output() tabFocus: EventEmitter<VchConfigureTabs> = new EventEmitter();

  modelChange(model: VchUiModelTypes) {
    this.modelChanged.emit(model);
  }

  focusTab(tab: VchConfigureTabs) {
    this.tabFocus.emit(tab);
  }
}
