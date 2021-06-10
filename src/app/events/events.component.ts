import { Component, OnInit } from '@angular/core';
import {StatsService} from "../stats.service";
import {SnippetService} from "../snippet.service";
import * as moment from "moment";

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {

  constructor(
    private statsService: StatsService,
    private _snippetService: SnippetService,
  ) { }

  ngOnInit() {
  }

  get snippetService() {
    return this._snippetService;
  }

  getEventProgress(event) {
    return event.payload.creditedCount / event.payload.totalCount * 100;
  }

  get events() {
    const poolStats = this.statsService.poolStatsSubject.getValue();
    if (!poolStats || !poolStats.events) {
      return [];
    }

    return poolStats.events;
  }

  get coin() {
    const poolConfig = this.statsService.poolConfigSubject.getValue();
    if (!poolConfig || !poolConfig.coin) {
      return '';
    }

    return poolConfig.coin;
  }

  getFormattedDate(date) {
    return moment(date).format('YYYY-MM-DD HH:mm');
  }
}
