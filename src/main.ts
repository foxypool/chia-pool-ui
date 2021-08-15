import { enableProdMode } from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import * as Sentry from '@sentry/angular';
import { Integrations } from '@sentry/tracing';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import { gitCommitHash } from './environments/config';
import {Event, EventHint} from '@sentry/angular';

Sentry.init({
  dsn: 'https://f1ed3ebc92ba45d99ebc558a547e362d@o236153.ingest.sentry.io/5906348',
  release: gitCommitHash || null,
  integrations: [
    new Integrations.BrowserTracing({
      tracingOrigins: ['localhost', 'https://api2.foxypool.io/api'],
      routingInstrumentation: Sentry.routingInstrumentation,
    }),
  ],
  tracesSampleRate: 0,
  allowUrls: ['foxypool.io'],
  ignoreErrors: [
    'Request failed with status code',
    'Network request failed',
    'NetworkError',
    'Network Error',
    'Request aborted',
    'Request failed',
  ],
  beforeSend(event: Event, hint?: EventHint): PromiseLike<Event | null> | Event | null {
    const error = hint.originalException;
    if (
      (error && typeof error === 'string' && error.indexOf('Request failed') !== -1)
      || (error && error instanceof Error && error.message && error.message.indexOf('Request failed') !== -1)
    ) {
      return null;
    }

    return event;
  }
});

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
