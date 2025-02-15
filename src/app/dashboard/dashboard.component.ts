import { Component } from '@angular/core'
import {StatsService} from '../stats.service'
import {SnippetService} from '../snippet.service'
import * as moment from 'moment'
import {Notice} from '../api/types/pool/pool-config'

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent  {

  constructor(
    private readonly statsService: StatsService,
    private readonly _snippetService: SnippetService,
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

  public get hasNotices(): boolean {
    return this.noticesInTheLastWeekOrLess.length > 0
  }

  public getTranslatedNoticeText(notice: Notice): string {
    return notice.text.en
  }

  getFormattedDate(date) {
    return moment(date).format('YYYY-MM-DD')
  }
}
