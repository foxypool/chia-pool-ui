import { Component } from '@angular/core'
import {StatsService} from '../stats.service'
import {SnippetService} from '../snippet.service'
import * as moment from 'moment'
import {Notice} from '../api/types/pool/pool-config'

@Component({
  selector: 'app-notices',
  templateUrl: './notices.component.html',
  styleUrls: ['./notices.component.scss']
})
export class NoticesComponent  {
  constructor(
    private readonly statsService: StatsService,
    private readonly _snippetService: SnippetService,
  ) {}

  get snippetService() {
    return this._snippetService
  }

  get notices(): Notice[] {
    const poolConfig = this.statsService.poolConfig
    if (poolConfig === undefined) {
      return []
    }

    return poolConfig.notices.slice(0, 10)
  }

  getTranslatedNoticeText(notice) {
    return notice.text.en
  }

  getFormattedDate(date) {
    return moment(date).format('YYYY-MM-DD')
  }
}
