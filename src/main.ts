import { enableProdMode } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'
import * as Sentry from '@sentry/angular-ivy'

import { AppModule } from './app/app.module'
import { environment } from './environments/environment'
import { gitCommitHash } from './environments/config'
import {Event, EventHint} from '@sentry/angular-ivy'

const ignoreErrors = [
  'Request failed with status code',
  'Network request failed',
  'NetworkError',
  'Network Error',
  'Request aborted',
  'Request failed',
  'timeout of 0ms exceeded',
  'jQuery is not defined',
  'Cannot redefine property: googletag',
  '.flat is not a function',
  'UCShellJava.sdkEventFire is not a function',
  'ChunkLoadError: Loading chunk',
]

Sentry.init({
  dsn: 'https://f1ed3ebc92ba45d99ebc558a547e362d@o236153.ingest.sentry.io/5906348',
  release: gitCommitHash || null,
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', 'https://api2.foxypool.io/api'],
      routingInstrumentation: Sentry.routingInstrumentation,
    }),
  ],
  tracesSampleRate: 0,
  allowUrls: ['foxypool.io'],
  ignoreErrors,
  beforeSend(event: Event, hint?: EventHint): PromiseLike<Event | null> | Event | null {
    const error = hint.originalException
    if (
      (error && typeof error === 'string' && ignoreErrors.some(snip => error.indexOf(snip) !== -1))
      || (error && error instanceof Error && error.message && ignoreErrors.some(snip => error.message.indexOf(snip) !== -1))
    ) {
      return null
    }

    return event
  }
})

if (environment.production) {
  enableProdMode()
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err))
