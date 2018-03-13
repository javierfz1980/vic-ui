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

import 'rxjs/add/observable/timer';
import 'rxjs/add/observable/zip';
import 'rxjs/add/operator/mergeAll';
import 'rxjs/add/operator/mergeMap';

import {
  VIC_APPLIANCE_PORT
} from '../shared/constants/index';
import { GlobalsService } from '../shared/index';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import {
  getServerInfoByVchObjRef, getServerServiceGuidFromObj
} from '../shared/utils/object-reference';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {VirtualContainerHost} from '../vch-view/vch.model';
import {CreateVchWizardService} from '../create-vch-wizard/create-vch-wizard.service';
import {VchApi, VchUi} from '../interfaces/vch';
import {Headers, RequestOptions} from '@angular/http';
import {processPayloadFromUiToApi} from '../shared/utils/vch/vch-utils';
import {ComputeResource} from '../interfaces/compute.resource';
import {ServerInfo} from '../shared/vSphereClientSdkTypes';

export interface ComputeResourceWithChilds {
  computeResource: ComputeResource;
  childComputeResources: ComputeResource[]
}

@Injectable()
export class ConfigureVchService {

  constructor(private httpClient: HttpClient,
              private createVchWizardService: CreateVchWizardService,
              private globalsService: GlobalsService) {}

  getVchInfo(vchIdStr: string): Observable<VchApi> {

    // --- HARCODED DATA --------------------------------------------------------------
    // const vch = 'urn:vmomi:VirtualMachine:vm-171:816c4bdf-dbeb-4087-ba84-6cee1da73098'};
    // const targetHostname = 'sc-rdops-vm03-dhcp-66-193.eng.vmware.com';
    // const targetThumbprint = '2D:03:4E:02:D6:1D:CE:7C:6D:68:E3:87:64:11:45:28:B9:56:0B:C4';
    // --------------------------------------------------------------------------------

    const vch = <VirtualContainerHost>{id: vchIdStr};
    return Observable.combineLatest(
        this.createVchWizardService.getVicApplianceIp(),
        this.createVchWizardService.acquireCloneTicket(vch.id.split(':')[4]))
      .switchMap(([serviceHost, cloneTicket]) => {
        const vchId = vch.id.split(':')[3];
        const servicePort = VIC_APPLIANCE_PORT;
        const vc = getServerInfoByVchObjRef(
          this.globalsService.getWebPlatform().getUserSession().serversInfo,
          vch
        );

        const targetHostname = vc ? vc.name : null;
        const targetThumbprint = vc ? vc.thumbprint : null;
        const url = `https://${serviceHost}:${servicePort}/container/target/${targetHostname}/vch/${vchId}?thumbprint=${targetThumbprint}`;
        const headers  = new HttpHeaders({
          'Content-Type': 'application/json',
          'X-VMWARE-TICKET': cloneTicket
        });

        return this.httpClient.get<VchApi>(url, { headers: headers })
      });
  }

  patchVch(vchIdStr: string, payload: VchApi): Observable<VchApi> {
    const vch = <VirtualContainerHost>{id: vchIdStr};
    return Observable.combineLatest(
      this.createVchWizardService.getVicApplianceIp(),
      this.createVchWizardService.acquireCloneTicket(vch.id.split(':')[4]))
      .switchMap(([serviceHost, cloneTicket]) => {
        const vchId = vch.id.split(':')[3];
        const servicePort = VIC_APPLIANCE_PORT;
        const vc = getServerInfoByVchObjRef(
          this.globalsService.getWebPlatform().getUserSession().serversInfo,
          vch
        );

        const targetHostname = vc ? vc.name : null;
        const targetThumbprint = vc ? vc.thumbprint : null;
        const url = `https://${serviceHost}:${servicePort}/container/target/${targetHostname}/vch/${vchId}?thumbprint=${targetThumbprint}`;
        const headers  = new HttpHeaders({
          'Content-Type': 'application/merge-patch+json',
          'X-VMWARE-TICKET': cloneTicket
        });

        return this.httpClient.patch<VchApi>(url, payload, {headers: headers})
      });
  }


  getHostsAndResourcePoolsFromComputeResource(computeResourceSources: ComputeResource[]):
    Observable<ComputeResourceWithChilds[]> {
      return Observable.from(computeResourceSources)
        .concatMap((cr: ComputeResource) => {
          if (!cr['hasChildren']) {
            return Observable.of(null);
          }
          return this.httpClient
            .get<ComputeResource[]>(`/ui/tree/children?nodeTypeId=${cr.nodeTypeId}&objRef=${cr.objRef}&treeId=DcHostsAndClustersTree`)
            .map((childComputeResources: ComputeResource[]) => ({computeResource: cr, childComputeResources: childComputeResources}))
        })
        .toArray();
  }

  loadComputeResourcePath(serverInfos: ServerInfo[], resourceId: string): Observable<string> {
    console.log('serverInfos: ', serverInfos);
    return Observable.from(serverInfos)
      .concatMap((serverInfo: ServerInfo) => {
        return this.createVchWizardService.getClustersList(serverInfo.serviceGuid)
          .switchMap((resources: ComputeResource[]) => {
            return this.getHostsAndResourcePoolsFromComputeResource(resources)
              .switchMap((clustersWithHostsAndRP: ComputeResourceWithChilds[]) => {
                const selectedComputeResourcePath: ComputeResourceWithChilds = clustersWithHostsAndRP
                  .find(clustersWithHostsAndRPItem =>
                    clustersWithHostsAndRPItem.childComputeResources
                      .some(computeResource => computeResource.objRef
                        .split(':')[3] === resourceId));
                const resourceName: string = selectedComputeResourcePath.computeResource.text;
                const resourceChildName: string = selectedComputeResourcePath.childComputeResources
                  .find(clustersWithHostsAndRPItem => clustersWithHostsAndRPItem.objRef
                    .split(':')[3] === resourceId).text;
                return this.createVchWizardService.getDatacenterForResource(selectedComputeResourcePath.computeResource.objRef)
                  .map(dc => `${serverInfo.name}/${dc['name']}/${resourceName}/${resourceChildName}`);
                // return `${serverInfo.name}/${resourceName}/${resourceChildName}`;
              })
          })
      })
      .catch(error => {
        console.error(`Resource with id: ${resourceId} was not found`);
        return Observable.of(resourceId)
      });
  }

}
