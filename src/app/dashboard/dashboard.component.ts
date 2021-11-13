import { Component } from '@angular/core';
import {StatsService} from '../stats.service';
import {SnippetService} from '../snippet.service';
import * as moment from 'moment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent  {

  constructor(
    private statsService: StatsService,
    private _snippetService: SnippetService,
  ) {}

  get snippetService() {
    return this._snippetService;
  }

  get notices() {
    const poolConfig = this.statsService.poolConfig.getValue();
    if (!poolConfig || !poolConfig.notices) {
      return [];
    }

    return poolConfig.notices.slice(0, 10);
  }

  get noticesInTheLast3DaysOrLess() {
    return this.notices.filter(notice => moment(notice.date).isAfter(moment().subtract(3, 'days')));
  }

  get hasNotices() {
    return this.noticesInTheLast3DaysOrLess.length > 0;
  }

  getTranslatedNoticeText(notice) {
    return notice.text.en;
  }

  getFormattedDate(date) {
    return moment(date).format('YYYY-MM-DD');
  }

}
