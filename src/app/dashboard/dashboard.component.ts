import {Component} from '@angular/core'
import {StatsService} from '../stats.service'
import {SnippetService} from '../snippet.service'

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
}
