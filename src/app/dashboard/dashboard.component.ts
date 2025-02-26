import { Component } from '@angular/core'
import {StatsService} from '../stats.service'
import {SnippetService} from '../snippet.service'
import * as moment from 'moment'
import {Notice} from '../api/types/pool/pool-config'
import {PoolsProvider} from '../pools.provider'

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent  {

  constructor(
    private readonly statsService: StatsService,
    private readonly _snippetService: SnippetService,
    private readonly poolsProvider: PoolsProvider,
  ) {}

  get snippetService() {
    return this._snippetService
  }

  private get notices(): Notice[] {
    const poolConfig = this.statsService.poolConfig
    if (poolConfig === undefined) {
      return []
    }

    return poolConfig.notices.slice(0, 10)
  }

  public get noticesInTheLastWeekOrLess(): Notice[] {
    return this.notices.filter(notice => moment(notice.date).isAfter(moment().subtract(1, 'week')))
  }

  public get showNotices(): boolean {
    return false
  }

  get downloadUrl(): string {
    return this.poolsProvider.pool.downloadUrl
  }
}
