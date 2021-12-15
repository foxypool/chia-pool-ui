import {ApplicationRef, Injectable, OnDestroy} from '@angular/core';
import {SwUpdate} from '@angular/service-worker';
import {ToastService} from './toast.service';
import {SnippetService} from './snippet.service';
import {first} from 'rxjs/operators';
import {concat, interval, Subscription} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UpdateService implements OnDestroy {
  private subscriptions: Subscription[] = [
    this.swUpdate.available.subscribe(async () => {
      this.toastService.showInfoToast(this.snippetService.getSnippet('update-service.updating'), '', { timeOut: 2 * 1000 });
      await new Promise(resolve => setTimeout(resolve, 2 * 1000));
      await this.swUpdate.activateUpdate();
      document.location.reload();
    }),
    this.swUpdate.unrecoverable.subscribe(async () => {
      console.error('SW reached unrecoverable state, clearing cache and reloading ..');
      await this.clearCacheStorage();
      document.location.reload();
    }),
  ];

  constructor(
    private swUpdate: SwUpdate,
    private toastService: ToastService,
    private snippetService: SnippetService,
    appRef: ApplicationRef
  ) {
    if (!swUpdate.isEnabled) {
      return;
    }
    const appIsStable$ = appRef.isStable.pipe(first(isStable => isStable === true));
    const everySixHours$ = interval(6 * 60 * 60 * 1000);
    const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

    this.subscriptions.push(everySixHoursOnceAppIsStable$.subscribe(() => swUpdate.checkForUpdate()));
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe());
  }

  async clearCacheStorage(): Promise<boolean[][]> {
    const cacheKeys = await caches.keys();

    return Promise.all(
      cacheKeys
        .filter(cacheKey => /^(ngsw).*/.test(cacheKey))
        .map(async cacheKey => {
          const cache = await caches.open(cacheKey);
          const requests = await cache.keys();

          return Promise.all(requests.map(req => cache.delete(req)));
        })
    );
  }
}
