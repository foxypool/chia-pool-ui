import {Component, OnDestroy, OnInit} from '@angular/core'
import {UpdateService} from './update.service'
import {SeoService} from './seo.service'
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router'
import {filter, map, mergeMap} from 'rxjs/operators'
import {StatsService} from './stats.service'
import {SnippetService} from './snippet.service'
import {PoolsProvider} from './pools.provider'
import {Subscription} from 'rxjs'
import {gitCommitHash} from '../environments/config'

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  private titlePrefix = null
  private poolName = 'Foxy-Pool'

  private readonly subscriptions: Subscription[] = []

  constructor(
    private readonly updateService: UpdateService,
    private readonly seoService: SeoService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly statsService: StatsService,
    private readonly snippetService: SnippetService,
    private readonly poolsProvider: PoolsProvider
  ) {
    this.poolName = `Foxy-Pool ${this.poolsProvider.coin}`
    this.updateTitle()
    this.seoService.updateMeta({ name: 'description', content: `${this.poolName}, a fair ${this.poolsProvider.coin} PoSt (Proof of space time) pool with low fees hosted in Europe. No registration required and easy to use.` })
    this.seoService.updateMeta({ name: 'keywords', content: `${this.poolsProvider.coin}, Pool, Foxy-Pool, PoSt, Proof of space time, Mining` })
    console.log(
      `Using %ccommit %c${gitCommitHash}`,
      'color: #44bba4',
      'color: #e7bb41',
    )
  }

  public ngOnInit(): void {
    this.subscriptions.push(this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map((route) => {
        while (route.firstChild) {
          route = route.firstChild
        }
        return route
      }),
      filter((route) => route.outlet === 'primary'),
      mergeMap((route) => route.data)
    ).subscribe((event) => {
      this.setTitlePrefix(event.titlePrefixSnippet)
      if (event.description) {
        this.seoService.updateMeta({ name: 'description', content: event.description })
      }
    }))
    this.subscriptions.push(this.statsService.poolConfig$.subscribe((poolConfig => {
      this.poolName = poolConfig.poolName ? poolConfig.poolName : `Foxy-Pool ${poolConfig.coin}`
      this.updateTitle()
      this.seoService.updateMeta({ name: 'description', content: `${this.poolName}, a fair ${poolConfig.coin} PoSt (Proof of space time) pool with low fees hosted in Europe. No registration required and easy to use.` })
      this.seoService.updateMeta({ name: 'keywords', content: `${poolConfig.coin}, Pool, Foxy-Pool, PoSt, Proof of space time, Mining` })
    })))
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
  }

  setTitlePrefix(titlePrefixSnippet) {
    this.titlePrefix = this.snippetService.getSnippet(`routing.title-prefix.${titlePrefixSnippet}`)
    this.updateTitle()
  }

  updateTitle() {
    if (this.titlePrefix && this.poolName) {
      this.seoService.updateTitle(`${this.titlePrefix} | ${this.poolName}`)
      return
    }
    if (this.poolName) {
      this.seoService.updateTitle(this.poolName)
    }
    if (this.titlePrefix) {
      this.seoService.updateTitle(this.titlePrefix)
    }
  }
}
