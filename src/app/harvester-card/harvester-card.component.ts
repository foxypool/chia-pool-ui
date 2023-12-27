import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild} from '@angular/core'
import {UntypedFormControl} from '@angular/forms'
import {ToastService} from '../toast.service'
import {AccountService} from '../account.service'
import * as moment from 'moment'
import {Moment} from 'moment'
import {BehaviorSubject, Observable, share, Subscription, take} from 'rxjs'
import {StatsService} from '../stats.service'
import {distinctUntilChanged, filter, map, shareReplay, skip} from 'rxjs/operators'
import {BigNumber} from 'bignumber.js'
import Capacity from '../capacity'
import {EChartsOption} from 'echarts'
import {faEllipsisV, faPencil, faReceipt} from '@fortawesome/free-solid-svg-icons'
import {HarvesterSettingsModalComponent} from '../harvester-settings-modal/harvester-settings-modal.component'
import {HarvesterStats} from '../api/types/harvester/harvester-stats'
import {ProofTime} from '../api/types/harvester/proof-time'
import {Harvester} from '../api/types/harvester/harvester'
import {PoolsProvider, PoolType} from '../pools.provider'
import {ChiaDashboardService} from '../chia-dashboard.service'
import {HarvesterStatus} from '../status/harvester-status'
import {LastUpdatedState} from '../status/last-updated-state'
import {colors, Theme, ThemeProvider} from '../theme-provider'
import {
  durationInDays, getResolutionInMinutes, HistoricalStatsDuration,
} from '../api/types/historical-stats-duration'
import {HistoricalStatsDurationProvider} from '../historical-stats-duration-provider'
import {
  chiaClient,
  chiaOgClient,
  fastFarmerClient,
  foxyFarmerClient,
  foxyGhFarmerClient,
  getIntegerVersionUpdateInfo,
  getSemverVersionUpdateInfo,
  getVersionFromClientVersion,
  gigahorseClient,
  liteFarmerClient,
  VersionUpdateInfo
} from '../clients/clients'
import {LocalStorageService} from '../local-storage.service'

const sharesPerDayPerK32 = 10
const k32SizeInGb = 108.837
const k32SizeInGib = (new BigNumber(k32SizeInGb)).shiftedBy(9).dividedBy((new BigNumber(1024)).exponentiatedBy(3))

@Component({
  selector: 'app-harvester-card',
  templateUrl: './harvester-card.component.html',
  styleUrls: ['./harvester-card.component.scss']
})
export class HarvesterCardComponent implements OnInit, OnDestroy {
  @Input() harvester: Harvester
  @Output() updatedHarvester = new EventEmitter<void>()
  @ViewChild(HarvesterSettingsModalComponent) settingsModal: HarvesterSettingsModalComponent

  public nameControl: UntypedFormControl
  public readonly faEllipsisV = faEllipsisV
  public readonly faReceipt = faReceipt
  public readonly faPencil = faPencil
  public readonly ChartMode = ChartMode
  public readonly showSharesChart: Observable<boolean>
  public readonly showProofTimesChart: Observable<boolean>
  public readonly hasProofTimes: Observable<boolean>
  public readonly chartMode: Observable<ChartMode>
  public readonly isLoading: Observable<boolean>
  public readonly isLoadingProofTimes: Observable<boolean>
  public readonly averageEc: Observable<string>
  public readonly averageProofTimeInSeconds: Observable<string>
  public readonly averageProofTimeInSecondsColorClass: Observable<string>
  public readonly totalValidShares: Observable<string>
  public readonly totalStaleShares: Observable<string>
  public readonly totalValidSharesPercentage: Observable<string>
  public readonly totalStaleSharesPercentage: Observable<string>
  public readonly staleSharesColorClasses: Observable<string[]>
  public readonly reportedRawCapacity$: Observable<string>
  public readonly reportedEffectiveCapacity$: Observable<string>
  public readonly plotCount$: Observable<number>
  public readonly status$: Observable<string>
  public readonly statusTooltip$: Observable<string>
  public readonly statusDotColorClass$: Observable<string>
  public readonly statusColorClass$: Observable<string>
  public readonly relativeLastUpdated$: Observable<string>
  public readonly sharesChartOptions: EChartsOption
  public sharesChartUpdateOptions: EChartsOption
  public readonly proofTimesChartOptions: EChartsOption
  public proofTimesChartUpdateOptions: EChartsOption

  public get hasChiaDashboardShareKey(): boolean {
    return this.accountService.account?.integrations?.chiaDashboardShareKey !== undefined
  }

  public get selectedHistoricalStatsDuration(): HistoricalStatsDuration {
    return this.historicalStatsDurationProvider.selectedDuration
  }

  private get historicalIntervalInMinutes(): number {
    return getResolutionInMinutes(this.historicalStatsDurationProvider.selectedDuration)
  }

  private get persistedChartMode(): ChartMode {
    const chartMode = this.localStorageService.getItem(`chart-mode:${this.peerIdSlug}`)
    if (chartMode === null) {
      return ChartMode.shares
    }

    return ChartMode[chartMode] ?? ChartMode.shares
  }

  private set persistedChartMode(chartMode: ChartMode) {
    this.localStorageService.setItem(`chart-mode:${this.peerIdSlug}`, chartMode)
  }

  private readonly stats: Observable<HarvesterStats>
  private readonly statsSubject: BehaviorSubject<HarvesterStats|undefined> = new BehaviorSubject<HarvesterStats>(undefined)
  private statsUpdateInterval?: ReturnType<typeof setInterval>
  private proofTimesUpdateInterval?: ReturnType<typeof setInterval>
  private readonly chartModeSubject: BehaviorSubject<ChartMode> = new BehaviorSubject<ChartMode>(ChartMode.shares)
  private readonly proofTimes: BehaviorSubject<ProofTime[]> = new BehaviorSubject<ProofTime[]>([])
  private readonly isLoadingProofTimesSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)
  private readonly subscriptions: Subscription[] = [
    this.historicalStatsDurationProvider.selectedDuration$.pipe(skip(1)).subscribe(async _ => {
      if (this.harvester === undefined) {
        return
      }
      await this.updateStats()
      await this.updateProofTimes()
    }),
  ]

  constructor(
    public readonly accountService: AccountService,
    protected readonly chiaDashboardService: ChiaDashboardService,
    private readonly statsService: StatsService,
    private readonly toastService: ToastService,
    private readonly poolsProvider: PoolsProvider,
    private readonly themeProvider: ThemeProvider,
    private readonly historicalStatsDurationProvider: HistoricalStatsDurationProvider,
    private readonly localStorageService: LocalStorageService,
  ) {
    this.isLoadingProofTimes = this.isLoadingProofTimesSubject.pipe(shareReplay(1))
    this.showSharesChart = this.chartModeSubject.pipe(map(mode => mode === ChartMode.shares), distinctUntilChanged(), share())
    this.showProofTimesChart = this.chartModeSubject.pipe(map(mode => mode === ChartMode.proofTimes), distinctUntilChanged(), share())
    this.chartMode = this.chartModeSubject.pipe(distinctUntilChanged(), share())
    this.hasProofTimes = this.proofTimes.pipe(
      map(proofTimes => proofTimes.reduce((acc, curr) => acc + (curr.proofTimeInSeconds !== undefined ? 1 : 0), 0) > 0),
      shareReplay(1),
    )
    this.stats = this.statsSubject.asObservable().pipe(filter(stats => stats !== undefined), shareReplay(1))
    this.isLoading = this.statsSubject.asObservable().pipe(map(stats => stats === undefined), distinctUntilChanged(), shareReplay(1))
    this.averageEc = this.stats.pipe(
      map(stats => {
        const totalShares = stats.reduce((acc, submissionStat) => acc.plus(submissionStat.shares), new BigNumber(0))
        const ecInGib = totalShares
          .dividedBy(sharesPerDayPerK32 * durationInDays(this.historicalStatsDurationProvider.selectedDuration))
          .multipliedBy(k32SizeInGib)

        return new Capacity(ecInGib.toNumber()).toString()
      }),
    )
    const averageProofTimeInSeconds = this.stats.pipe(
      map(stats => {
        const averageProofTimes = stats.filter(stat => stat.proofTimeInSeconds !== null)
        if (averageProofTimes.length === 0) {
          return
        }

        return averageProofTimes
          .reduce((acc, curr) => acc.plus(curr.proofTimeInSeconds), new BigNumber(0))
          .dividedBy(averageProofTimes.length)
      }),
      shareReplay(1),
    )
    this.averageProofTimeInSeconds = averageProofTimeInSeconds.pipe(
      map(averageProofTime => {
        if (averageProofTime === undefined) {
          return 'N/A'
        }

        return `${averageProofTime.toFixed(3)} s`
      }),
      shareReplay(1),
    )
    this.averageProofTimeInSecondsColorClass = averageProofTimeInSeconds.pipe(
      filter(averageProofTimeInSeconds => averageProofTimeInSeconds !== undefined),
      map(averageProofTimeInSeconds => this.getProofTimeColorClass(averageProofTimeInSeconds)),
      shareReplay(1),
    )
    this.sharesChartOptions = {
      title: {
        text: 'Shares',
        left: 'center',
        top: 0,
        textStyle: {
          color: this.themeProvider.isDarkTheme ? colors.darkTheme.textColor : colors.lightTheme.textColor,
        }
      },
      legend: {
        data: [
          'Valid Shares',
          'Stale Shares',
          'Invalid Shares',
          'Proof times',
        ],
        top: 25,
        textStyle: {
          color: this.themeProvider.isDarkTheme ? colors.darkTheme.textColor : colors.lightTheme.textColor,
        },
      },
      grid: {
        left: 45,
        top: this.shareChartTopMargin,
        right: 40,
        bottom: 20,
      },
      tooltip: {
        trigger: 'axis',
        formatter: this.sharesChartTooltipFormatter.bind(this),
      },
      xAxis: {
        type: 'time',
        minInterval: this.historicalIntervalInMinutes * 60 * 1000,
      },
      yAxis: [{
        type: 'value',
        name: 'Shares',
        splitLine: {
          lineStyle: {
            type: 'solid',
            color: 'grey',
          },
        },
      }, {
        type: 'value',
        name: 'Proof time',
        splitLine: {
          show: false,
        },
        axisLabel: {
          formatter: '{value} s',
        },
      }],
      series: [{
        data: [],
        type: 'bar',
        stack: 'shares',
        name: 'Invalid Shares',
        color: '#dc3545',
        large: true,
      }, {
        data: [],
        type: 'bar',
        stack: 'shares',
        name: 'Stale Shares',
        color: '#c98a1a',
        large: true,
      }, {
        data: [],
        type: 'bar',
        stack: 'shares',
        name: 'Valid Shares',
        color: '#037ffc',
        large: true,
      }, {
        data: [],
        type: 'line',
        name: 'Proof times',
        color: this.themeProvider.isDarkTheme ? colors.darkTheme.proofTimesColor : colors.darkTheme.proofTimesColor,
        showSymbol: false,
        lineStyle: {
          type: 'dotted',
        },
        smooth: true,
        yAxisIndex: 1,
        z: -1,
      }],
    }
    this.proofTimesChartOptions = {
      title: {
        text: 'Proof times',
        left: 'center',
        top: 0,
        textStyle: {
          color: this.themeProvider.isDarkTheme ? colors.darkTheme.textColor : colors.lightTheme.textColor,
        }
      },
      grid: {
        left: 45,
        top: 50,
        right: 40,
        bottom: 20,
      },
      tooltip: {
        trigger: 'axis',
        formatter: this.proofTimesChartTooltipFormatter.bind(this),
      },
      xAxis: {
        type: 'time',
      },
      yAxis: [{
        type: 'value',
        name: 'Proof time',
        splitLine: {
          lineStyle: {
            type: 'solid',
            color: 'grey',
          },
        },
        axisLabel: {
          formatter: '{value} s',
        },
      }],
      dataZoom: [
        { type: 'inside' },
      ],
      series: [{
        data: [],
        type: 'scatter',
        name: 'Proof times',
        color: '#426b69',
      }],
    }
    this.subscriptions.push(this.stats.subscribe(stats => {
      this.sharesChartUpdateOptions = {
        ...(this.sharesChartUpdateOptions || {}),
        ...this.makeSharesChartUpdateOptions(stats),
      }
    }))
    this.subscriptions.push(this.proofTimes.subscribe(proofTimes => {
      this.proofTimesChartUpdateOptions = {
        ...(this.proofTimesChartUpdateOptions || {}),
        ...this.makeProofTimesChartUpdateOptions(proofTimes),
      }
    }))
    this.subscriptions.push(
      this.themeProvider.theme$.subscribe(theme => {
        const textColor = theme === Theme.dark ? colors.darkTheme.textColor : colors.lightTheme.textColor
        this.sharesChartUpdateOptions = {
          ...(this.sharesChartUpdateOptions || {}),
          title: {
            textStyle: {
              color: textColor,
            },
          },
          legend: {
            textStyle: {
              color: textColor,
            },
          },
        }
        this.proofTimesChartUpdateOptions = {
          ...(this.proofTimesChartUpdateOptions || {}),
          title: {
            textStyle: {
              color: textColor,
            },
          },
        }
      })
    )
    const sharesStream = this.stats
      .pipe(
        map(harvesterStats => {
          const totalValidShares = harvesterStats.reduce((acc, curr) => acc.plus(curr.shares), new BigNumber(0))
          const totalInvalidShares = harvesterStats.reduce((acc, curr) => acc.plus(curr.invalidShares), new BigNumber(0))
          const totalStaleShares = harvesterStats.reduce((acc, curr) => acc.plus(curr.staleShares), new BigNumber(0))
          const totalShares = totalValidShares.plus(totalInvalidShares).plus(totalStaleShares)

          return {
            totalValidShares,
            totalInvalidShares,
            totalStaleShares,
            totalShares,
          }
        }),
        shareReplay(1),
      )
    this.totalValidShares = sharesStream.pipe(map(stream => stream.totalValidShares.toNumber().toLocaleString('en')), shareReplay(1))
    this.totalValidSharesPercentage = sharesStream.pipe(map(stream => stream.totalValidShares.dividedBy(BigNumber.max(stream.totalShares, 1)).multipliedBy(100).toFixed(2)), shareReplay(1))
    this.totalStaleShares = sharesStream.pipe(map(stream => stream.totalStaleShares.toNumber().toLocaleString('en')), shareReplay(1))
    const staleSharesPercentage = sharesStream.pipe(map(stream => stream.totalStaleShares.dividedBy(BigNumber.max(stream.totalShares, 1)).multipliedBy(100)), shareReplay(1))
    this.totalStaleSharesPercentage = staleSharesPercentage.pipe(map(percentage => percentage.toFixed(2)), shareReplay(1))
    this.staleSharesColorClasses = staleSharesPercentage.pipe(
      map(percentage => {
        if (percentage.isGreaterThanOrEqualTo(2)) {
          return ['color-red']
        }
        if (percentage.isGreaterThanOrEqualTo(1)) {
          return ['color-orange']
        }

        return []
      }),
      shareReplay(1),
    )
    this.subscriptions.push(
      this.chartModeSubject
        .pipe(distinctUntilChanged(), filter(chartMode => chartMode === ChartMode.proofTimes), take(1))
        .subscribe(async () => {
          this.proofTimesUpdateInterval = setInterval(this.updateProofTimes.bind(this), 10 * 60 * 1000)
          this.isLoadingProofTimesSubject.next(true)
          try {
            await this.updateProofTimes()
          } finally {
            this.isLoadingProofTimesSubject.next(false)
          }
        })
    )

    const harvesterWithStatus$ = this.chiaDashboardService.satellites$.pipe(
      filter(satellites => satellites !== undefined),
      map(satellites => satellites
        .filter(satellite => !satellite.hidden)
        .map(satellite => satellite.services?.harvester)
        .filter(harvester => harvester?.stats !== undefined && harvester.stats.plotCount !== undefined)
        .find(harvester => harvester.stats.nodeId === this.harvester?.peerId.ensureHexPrefix())
      ),
      filter(harvester => harvester !== undefined),
      map(harvester => ({
        status: HarvesterStatus.fromHarvesterStats(harvester),
        harvester,
      })),
      shareReplay(1),
    )
    const harvesterWithStatusOk$ = harvesterWithStatus$.pipe(
      filter(({ status }) => status.lastUpdatedState === LastUpdatedState.ok),
      map(({ harvester }) => harvester),
      shareReplay(1),
    )
    this.reportedRawCapacity$ = harvesterWithStatusOk$.pipe(
      map(harvester => {
        const plotStats = this.poolsProvider.pool.type === PoolType.og ? harvester.stats.ogPlots : harvester.stats.nftPlots
        const rawCapacityInGib = new BigNumber(plotStats.rawCapacityInGib)

        return (new Capacity(rawCapacityInGib.toNumber())).toString()
      }),
    )
    this.reportedEffectiveCapacity$ = harvesterWithStatusOk$.pipe(
      map(harvester => {
        const plotStats = this.poolsProvider.pool.type === PoolType.og ? harvester.stats.ogPlots : harvester.stats.nftPlots
        const effectiveCapacityInGib = new BigNumber(plotStats.effectiveCapacityInGib)

        return (new Capacity(effectiveCapacityInGib.toNumber())).toString()
      }),
    )
    this.plotCount$ = harvesterWithStatusOk$.pipe(
      map(harvester => {
        const plotStats = this.poolsProvider.pool.type === PoolType.og ? harvester.stats.ogPlots : harvester.stats.nftPlots

        return plotStats.count
      }),
    )
    this.status$ = harvesterWithStatus$.pipe(
      map(({ status }) => status.toString()),
    )
    this.statusTooltip$ = harvesterWithStatus$.pipe(
      map(({ status }) => status.statusTooltip),
    )
    this.statusDotColorClass$ = harvesterWithStatus$.pipe(
      map(({ status }) => status.dotColorClass),
    )
    this.statusColorClass$ = harvesterWithStatus$.pipe(
      map(({ status }) => status.statusColorClass),
    )
    this.relativeLastUpdated$ = harvesterWithStatus$.pipe(
      map(({ status }) => status.relativeLastUpdated),
    )
  }

  public async ngOnInit(): Promise<void> {
    this.chartModeSubject.next(this.persistedChartMode)
    this.nameControl = new UntypedFormControl(this.harvester.name)
    this.statsUpdateInterval = setInterval(this.updateStats.bind(this), 10 * 60 * 1000)
    await this.updateStats()
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
    if (this.statsUpdateInterval !== undefined) {
      clearInterval(this.statsUpdateInterval)
    }
    if (this.proofTimesUpdateInterval !== undefined) {
      clearInterval(this.proofTimesUpdateInterval)
    }
  }

  public get nameOrPeerIdSlug(): string {
    return this.harvester.name ?? this.peerIdSlug
  }

  public get peerIdSlug(): string {
    return this.harvester.peerId.stripHexPrefix().slice(0, 10)
  }

  public get hasName(): boolean {
    return this.harvester.name !== undefined
  }

  public get canEditName(): boolean {
    return this.accountService.isAuthenticated
  }

  public get lastAcceptedPartialAt(): string {
    if (this.harvester.lastAcceptedPartialAt === undefined) {
      return 'Never'
    }

    return moment(this.harvester.lastAcceptedPartialAt).fromNow()
  }

  public get chiaVersionUpdateInfo(): VersionUpdateInfo {
    return getSemverVersionUpdateInfo(chiaClient, this.chiaVersion)
  }

  private get chiaVersion(): string|undefined {
    return getVersionFromClientVersion(chiaClient, this.harvester.versionInfo)
  }

  public get hasChiaVersion(): boolean {
    return this.chiaVersion !== undefined
  }

  private get chiaRcVersion(): string|undefined {
    if (this.harvester.versionInfo.localName1 === 'rc') {
      return this.harvester.versionInfo.localVersion1 ?? undefined
    }
  }

  private get chiaBetaVersion(): string|undefined {
    if (this.harvester.versionInfo.localName1 === 'b') {
      return this.harvester.versionInfo.localVersion1 ?? undefined
    }
  }

  public get fullChiaVersionString(): string|undefined {
    const chiaVersion = this.chiaVersion
    if (chiaVersion === undefined) {
      return
    }

    const rcVersion = this.chiaRcVersion
    if (rcVersion !== undefined) {
      return `${chiaVersion} RC ${rcVersion}`
    }
    const betaVersion = this.chiaBetaVersion
    if (betaVersion !== undefined) {
      return `${chiaVersion} Beta ${betaVersion}`
    }

    return chiaVersion
  }

  public get ogVersionUpdateInfo(): VersionUpdateInfo {
    return getSemverVersionUpdateInfo(chiaOgClient, this.ogVersion)
  }

  public get ogVersion(): string|undefined {
    return getVersionFromClientVersion(chiaOgClient, this.harvester.versionInfo)
  }

  public get hasOgVersion(): boolean {
    return this.ogVersion !== undefined
  }

  public get foxyFarmerVersionUpdateInfo(): VersionUpdateInfo {
    return getSemverVersionUpdateInfo(foxyFarmerClient, this.foxyFarmerVersion)
  }

  public get foxyFarmerVersion(): string|undefined {
    return getVersionFromClientVersion(foxyFarmerClient, this.harvester.versionInfo)
  }

  public get hasFoxyFarmerVersion(): boolean {
    return this.foxyFarmerVersion !== undefined
  }

  public get foxyGhFarmerVersionUpdateInfo(): VersionUpdateInfo {
    return getSemverVersionUpdateInfo(foxyGhFarmerClient, this.foxyGhFarmerVersion)
  }

  public get foxyGhFarmerVersion(): string|undefined {
    return getVersionFromClientVersion(foxyGhFarmerClient, this.harvester.versionInfo)
  }

  public get hasFoxyGhFarmerVersion(): boolean {
    return this.foxyGhFarmerVersion !== undefined
  }

  public get gigahorseVersionUpdateInfo(): VersionUpdateInfo {
    return getIntegerVersionUpdateInfo(gigahorseClient, this.gigahorseVersion)
  }

  public get gigahorseVersion(): string|undefined {
    return getVersionFromClientVersion(gigahorseClient, this.harvester.versionInfo)
  }

  public get hasGigahorseVersion(): boolean {
    return this.gigahorseVersion !== undefined
  }

  public get fastFarmerVersionUpdateInfo(): VersionUpdateInfo {
    return getSemverVersionUpdateInfo(fastFarmerClient, this.fastFarmerVersion)
  }

  public get fastFarmerVersion(): string|undefined {
    return getVersionFromClientVersion(fastFarmerClient, this.harvester.versionInfo)
  }

  public get hasFastFarmerVersion(): boolean {
    return this.fastFarmerVersion !== undefined
  }

  public get liteFarmerVersionUpdateInfo(): VersionUpdateInfo {
    return getSemverVersionUpdateInfo(liteFarmerClient, this.liteFarmerVersion)
  }

  public get liteFarmerVersion(): string|undefined {
    return getVersionFromClientVersion(liteFarmerClient, this.harvester.versionInfo)
  }

  public get hasLiteFarmerVersion(): boolean {
    return this.liteFarmerVersion !== undefined
  }

  public get rowColumnClasses(): string[] {
    const cardCount = this.cardCount

    return [
      `row-cols-xl-${Math.min(6, cardCount)}`,
      `row-cols-xxl-${Math.min(7, cardCount)}`,
    ]
  }

  private get cardCount(): number {
    let count = 5
    if (this.hasChiaVersion) {
      count += 1
    }
    if (this.hasFastFarmerVersion) {
      count += 1
    }
    if (this.hasLiteFarmerVersion) {
      count += 1
    }
    if (this.hasOgVersion) {
      count += 1
    }
    if (this.hasGigahorseVersion) {
      count += 1
    }
    if (this.hasFoxyFarmerVersion) {
      count += 1
    }
    if (this.hasFoxyGhFarmerVersion) {
      count += 1
    }
    if (this.hasChiaDashboardShareKey) {
      count += 3
    }

    return count
  }

  private get shareChartTopMargin(): number {
    if (window.innerWidth >= 716) {
      return 50
    }
    if (window.innerWidth >= 541) {
      return 75
    }

    return 99
  }

  public setChartMode(chartMode: ChartMode) {
    this.chartModeSubject.next(chartMode)
    this.persistedChartMode = chartMode
  }

  public async updateName(): Promise<void> {
    const newName = this.nameControl.value?.trim() || undefined
    if (newName === this.harvester.name) {
      return
    }
    this.harvester.name = newName
    await this.accountService.updateHarvesterName({ harvesterPeerId: this.harvester.peerId, newName })
    this.toastService.showSuccessToast(`Harvester ${this.nameOrPeerIdSlug} updated`)
  }

  public cancelNameUpdate(): void {
    this.nameControl.setValue(this.harvester.name)
  }

  public harvesterWasUpdated() {
    this.updatedHarvester.emit()
  }

  public openSettingsModal() {
    this.settingsModal.openModal()
  }

  private async updateStats(): Promise<void> {
    this.statsSubject.next(await this.statsService.getHarvesterStats({
      harvesterId: this.harvester._id,
      duration: this.historicalStatsDurationProvider.selectedDuration,
    }))
  }

  private async updateProofTimes(): Promise<void> {
    this.proofTimes.next(await this.statsService.getHarvesterProofTimes({
      harvesterId: this.harvester._id,
      duration: this.historicalStatsDurationProvider.selectedDuration,
    }))
  }

  private makeSharesChartUpdateOptions(stats: HarvesterStats): EChartsOption {
    const validSharesSeries = stats.map(stats => [stats.receivedAt, stats.shares])
    const staleSharesSeries = stats.map(stats => [stats.receivedAt, stats.staleShares])
    const invalidSharesSeries = stats.map(stats => [stats.receivedAt, stats.invalidShares])
    const averageProofTimesSeries = stats
      .filter(stat => stat.proofTimeInSeconds !== null)
      .map(stat => [stat.receivedAt, stat.proofTimeInSeconds])

    const roundToNextLower15Min = (date: Moment): Moment => {
      const minutesRoundedDown = Math.floor(date.minutes() / 15) * 15

      return date.clone().set({ minutes: minutesRoundedDown, seconds: 0, milliseconds: 0 })
    }

    const roundToNextLowerHour = (date: Moment): Moment => {
      return date.clone().set({ minutes: 0, seconds: 0, milliseconds: 0 })
    }

    const roundToNextLower4Hour = (date: Moment): Moment => {
      const hoursRoundedDown = Math.floor(date.hours() / 4) * 4

      return date.clone().set({ hours: hoursRoundedDown, minutes: 0, seconds: 0, milliseconds: 0 })
    }

    const resolutionInMinutes = this.historicalIntervalInMinutes
    const applyRounding = (date: Moment): Moment => {
      switch (this.historicalStatsDurationProvider.selectedDuration) {
        case '1d': return roundToNextLower15Min(date)
        case '7d': return roundToNextLowerHour(date)
        case '30d': return roundToNextLower4Hour(date)
      }
    }

    const insertEmptyPositionIfNotExists = (position: number, date: Moment, series: (string | number)[][]) => {
      const dateAsIsoString = date.toISOString()
      if (position >= series.length) {
        series.push([dateAsIsoString, 0])

        return
      }
      const valueAtPos = series[position]
      if (valueAtPos[0] === dateAsIsoString) {
        return
      }
      series.splice(position, 0, [dateAsIsoString, 0])
    }

    const historicalDurationInDays = durationInDays(this.historicalStatsDurationProvider.selectedDuration)
    let startDate = applyRounding(moment().utc()).subtract(historicalDurationInDays, 'day')
    let currentPosition = 0
    while (startDate.isBefore(moment())) {
      insertEmptyPositionIfNotExists(currentPosition, startDate, invalidSharesSeries)
      insertEmptyPositionIfNotExists(currentPosition, startDate, staleSharesSeries)
      insertEmptyPositionIfNotExists(currentPosition, startDate, validSharesSeries)
      currentPosition += 1
      startDate = startDate.add(resolutionInMinutes, 'minutes')
    }

    return {
      xAxis: {
        type: 'time',
        minInterval: resolutionInMinutes * 60 * 1000,
      },
      series: [{
        data: invalidSharesSeries,
      }, {
        data: staleSharesSeries,
      }, {
        data: validSharesSeries,
      }, {
        data: averageProofTimesSeries,
        color: this.themeProvider.isDarkTheme ? colors.darkTheme.proofTimesColor : colors.lightTheme.proofTimesColor
      }],
    }
  }

  private sharesChartTooltipFormatter(params): string {
    const seriesTooltip = params.map(series => {
      if (series.value === undefined) {
        return ''
      }

      switch (series.seriesIndex) {
        case 0:
        case 1:
        case 2:
          return `${series.marker}${series.seriesName} <span style="padding-left: 10px; float: right"><strong>${series.value[1]}</strong></span>`
        case 3:
          return `${series.marker}Proof time <span style="padding-left: 10px; float: right"><strong>${series.value[1].toFixed(3)} s</strong></span>`
      }

    }).join('<br/>')

    const date: string | undefined = params.at(0)?.value?.at(0)
    if (date === undefined) {
      return seriesTooltip
    }

    return `${moment(date).format('YYYY-MM-DD HH:mm:ss')}<br/>${seriesTooltip}`
  }

  private makeProofTimesChartUpdateOptions(proofTimes: ProofTime[]): EChartsOption {
    return {
      series: [{
        data: proofTimes.map(proofTime => ({
          value: [proofTime.receivedAt, proofTime.proofTimeInSeconds],
          itemStyle: {
            color: this.getProofTimeColorForChart(proofTime.proofTimeInSeconds),
          },
        })),
      }],
    }
  }

  private proofTimesChartTooltipFormatter(params): string {
    if (params === undefined) {
      return ''
    }
    const date: string | undefined = params.at(0)?.value?.at(0)
    const proofTime: number | undefined = params.at(0)?.value?.at(1)
    if (date === undefined || proofTime === undefined) {
      return ''
    }
    const seriesTooltip = params.map(series => {
      return `${series.marker}Proof time <span style="padding-left: 10px; float: right"><strong>${series.value[1].toFixed(3)} s</strong></span>`
    }).join('<br/>')

    return `${moment(date).format('YYYY-MM-DD HH:mm:ss')}<br/>${seriesTooltip}`
  }

  private getProofTimeColorForChart(proofTimeInSeconds: number): string {
    if (proofTimeInSeconds < 5) {
      return '#46cf76'
    }
    if (proofTimeInSeconds < 10) {
      return '#b9a44c'
    }
    if (proofTimeInSeconds < 25) {
      return '#ffaa00'
    }

    return '#ff4d4d'
  }

  private getProofTimeColorClass(proofTimeInSeconds: BigNumber): string {
    if (proofTimeInSeconds.isGreaterThanOrEqualTo(25)) {
      return 'color-red'
    }
    if (proofTimeInSeconds.isGreaterThanOrEqualTo(15)) {
      return 'color-orange'
    }
    if (proofTimeInSeconds.isGreaterThanOrEqualTo(10)) {
      return 'color-green-orange'
    }

    return ''
  }
}

enum ChartMode {
  shares = 'shares',
  proofTimes = 'proofTimes',
}
