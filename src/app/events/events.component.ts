import {Component, OnDestroy, OnInit} from '@angular/core'
import {StatsService} from '../stats.service'
import {SnippetService} from '../snippet.service'
import * as moment from 'moment'
import {Subscription} from 'rxjs'
import {Event} from '../api/types/pool/pool-stats'

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit, OnDestroy {
  public EVENT_TYPE = {
    EXTRA_BLOCK_REWARD: 'extra-block-reward',
  }
  public EVENT_STATE = {
    UPCOMING: 'upcoming',
    ACTIVE: 'active',
    ENDED: 'ended',
  }
  public events: Event[] = []
  public ticker: string = ''

  private readonly subscriptions: Subscription[] = [
    this.statsService.poolStats$.subscribe(poolStats => this.events = poolStats.events),
    this.statsService.poolConfig$.subscribe(poolConfig => this.ticker = poolConfig.ticker),
  ]

  constructor(
    private readonly statsService: StatsService,
    private readonly _snippetService: SnippetService,
  ) {}

  public ngOnInit(): void {
    this.events = this.statsService.poolStats?.events ?? []
    this.ticker = this.statsService.poolConfig?.ticker ?? ''
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
  }

  get snippetService() {
    return this._snippetService
  }

  getEventProgress(event) {
    return event.payload.creditedCount / event.payload.totalCount * 100
  }

  getFormattedDate(date) {
    return moment(date).format('YYYY-MM-DD HH:mm')
  }
}
