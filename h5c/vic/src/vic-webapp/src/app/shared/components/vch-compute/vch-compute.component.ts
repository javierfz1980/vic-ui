import {
  Component, EventEmitter, Input, OnDestroy, OnInit, Output, QueryList,
  ViewChildren
} from '@angular/core';
import {VchUiCompute} from '../../../interfaces/vch';
import {ComputeResource} from '../../../interfaces/compute.resource';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ServerInfo} from '../../vSphereClientSdkTypes';
import {flattenArray} from '../../utils/array-utils';
import {getNumericValidatorsArray, unlimitedPattern} from '../../utils/validators';
import {Observable} from 'rxjs/Observable';
import {CreateVchWizardService} from '../../../create-vch-wizard/create-vch-wizard.service';
import {getMorIdFromObjRef} from '../../utils/object-reference';
import {DC_CLUSTER} from '../../constants';
import {GlobalsService} from '../../globals.service';
import {ComputeResourceTreenodeComponent} from './compute-resource-treenode.component';
import {Subscription} from 'rxjs/Subscription';

const endpointMemoryDefaultValue = 2048;

@Component({
  selector: 'vic-vch-compute',
  templateUrl: './vch-compute.component.html',
  styleUrls: ['./vch-compute.component.scss']
})
export class VchComputeComponent implements OnInit, OnDestroy {

  @Input() model: VchUiCompute;
  @Input() readOnly: boolean;

  @Output() modelChanged: EventEmitter<VchUiCompute> = new EventEmitter();
  @Output() focus: EventEmitter<VchComputeComponent> = new EventEmitter();

  public form: FormGroup;
  public datacenter: any[] = [];
  public dcObj: ComputeResource;
  public serviceGuid: string;
  public clusters: any[] = [];
  public resources: any[] = [];
  public isTreeLoading = false;
  public inAdvancedMode = false;
  public resourceLimits: any = {
    cpu: { maxUsage: null, minUsage: null, unreservedForPool: null },
    memory: { maxUsage: null, minUsage: null, unreservedForPool: null }
  };
  public selectedObjectName: string;
  public selectedResourceObjRef: string;
  public serversInfo: ServerInfo[];
  private readonly initialModel: VchUiCompute = {
    cpuLimit: 'Unlimited',
    memoryLimit: 'Unlimited',
    cpuReservation: 1,
    cpuShares: 'Normal',
    memoryShares: 'Normal',
    memoryReservation: 1,
    endpointCpu: 1,
    endpointMemory: endpointMemoryDefaultValue,
    computeResource: ''
  };

  private _selectedComputeResource: string;
  private formValueChangesSubscription: Subscription;

  @ViewChildren(ComputeResourceTreenodeComponent)
  treenodeComponents: QueryList<ComputeResourceTreenodeComponent>;

  constructor(
    private formBuilder: FormBuilder,
    private createWzService: CreateVchWizardService,
    private globalsService: GlobalsService
  ) {}

  // TODO: add units selectors to compute fields

  ngOnInit() {
    if (!this.model) {
      this.model = this.initialModel;
    }

    this.serversInfo = this.globalsService
      .getWebPlatform()
      .getUserSession()
      .serversInfo;

    const obsArr = this.serversInfo
      .map(serverInfo => this.createWzService
        .getDatacenter(serverInfo.serviceGuid));

    Observable.zip(...obsArr)
      .subscribe(results => {
        this.datacenter = flattenArray(results);
      });

    this.initForm();
    this.focus.emit(this);
  }

  initForm() {
    // create a FormGroup instance
    this.form = this.formBuilder.group({
      cpuLimit: [this.model.cpuLimit || 'Unlimited',
        getNumericValidatorsArray(true)],
      memoryLimit: [this.model.memoryLimit || 'Unlimited',
        getNumericValidatorsArray(true)],
      cpuReservation: [this.model.cpuReservation || '1',
        getNumericValidatorsArray(false)],
      memoryReservation: [this.model.memoryReservation || '1',
        getNumericValidatorsArray(false)],
      endpointCpu: [this.model.endpointCpu || '1',
        getNumericValidatorsArray(false)],
      endpointMemory: [this.model.endpointMemory || endpointMemoryDefaultValue,
        getNumericValidatorsArray(false)],
      // TODO: make cpuShares and memoryShares required on advanced mode
      cpuShares: this.model.cpuShares || 'normal',
      memoryShares: this.model.memoryShares || 'normal'
    });

    this.modelChanged.emit(this.model);

    this.formValueChangesSubscription = this.form.valueChanges
      .takeWhile(() => this.form.valid)
      .subscribe(value =>  this.modelChanged.emit(this.form.value))
  }

  /**
   * Get the latest list of Hosts, VirtualApps and ResourcePools
   * @param {string} clusterValue
   */
  loadResources(clusterValue: string) {
    this.isTreeLoading = true;
    this.createWzService
      .getHostsAndResourcePools(clusterValue)
      .subscribe(resources => {
        this.resources = resources;
        this.isTreeLoading = false;
      });
  }

  /**
   * extract the datacenter moid from the object reference string
   *
   */
  getDataCenterId (dcObj: string) {
    const dcIds = dcObj.split(':');
    if (dcIds[2] === 'Datacenter') {
      // e.g: urn:vmomi:Datacenter:dc-test:00000000-0000-0000-0000-000000000000
      return dcIds[3];
    }
  }

  get dcId () {
    return getMorIdFromObjRef(this.dcObj.objRef);
  }

  /**
   * Set the compute resource selected by the user.
   * @param {obj: ComputeResource; parentClusterObj?: ComputeResource; datacenterObj: ComputeResource}
   */
  selectComputeResource(payload: {
    obj: ComputeResource | any;
    parentClusterObj?: ComputeResource | any;
    datacenterObj: ComputeResource | any
  }) {
    console.log('selectComputeResource: ', payload);
    const nodeTypeId = payload.obj.nodeTypeId;
    const isCluster = nodeTypeId === DC_CLUSTER;
    const resourceObj = payload.obj.objRef;
    const dcObj = payload.datacenterObj.objRef;
    this.dcObj = payload.datacenterObj;

    let computeResource = `/${this.dcObj.text}/host`;
    let resourceObjForResourceAllocations = resourceObj;

    if (isCluster) {
      computeResource = `${computeResource}/${payload.obj.text}`;
      resourceObjForResourceAllocations = payload.obj.aliases[0];
    } else {
      computeResource = payload.parentClusterObj ?
        `${computeResource}/${payload.parentClusterObj.text}/${payload.obj.text}` :
        `${computeResource}/${payload.obj.text}`;
    }

    this.selectedResourceObjRef = resourceObj;
    this.selectedObjectName = payload.obj.text;
    this._selectedComputeResource = computeResource;

    // set active class on the treenodecomponent whose datacenter object reference is
    // the same as datacenterObj.objRef
    if (this.treenodeComponents) {
      this.treenodeComponents
        .filter(component => component.datacenter.objRef !== dcObj)
        .forEach(component => {
          component.unselectComputeResource();
        });
    }

    // update resource limit & reservation info
    this.createWzService.getResourceAllocationsInfo(resourceObjForResourceAllocations, isCluster)
      .subscribe(response => {
        const cpu = response['cpu'];
        const memory = response['memory'];
        this.resourceLimits = response;

        // set max limit validator for cpu maxUsage
        this.form.get('cpuLimit').setValidators([
          ...getNumericValidatorsArray(true),
          Validators.max(cpu['maxUsage'])
        ]);

        // set max limit validator for memory maxUsage
        this.form.get('memoryLimit').setValidators([
          ...getNumericValidatorsArray(true),
          Validators.max(memory['maxUsage'])
        ]);

        if (this.inAdvancedMode) {
          // set max limit validator for endpointMemory
          this.form.get('endpointMemory').setValidators([
            ...getNumericValidatorsArray(false),
            Validators.max(memory['maxUsage'])
          ]);

          // set max limit validator for cpu unreservedForPool
          this.form.get('cpuReservation').setValidators([
            ...getNumericValidatorsArray(false),
            Validators.max(cpu['unreservedForPool'])
          ]);

          // set max limit validator for memory unreservedForPool
          this.form.get('memoryReservation').setValidators([
            ...getNumericValidatorsArray(false),
            Validators.max(memory['unreservedForPool'])
          ]);

          // This prevents the next button from getting disabled when the user selects a host or cluster that has less RAM
          // available for VM endpoint than the default value. As a solution, we set the smaller value between the default
          // value and memory['maxUsage']
          this.form.get('endpointMemory').setValue(Math.min(memory['maxUsage'], endpointMemoryDefaultValue) + '');
        } else {
          this.form.get('endpointMemory').setValidators([]);
          this.form.get('cpuReservation').setValidators([]);
          this.form.get('memoryReservation').setValidators([]);
        }

        this.form.get('cpuLimit').updateValueAndValidity();
        this.form.get('memoryLimit').updateValueAndValidity();
        this.form.get('endpointMemory').updateValueAndValidity();
        this.form.get('cpuReservation').updateValueAndValidity();
        this.form.get('memoryReservation').updateValueAndValidity();
      });
  }

  get selectedComputeResource() {
    return this._selectedComputeResource;
  }

  onPageLoad() {
    // if compute resource is already selected return here
    if (this.selectedComputeResource) {
      return;
    }
  }

  onCommit(): Observable<any> {
    const errs: string[] = [];
    let formErrors = null;
    const results: any = {};

    if (!this.selectedComputeResource) {
      errs.push('Please choose a valid compute resource');
      formErrors = { invalidComputeResource: true };
    }

    this.form.setErrors(formErrors);

    if (this.form.invalid) {
      return Observable.throw(errs);
    } else {
      const cpuLimitValue = this.form.get('cpuLimit').value;
      const memoryLimitValue = this.form.get('memoryLimit').value;

      results['computeResource'] = this.selectedComputeResource;
      results['cpu'] = unlimitedPattern.test(cpuLimitValue) ? '0' : cpuLimitValue;
      results['memory'] = unlimitedPattern.test(memoryLimitValue) ? '0' : memoryLimitValue;
      if (this.inAdvancedMode) {
        results['cpuReservation'] = this.form.get('cpuReservation').value;
        results['cpuShares'] = this.form.get('cpuShares').value;
        results['memoryReservation'] = this.form.get('memoryReservation').value;
        results['memoryShares'] = this.form.get('memoryShares').value;
        results['endpointCpu'] = this.form.get('endpointCpu').value;
        results['endpointMemory'] = this.form.get('endpointMemory').value;
      }
      return Observable.of({ computeCapacity: results });
    }
  }

  toggleAdvancedMode() {
    this.inAdvancedMode = !this.inAdvancedMode;
  }

  getDcs (serverInfo: ServerInfo): ComputeResource[] {
    return this.datacenter.filter((item: ComputeResource) => item.objRef.indexOf(serverInfo.serviceGuid) > -1);
  }

  ngOnDestroy() {
    this.formValueChangesSubscription.unsubscribe();
  }

}