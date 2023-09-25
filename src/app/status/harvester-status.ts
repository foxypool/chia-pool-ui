import {ChiaService, HarvesterStats} from '../integrations/chia-dashboard-api/types/satellite'
import {
  LastUpdatedState,
  makeDotColorClassForLastUpdatedState,
  makeLastUpdatedStateFromLastUpdate
} from './last-updated-state'
import * as moment from 'moment'

export class HarvesterStatus {
  public static fromHarvesterStats(stats: ChiaService<HarvesterStats>): HarvesterStatus {
    return new HarvesterStatus(stats)
  }

  public get lastUpdatedState(): LastUpdatedState {
    return makeLastUpdatedStateFromLastUpdate(this.service.lastUpdate)
  }

  public get relativeLastUpdated(): string {
    return moment(this.service.lastUpdate).fromNow()
  }

  public get dotColorClass(): string {
    return makeDotColorClassForLastUpdatedState(this.lastUpdatedState)
  }

  public get statusTooltip(): string {
    if (this.lastUpdatedState !== LastUpdatedState.ok) {
      return 'Chia-Dashboard did not receive any updates from this harvester in a while'
    }
    if (this.service.stats.farmerConnectionsCount > 0) {
      return 'Connected to at least one farmer'
    }

    return 'Disconnected from all farmers'
  }

  private constructor(private readonly service: ChiaService<HarvesterStats>) {}

  public toString(): string {
    if (this.lastUpdatedState !== LastUpdatedState.ok) {
      return 'Unknown'
    }
    if (this.service.stats.farmerConnectionsCount > 0) {
      return 'Connected'
    }

    return 'Disconnected'
  }
}
