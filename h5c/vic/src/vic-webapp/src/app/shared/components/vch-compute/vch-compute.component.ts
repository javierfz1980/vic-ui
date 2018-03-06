import {Component, EventEmitter, Input, Output} from '@angular/core';
import {VchUiCompute, VchUiGeneral} from '../../../interfaces/vch';

@Component({
  selector: 'vic-vch-compute',
  templateUrl: './vch-compute.component.html'
})
export class VchComputeComponent {

  @Input() model: VchUiCompute;

  @Input() readOnly: boolean;

  // @Output() modelChanged: EventEmitter<VchUiGeneral> = new EventEmitter();

}
