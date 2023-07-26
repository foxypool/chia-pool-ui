import {Component} from '@angular/core'
import {StatsService} from '../stats.service'
import {SnippetService} from '../snippet.service'
import * as moment from 'moment'
import {Observable} from 'rxjs'
import {Event, EventState, EventType} from '../api/types/pool/pool-stats'
import {map, shareReplay} from 'rxjs/operators'

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent {
  public events$: Observable<Event[]>

  protected readonly EventType = EventType
  protected readonly EventState = EventState

  constructor(
    public readonly statsService: StatsService,
    private readonly _snippetService: SnippetService,
  ) {
    this.events$ = this.statsService.poolStats$.pipe(map(stats => stats.events), shareReplay())
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
