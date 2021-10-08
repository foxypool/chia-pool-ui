import {Component, OnInit} from '@angular/core';
import {UpdateService} from './update.service';
import {SeoService} from './seo.service';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {filter, map, mergeMap} from 'rxjs/operators';
import {StatsService} from './stats.service';
import {SnippetService} from './snippet.service';
import {PoolsProvider} from './pools.provider';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  private titlePrefix = null;
  private poolName = 'Foxy-Pool';

  constructor(
    private updateService: UpdateService,
    private seoService: SeoService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private statsService: StatsService,
    private snippetService: SnippetService,
    private poolsProvider: PoolsProvider
  ) {
    this.poolName = `Foxy-Pool ${this.poolsProvider.coin}`;
    this.updateTitle();
    this.seoService.updateMeta({ name: 'description', content: `${this.poolName}, a fair ${this.poolsProvider.coin} PoSt (Proof of space time) pool with low fees hosted in Europe. No registration required and easy to use.` });
    this.seoService.updateMeta({ name: 'keywords', content: `${this.poolsProvider.coin}, Pool, Foxy-Pool, PoSt, Proof of space time, Mining` });
  }

  ngOnInit(): void {
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map((route) => {
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route;
      }),
      filter((route) => route.outlet === 'primary'),
      mergeMap((route) => route.data)
    ).subscribe((event) => {
      this.setTitlePrefix(event.titlePrefixSnippet);
      if (event.description) {
        this.seoService.updateMeta({ name: 'description', content: event.description });
      }
    });
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => {
      if (!poolConfig.coin) {
        return;
      }
      this.poolName = poolConfig.poolName ? poolConfig.poolName : `Foxy-Pool ${poolConfig.coin}`;
      this.updateTitle();
      this.seoService.updateMeta({ name: 'description', content: `${this.poolName}, a fair ${poolConfig.coin} PoSt (Proof of space time) pool with low fees hosted in Europe. No registration required and easy to use.` });
      this.seoService.updateMeta({ name: 'keywords', content: `${poolConfig.coin}, Pool, Foxy-Pool, PoSt, Proof of space time, Mining` });
    }));
  }

  setTitlePrefix(titlePrefixSnippet) {
    this.titlePrefix = this.snippetService.getSnippet(`routing.title-prefix.${titlePrefixSnippet}`);
    this.updateTitle();
  }

  updateTitle() {
    if (this.titlePrefix && this.poolName) {
      this.seoService.updateTitle(`${this.titlePrefix} | ${this.poolName}`);
      return;
    }
    if (this.poolName) {
      this.seoService.updateTitle(this.poolName);
    }
    if (this.titlePrefix) {
      this.seoService.updateTitle(this.titlePrefix);
    }
  }
}
