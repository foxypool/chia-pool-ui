import {ApplicationRef, Injectable} from "@angular/core";
import {SwUpdate} from "@angular/service-worker";
import {ToastService} from "./toast.service";
import {SnippetService} from "./snippet.service";
import {first} from 'rxjs/operators';
import {concat, interval} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  constructor(
    swUpdate: SwUpdate,
    toastService: ToastService,
    snippetService: SnippetService,
    appRef: ApplicationRef
  ) {
    if (!swUpdate.isEnabled) {
      return;
    }
    swUpdate.available.subscribe(async () => {
      toastService.showInfoToast(snippetService.getSnippet('update-service.updating'), '', { timeOut: 2 * 1000 });
      await new Promise(resolve => setTimeout(resolve, 2 * 1000));
      await swUpdate.activateUpdate();
      document.location.reload();
    });
    swUpdate.unrecoverable.subscribe(async () => {
      console.error('SW reached unrecoverable state, clearing cache and reloading ..');
      await this.clearCacheStorage();
      document.location.reload();
    });
    const appIsStable$ = appRef.isStable.pipe(first(isStable => isStable === true));
    const everySixHours$ = interval(6 * 60 * 60 * 1000);
    const everySixHoursOnceAppIsStable$ = concat(appIsStable$, everySixHours$);

    everySixHoursOnceAppIsStable$.subscribe(() => swUpdate.checkForUpdate());
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
