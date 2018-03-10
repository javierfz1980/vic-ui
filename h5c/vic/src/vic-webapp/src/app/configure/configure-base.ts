import {VchApi, VchUi} from '../interfaces/vch';

export abstract class ConfigureBase {

  mapApiDatatoUiData (vch: VchApi): VchUi {
    console.log('configure view VchApi: ', vch);
    const uiModel: VchUi = {
      general: {
        name: vch.name,
        containerNameConvention: vch.container.name_convention || '',
        debug: vch.debug,
        syslogAddress: vch.syslog_addr || ''
      },
      computeCapacity: {
        cpuLimit: vch.compute.cpu.limit ? vch.compute.cpu.limit.value : null,
        memoryLimit: vch.compute.memory.limit ? vch.compute.memory.limit.value : null,
        cpuReservation: vch.compute.cpu.reservation ? vch.compute.cpu.reservation.value : null,
        cpuShares: vch.compute.cpu.shares.level,
        memoryShares: vch.compute.memory.shares.level,
        memoryReservation: vch.compute.memory.reservation ? vch.compute.memory.reservation.value : null,
        endpointCpu: vch.endpoint.cpu.sockets,
        endpointMemory: vch.endpoint.memory.value,
        computeResource: vch.compute.resource.id
      }
    };
    console.log('configure view VchUi: ', uiModel);
    return uiModel;
  }

}
