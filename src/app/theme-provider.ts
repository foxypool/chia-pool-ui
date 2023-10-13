import {Injectable, OnDestroy} from '@angular/core'
import {BehaviorSubject, Observable, Subscription} from 'rxjs'
import {distinctUntilChanged, skip} from 'rxjs/operators'
import {LocalStorageService} from './local-storage.service'

export enum Theme {
  light = 'light',
  dark = 'dark',
}

export const colors = {
  darkTheme: {
    textColor: '#cfd0d1',
    tooltip: {
      backgroundColor: '#212326',
    },
    partialsChartColor: '#46e8eb',
    proofTimesColor: '#c6d8d3',
  },
  lightTheme: {
    textColor: '#000',
    tooltip: {
      backgroundColor: '#fff',
    },
    partialsChartColor: '#236263',
    proofTimesColor: '#859993',
  },
}

@Injectable({
  providedIn: 'root'
})
export class ThemeProvider implements OnDestroy {
  public readonly theme$: Observable<Theme>

  public get isDarkTheme(): boolean {
    return this.theme === Theme.dark
  }

  public get theme(): Theme {
    return this.themeSubject.getValue()
  }

  private get persistedTheme(): Theme|undefined {
    const persistedThemeRaw = this.localStorageService.getItem('selected-theme') ?? undefined

    return Theme[persistedThemeRaw]
  }

  private readonly themeSubject: BehaviorSubject<Theme> = new BehaviorSubject<Theme>(this.persistedTheme ?? getPreferredTheme())
  private readonly subscriptions: Subscription[] = []

  public constructor(
    private readonly localStorageService: LocalStorageService,
  ) {
    this.theme$ = this.themeSubject.pipe(distinctUntilChanged())
    // this.themeSubject.next(Theme.light)
    this.subscriptions.push(
      this.theme$.subscribe(theme => {
        if (theme === Theme.dark) {
          document.body.classList.add('dark-theme')
        } else {
          document.body.classList.remove('dark-theme')
        }
      }),
      this.theme$.pipe(skip(1)).subscribe(theme => {
        this.localStorageService.setItem('selected-theme', theme)
      }),
    )
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
  }

  public toggle() {
    const theme = this.theme
    const nextTheme = theme === Theme.dark ? Theme.light : Theme.dark
    this.themeSubject.next(nextTheme)
  }
}

function getPreferredTheme(): Theme {
  const devicePrefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)')
  if (devicePrefersDarkTheme.matches) {
    return Theme.dark
  }

  const devicePrefersLightTheme = window.matchMedia('(prefers-color-scheme: light)')
  if (devicePrefersLightTheme.matches) {
    return Theme.light
  }

  return Theme.dark
}
