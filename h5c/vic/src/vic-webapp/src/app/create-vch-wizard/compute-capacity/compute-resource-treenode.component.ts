/*
 Copyright 2017 VMware, Inc. All Rights Reserved.

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
import {
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  ViewChildren,
  QueryList,
  ElementRef,
  Renderer
} from '@angular/core';

import { CreateVchWizardService } from '../create-vch-wizard.service';
import { Observable } from 'rxjs/Observable';
import { GlobalsService } from '../../shared';
import { ComputeResource } from '../../interfaces/compute.resource';
import { ServerInfo } from '../../shared/vSphereClientSdkTypes';
import { COMPUTE_RESOURCE_NODE_TYPES } from '../../shared/constants';
import {isDesiredType} from '../../shared/utils/object-reference';

/**
 * Component that renders a tree view of the inventory items on the selected Datacenter
 * where Clusters, ClusterHostSystems and sstandalone hosts are displayed and selectable
 */

@Component({
  selector: 'vic-compute-resource-treenode',
  styleUrls: ['./compute-capacity.scss'],
  templateUrl: './compute-resource-treenode.template.html'
})
export class ComputeResourceTreenodeComponent implements OnInit {

  public readonly CR_TYPES = COMPUTE_RESOURCE_NODE_TYPES;

  public loading = true;
  public selectedResourceObj: ComputeResource;
  public tree: {childrens: ComputeResource[]};
  public resourcesTree: Observable<{childrens: ComputeResource[]}>;
  public datacenter: ComputeResource;
  public currentPath: string[] = [];
  @Input() serverInfo: ServerInfo;
  @Output() resourceSelected: EventEmitter<ComputeResource>;

  @ViewChildren('btnEl') computeResourceBtns: QueryList<any>;

  constructor(
    private createWzService: CreateVchWizardService,
    private renderer: Renderer,
    private globalsService: GlobalsService
  ) {
    this.resourceSelected = new EventEmitter<ComputeResource>();
  }

  ngOnInit() {
    this.resourcesTree = this.createWzService
      .getDatacenter(this.serverInfo.serviceGuid)
      .switchMap(dcs => {
        const obsArr = dcs.map((dc: ComputeResource) => {
          return this.createWzService
            .getResourcesTree(dc)
            .map((childrens: ComputeResource[]) => {
              dc.childrens = childrens;
              return dc;
            })
        });
        return Observable.zip(...obsArr);
      })
      .map((resourcesTree: ComputeResource[]) => {
        this.tree = {childrens: resourcesTree};
        return {childrens: resourcesTree};
      })

  }

  selectResource(event: Event, obj: ComputeResource) {
    // TODO: https://github.com/vmware/vic/pull/8048
    // we also should allow type 'StandaloneHostResPool' when the API to fetch the list of  VCH's  Pool Resources is ready.
    // By now we are filtering Pool Resources.
    //
    if (this.isAllowedType(obj)) {
      this.currentPath = [];
      this.buildPathForResource(obj.objRef, this.tree.childrens);
      obj.resourcePath = this.currentPath.reverse().join('/');
      this.selectedResourceObj = obj;
      this.datacenter = obj.datacenter;
      this.resourceSelected.emit(obj);

      this.unselectComputeResource();
      this.renderer.setElementClass(event.target, 'active', true);
    }
  }

  unselectComputeResource() {
    this.computeResourceBtns.forEach((elRef: ElementRef) => {
      this.renderer.setElementClass(elRef.nativeElement, 'active', false);
    })
  }

  private isAllowedType(obj: ComputeResource): boolean {
    // is Cluster or standalone Host or non vic Resource Pool
    return isDesiredType(obj.nodeTypeId, [
      this.CR_TYPES.cluster.dc_cluster,
      this.CR_TYPES.cluster.folder_cluster,
      this.CR_TYPES.host.dc_stand_alone,
      this.CR_TYPES.resource_pool.host_resource_pool,
      this.CR_TYPES.resource_pool.resource_pool,
      this.CR_TYPES.resource_pool.cluster_resource_pool,
      this.CR_TYPES.resource_pool.resource_pool_resource_pool
    ]);
  }

  private buildPathForResource(ref: string, tree: ComputeResource[]) {
    let resource: ComputeResource = tree.find(child => child.objRef === ref);
    if (!resource) {
      tree.forEach(child => this.buildPathForResource(ref, child.childrens));
    } else {
      this.currentPath.push(resource.text);
      if (resource.parentResource) {
        this.buildPathForResource(resource.parentResource.objRef, this.tree.childrens);
      }
    }

  }
}
