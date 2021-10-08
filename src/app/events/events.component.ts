import { Component, OnInit } from '@angular/core';
import {StatsService} from '../stats.service';
import {SnippetService} from '../snippet.service';
import * as moment from 'moment';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {
  public EVENT_TYPE = {
    EXTRA_BLOCK_REWARD: 'extra-block-reward',
  };
  public EVENT_STATE = {
    UPCOMING: 'upcoming',
    ACTIVE: 'active',
    ENDED: 'ended',
  };
  public events = [];
  public ticker = '';

  constructor(
    private statsService: StatsService,
    private _snippetService: SnippetService,
  ) {}

  ngOnInit() {
    this.statsService.poolStats.asObservable().subscribe(poolStats => {
      this.events = poolStats.events;
    });
    this.statsService.poolConfig.asObservable().subscribe(poolConfig => {
      this.ticker = poolConfig.ticker;
    });
    const poolStats = this.statsService.poolStats.getValue();
    this.events = poolStats ? (poolStats.events || []) : [];
    const poolConfig = this.statsService.poolConfig.getValue();
    this.ticker = poolConfig ? (poolConfig.ticker || '') : '';
  }

  get snippetService() {
    return this._snippetService;
  }

  getEventProgress(event) {
    return event.payload.creditedCount / event.payload.totalCount * 100;
  }

  getFormattedDate(date) {
    return moment(date).format('YYYY-MM-DD HH:mm');
  }
}
