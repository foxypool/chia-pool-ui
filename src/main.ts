import { enableProdMode } from '@angular/core'
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic'
import * as Sentry from '@sentry/angular-ivy'
import './extensions/extensions'

import { AppModule } from './app/app.module'
import { environment } from './environments/environment'
import { gitCommitHash } from './environments/config'
import {BrowserTracing, Event, EventHint, Replay} from '@sentry/angular-ivy'

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
  'undefined is not an object (evaluating \'a.P\')',
  'undefined is not an object (evaluating \'a.fa\')',
  'Cannot read properties of undefined (reading \'firefoxSample\')',
  'Can\'t find variable: msDiscoverChatAvailable',
  'SecurityError: Failed to read the \'localStorage\'',
  'chrome-extension://',
]

Sentry.init({
  dsn: 'https://37abd9100b744f01a9b38464c91c28e3@o236153.ingest.sentry.io/4505596429860864',
  release: gitCommitHash || null,
  tracePropagationTargets: ['localhost', 'https://api.foxypool.io/api'],
  integrations: [
    new BrowserTracing({
      routingInstrumentation: Sentry.routingInstrumentation,
    }),
    new Replay({
      networkDetailAllowUrls: ['https://api.foxypool.io', 'https://oracle.foxypool.io'],
    }),
  ],
  // Performance Monitoring
  tracesSampleRate: 0.05,
  // Session Replay
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,
  allowUrls: ['foxypool.io'],
  denyUrls: [
    /extensions\//i,
    /^chrome:\/\//i,
    /^chrome-extension:\/\//i,
  ],
  ignoreErrors,
  beforeSend(event: Event, hint?: EventHint): PromiseLike<Event | null> | Event | null {
    const error = hint.originalException
    if (!error) {
      return event
    }
    if (typeof error === 'string' && ignoreErrors.some(snip => error.indexOf(snip) !== -1)) {
      return null
    }
    if (error instanceof Error) {
      if (error.message && ignoreErrors.some(snip => error.message.indexOf(snip) !== -1)) {
        return null
      }
      if (error.stack && ignoreErrors.some(snip => error.stack.indexOf(snip) !== -1)) {
        return null
      }
    }

    return event
  }
})

if (environment.production) {
  enableProdMode()
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err))
