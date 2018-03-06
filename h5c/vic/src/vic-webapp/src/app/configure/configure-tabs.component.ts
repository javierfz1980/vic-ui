import {Component, EventEmitter, Input, Output} from '@angular/core';
import {VchUi, VchUiModelTypes} from '../interfaces/vch';

@Component({
  selector: 'vic-configure-tabs',
  templateUrl: './configure-tabs.component.html',
  styleUrls: ['./configure-tabs.component.scss']
})
export class ConfigureTabsComponent {

  @Input() model: VchUi;

  @Input() readOnly = false;

  @Output() modelChanged: EventEmitter<VchUiModelTypes> = new EventEmitter<VchUiModelTypes>();

  modelChange(model: VchUiModelTypes) {
    this.modelChanged.emit(model);
  }
}
