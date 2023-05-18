import {Component, OnDestroy, OnInit} from '@angular/core'
import {StatsService} from '../stats.service'
import {SnippetService} from '../snippet.service'
import {PoolsProvider} from '../pools.provider'
import {BehaviorSubject, combineLatest, Subscription} from 'rxjs'
import {EChartsOption} from 'echarts'
import {ClientVersion} from '../api.service'
import {compare} from 'compare-versions'
import {clientVersions} from '../client-versions'

@Component({
  selector: 'app-info',
  templateUrl: './info.component.html',
  styleUrls: ['./info.component.scss']
})
export class InfoComponent implements OnInit, OnDestroy {
  public readonly ClientVersionsChartMode = ClientVersionsChartMode
  public readonly clientVersionsChartOptions: EChartsOption
  public clientVersionsChartUpdateOptions: EChartsOption

  private _poolConfig:any = {}
  private clientVersionsUpdateInterval?: ReturnType<typeof setInterval>
  private readonly clientVersions: BehaviorSubject<ClientVersion[]> = new BehaviorSubject<ClientVersion[]>([])
  private readonly clientVersionsChartModeSubject: BehaviorSubject<ClientVersionsChartMode> = new BehaviorSubject<ClientVersionsChartMode>(ClientVersionsChartMode.regular)

  private readonly subscriptions: Subscription[] = [
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig)),
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
  ) {
    this.clientVersionsChartOptions = {
      title: {
        text: 'Client Versions',
        left: 'center',
        top: 0,
        textStyle: {
          color: '#cfd0d1'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {d}% ({c})',
        textStyle: {
          color: '#cfd0d1',
        },
        backgroundColor: '#212326',
        borderColor: 'transparent',
      },
      series: [{
        type: 'pie',
        radius : '60%',
        data: [],
        label: {
          color: '#cfd0d1',
        },
        labelLine: {
          lineStyle: {
            color: '#cfd0d1',
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
      const key = clientVersion.clientName.indexOf('Chia') === -1 ? 'Unknown' : clientVersion.clientVersion
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
      let key: string
      if (clientVersion.clientName.indexOf('Chia') === -1) {
        key = 'Unknown'
      } else if (compare(clientVersion.clientVersion, clientVersions.chia.current, '>=')) {
        key = 'Current'
      } else if (compare(clientVersion.clientVersion, clientVersions.chia.recent, '>=')) {
        key = 'Recent'
      } else if (compare(clientVersion.clientVersion, clientVersions.chia.outdated, '>=')) {
        key = 'Outdated'
      } else {
        key = 'Ancient'
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

  private makeThirdPartyVersionsClientVersionsChartUpdateOptions(clientVersionInfos: ClientVersion[]): EChartsOption {
    const clientVersionWithCount = clientVersionInfos.reduce((acc, clientVersion) => {
      let key: string
      if (clientVersion.localName1 === 'giga' || clientVersion.localName2 === 'giga') {
        key = 'Gigahorse'
      } else {
        key = 'Chia'
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

  get snippetService(): SnippetService {
    return this._snippetService
  }

  set poolConfig(poolConfig) {
    this._poolConfig = poolConfig
  }

  get poolConfig() {
    return this._poolConfig
  }

  get historicalTimeInHours() {
    if (!this.poolConfig.historicalTimeInMinutes) {
      return 'N/A'
    }
    return Math.round(this.poolConfig.historicalTimeInMinutes / 60)
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
