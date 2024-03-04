import {Component, OnDestroy, OnInit} from '@angular/core'
import {StatsService} from '../stats.service'
import {SnippetService} from '../snippet.service'
import {PoolsProvider, PoolType} from '../pools.provider'
import {BehaviorSubject, combineLatest, Subscription} from 'rxjs'
import {EChartsOption} from 'echarts'
import {compare} from 'compare-versions'
import {ClientVersion} from '../api/types/pool/client-version'
import {faCheck} from '@fortawesome/free-solid-svg-icons'
import {colors, Theme, ThemeProvider} from '../theme-provider'
import {
  chiaClient,
  Client, getClientForClientVersion,
  getGroupedClientForClientVersion,
  getVersionFromClientVersion,
} from '../clients/clients'

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnInit, OnDestroy {
  public readonly ClientVersionsChartMode = ClientVersionsChartMode
  public readonly clientVersionsChartOptions: EChartsOption
  public clientVersionsChartUpdateOptions: EChartsOption

  public get supportsCompressedPlots(): boolean {
    return this.poolsProvider.pool.type === PoolType.nft
  }

  public get availableLightFarmersHtml(): string {
    const lightFarmers = [{
      name: 'Foxy-Farmer',
      supports: 'OG & NFT uncompressed, Bladebit, Gigahorse and DrPlotter compressed plots',
      link: 'https://docs.foxypool.io/proof-of-spacetime/foxy-farmer/',
    }]
    if (this.poolsProvider.pool.type === PoolType.nft) {
      lightFarmers.push({
        name: 'Fast Farmer',
        supports: 'NFT uncompressed, Bladebit and Gigahorse compressed plots',
        link: 'https://docs.foxypool.io/proof-of-spacetime/fast-farmer/',
      })
    }

    return lightFarmers.map(lightFarmer => `<li><a href="${lightFarmer.link}" target="_blank">${lightFarmer.name}</a>: ${lightFarmer.supports}</li>`).join('')
  }

  public get chartTheme(): string {
    return this.themeProvider.isDarkTheme ? 'dark' : 'default'
  }

  protected readonly faCheck = faCheck

  private clientVersionsUpdateInterval?: ReturnType<typeof setInterval>
  private readonly clientVersions: BehaviorSubject<ClientVersion[]> = new BehaviorSubject<ClientVersion[]>([])
  private readonly clientVersionsChartModeSubject: BehaviorSubject<ClientVersionsChartMode> = new BehaviorSubject<ClientVersionsChartMode>(ClientVersionsChartMode.regular)

  private readonly subscriptions: Subscription[] = [
    combineLatest([
      this.clientVersions.asObservable(),
      this.clientVersionsChartModeSubject.asObservable(),
    ])
      .subscribe(([clientVersions, clientVersionsChartMode]) => {
        switch (clientVersionsChartMode) {
          case ClientVersionsChartMode.regular:
            this.clientVersionsChartUpdateOptions = this.makeRegularClientVersionsChartUpdateOptions(clientVersions)
            break
          case ClientVersionsChartMode.simplified:
            this.clientVersionsChartUpdateOptions = this.makeSimplifiedClientVersionsChartUpdateOptions(clientVersions)
            break
          case ClientVersionsChartMode.thirdPartyVersions:
            this.clientVersionsChartUpdateOptions = this.makeThirdPartyVersionsClientVersionsChartUpdateOptions(clientVersions)
            break
        }
    })
  ]

  constructor(
    public statsService: StatsService,
    private readonly _snippetService: SnippetService,
    private readonly poolsProvider: PoolsProvider,
    private readonly themeProvider: ThemeProvider,
  ) {
    this.clientVersionsChartOptions = {
      backgroundColor: 'rgba(0,0,0,0)',
      title: {
        text: 'Client Versions',
        left: 'center',
        top: 0,
        textStyle: {
          color: this.themeProvider.isDarkTheme ? colors.darkTheme.textColor : colors.lightTheme.textColor,
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {d}% ({c})',
        textStyle: {
          color: this.themeProvider.isDarkTheme ? colors.darkTheme.textColor : colors.lightTheme.textColor,
        },
        backgroundColor: this.themeProvider.isDarkTheme ? colors.darkTheme.tooltip.backgroundColor : colors.lightTheme.tooltip.backgroundColor,
        borderColor: 'transparent',
      },
      series: [{
        type: 'pie',
        radius : '60%',
        data: [],
        label: {
          color: this.themeProvider.isDarkTheme ? colors.darkTheme.textColor : colors.lightTheme.textColor,
        },
        labelLine: {
          lineStyle: {
            color: this.themeProvider.isDarkTheme ? colors.darkTheme.textColor : colors.lightTheme.textColor,
          },
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      }],
    }
    this.subscriptions.push(
      this.themeProvider.theme$.subscribe(theme => {
        const textColor = theme === Theme.dark ? colors.darkTheme.textColor : colors.lightTheme.textColor
        this.clientVersionsChartUpdateOptions = {
          ...(this.clientVersionsChartUpdateOptions || {}),
          title: {
            textStyle: {
              color: textColor,
            },
          },
          tooltip: {
            backgroundColor: theme === Theme.dark ? colors.darkTheme.tooltip.backgroundColor : colors.lightTheme.tooltip.backgroundColor,
            textStyle: {
              color: textColor,
            },
          },
        }
        if (this.clientVersionsChartUpdateOptions.series !== undefined) {
          this.clientVersionsChartUpdateOptions.series[0].label = {
            color: textColor,
          }
          this.clientVersionsChartUpdateOptions.series[0].labelLine = {
            lineStyle: {
              color: textColor,
            },
          }
        }
      })
    )
  }

  public ngOnInit() {
    this.clientVersionsUpdateInterval = setInterval(this.updateClientVersions.bind(this), 10 * 60 * 1000)
    void this.updateClientVersions()
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
    if (this.clientVersionsUpdateInterval !== undefined) {
      clearInterval(this.clientVersionsUpdateInterval)
    }
  }

  public get clientVersionsChartMode(): ClientVersionsChartMode {
    return this.clientVersionsChartModeSubject.getValue()
  }

  public set clientVersionsChartMode(chartMode: ClientVersionsChartMode) {
    this.clientVersionsChartModeSubject.next(chartMode)
  }

  private async updateClientVersions() {
    this.clientVersions.next(await this.statsService.getClientVersions())
  }

  private makeRegularClientVersionsChartUpdateOptions(clientVersions: ClientVersion[]): EChartsOption {
    const clientVersionWithCount = clientVersions.reduce((acc, clientVersion) => {
      let key: string = 'Unknown'
      const client = getGroupedClientForClientVersion(clientVersion)
      if (client !== undefined) {
        const version = getVersionFromClientVersion(client, clientVersion)
        if (client === chiaClient) {
          key = version
        } else {
          key = `${client.displayName} ${version}`
        }
      }
      let clientCount = acc.get(key) ?? 0
      clientCount += clientVersion.count
      acc.set(key, clientCount)

      return acc
    }, new Map<string, number>())
    const clientVersionSeries = Array.from(clientVersionWithCount).map(([key, value]) => ({ name: key, value }))
    clientVersionSeries.sort((lhs, rhs) => rhs.value - lhs.value)

    return {
      series: [{
        data: clientVersionSeries,
      }],
    }
  }

  private makeSimplifiedClientVersionsChartUpdateOptions(clientVersionInfos: ClientVersion[]): EChartsOption {
    const clientVersionWithCount = clientVersionInfos.reduce((acc, clientVersion) => {
      let category: SimplifiedChartCategory = SimplifiedChartCategory.unknown
      const client = getGroupedClientForClientVersion(clientVersion)
      if (client !== undefined) {
        const version = getVersionFromClientVersion(client, clientVersion)
        category = getSimplifiedChartCategoryFor(client, version)
      }
      const key = category.toString()
      let clientCount = acc.get(key) ?? 0
      clientCount += clientVersion.count
      acc.set(key, clientCount)

      return acc
    }, new Map<string, number>())
    const clientVersionSeries = Array.from(clientVersionWithCount).map(([key, value]) => ({ name: key, value }))
    clientVersionSeries.sort((lhs, rhs) => rhs.value - lhs.value)

    return {
      series: [{
        data: clientVersionSeries,
      }],
    }
  }

  private makeThirdPartyVersionsClientVersionsChartUpdateOptions(clientVersionInfos: ClientVersion[]): EChartsOption {
    const clientVersionWithCount = clientVersionInfos.reduce((acc, clientVersion) => {
      const client = getClientForClientVersion(clientVersion)
      const key = client?.displayName ?? 'Unknown'
      let clientCount = acc.get(key) ?? 0
      clientCount += clientVersion.count
      acc.set(key, clientCount)

      return acc
    }, new Map<string, number>())
    const clientVersionSeries = Array.from(clientVersionWithCount).map(([key, value]) => ({ name: key, value }))
    clientVersionSeries.sort((lhs, rhs) => rhs.value - lhs.value)

    return {
      series: [{
        data: clientVersionSeries,
      }],
    }
  }

  get snippetService(): SnippetService {
    return this._snippetService
  }

  get historicalTimeInHours() {
    if (this.statsService.poolConfig === undefined) {
      return 'N/A'
    }
    return Math.round(this.statsService.poolConfig.historicalTimeInMinutes / 60)
  }

  get docsGettingStartedUrl() {
    return `https://docs.foxypool.io/proof-of-spacetime/foxy-pool/pools/${this.poolsProvider.poolIdentifier}/getting-started/`
  }
}

enum ClientVersionsChartMode {
  simplified = 'simplified',
  regular = 'regular',
  thirdPartyVersions = 'thirdPartyVersions',
}

enum SimplifiedChartCategory {
  unknown = 'Unknown',
  current = 'Current',
  recent = 'Recent',
  outdated = 'Outdated',
  ancient = 'Ancient',
}

function getSimplifiedChartCategoryFor(client: Client<unknown>, version: string): SimplifiedChartCategory {
  if (client.versions.current !== undefined && compare(version, client.versions.current as string, '>=')) {
    return SimplifiedChartCategory.current
  } else if (client.versions.recent !== undefined && compare(version, client.versions.recent as string, '>=')) {
    return SimplifiedChartCategory.recent
  } else if (client.versions.outdated !== undefined && compare(version, client.versions.outdated as string, '>=')) {
    return SimplifiedChartCategory.outdated
  }

  return SimplifiedChartCategory.ancient
}
