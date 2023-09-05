import {Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild} from '@angular/core'
import {UntypedFormControl} from '@angular/forms'
import {ToastService} from '../toast.service'
import {AccountService} from '../account.service'
import * as moment from 'moment'
import {BehaviorSubject, Observable, Subscription, take} from 'rxjs'
import {StatsService} from '../stats.service'
import {distinctUntilChanged, filter, map, shareReplay} from 'rxjs/operators'
import {BigNumber} from 'bignumber.js'
import Capacity from '../capacity'
import {EChartsOption} from 'echarts'
import {Moment} from 'moment'
import {compare} from 'compare-versions'
import {clientVersions} from '../client-versions'
import {faEllipsisV, faPencil, faReceipt} from '@fortawesome/free-solid-svg-icons'
import {HarvesterSettingsModalComponent} from '../harvester-settings-modal/harvester-settings-modal.component'
import {HarvesterStats, RejectedSubmissionType} from '../api/types/harvester/harvester-stats'
import {ProofTime} from '../api/types/harvester/proof-time'
import { Harvester } from '../api/types/harvester/harvester'

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
  public readonly sharesChartOptions: EChartsOption
  public sharesChartUpdateOptions: EChartsOption
  public readonly proofTimesChartOptions: EChartsOption
  public proofTimesChartUpdateOptions: EChartsOption
  private readonly stats: Observable<HarvesterStats>
  private readonly statsSubject: BehaviorSubject<HarvesterStats|undefined> = new BehaviorSubject<HarvesterStats>(undefined)
  private statsUpdateInterval?: ReturnType<typeof setInterval>
  private proofTimesUpdateInterval?: ReturnType<typeof setInterval>
  private readonly chartModeSubject: BehaviorSubject<ChartMode> = new BehaviorSubject<ChartMode>(ChartMode.shares)
  private readonly proofTimes: BehaviorSubject<ProofTime[]> = new BehaviorSubject<ProofTime[]>([])
  private readonly isLoadingProofTimesSubject: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false)
  private readonly subscriptions: Subscription[] = []

  constructor(
    public readonly accountService: AccountService,
    private readonly statsService: StatsService,
    private readonly toastService: ToastService,
  ) {
    this.isLoadingProofTimes = this.isLoadingProofTimesSubject.pipe(shareReplay())
    this.showSharesChart = this.chartModeSubject.pipe(map(mode => mode === ChartMode.shares), shareReplay())
    this.showProofTimesChart = this.chartModeSubject.pipe(map(mode => mode === ChartMode.proofTimes), shareReplay())
    this.chartMode = this.chartModeSubject.pipe(shareReplay())
    this.hasProofTimes = this.proofTimes.pipe(
      map(proofTimes => proofTimes.reduce((acc, curr) => acc + (curr.proofTimeInSeconds !== undefined ? 1 : 0), 0) > 0),
      shareReplay(),
    )
    this.stats = this.statsSubject.asObservable().pipe(filter(stats => stats !== undefined), shareReplay())
    this.isLoading = this.statsSubject.asObservable().pipe(map(stats => stats === undefined), distinctUntilChanged(), shareReplay())
    this.averageEc = this.stats.pipe(
      map(stats => {
        const totalShares = stats.submissionStats.reduce((acc, submissionStat) => acc.plus(submissionStat.shares), new BigNumber(0))
        const ecInGib = totalShares
          .dividedBy(sharesPerDayPerK32)
          .multipliedBy(k32SizeInGib)

        return new Capacity(ecInGib.toNumber()).toString()
      }),
    )
    const averageProofTimeInSeconds = this.stats.pipe(
      map(stats => {
        const averageProofTimes = stats.submissionStats
          .map(stat => ({ partials: stat.partials, proofTimeSumInSeconds: stat.proofTimeSumInSeconds }))
          .concat(stats.rejectedSubmissionStats.map(stat => ({ partials: stat.partials, proofTimeSumInSeconds: stat.proofTimeSumInSeconds })))
          .filter(stat => stat.proofTimeSumInSeconds !== null && stat.partials > 0)

        const totalPartials = averageProofTimes.reduce((acc, curr) => acc.plus(curr.partials), new BigNumber(0))
        if (totalPartials.isZero()) {
          return undefined
        }

        return averageProofTimes
          .reduce((acc, curr) => acc.plus(curr.proofTimeSumInSeconds), new BigNumber(0))
          .dividedBy(totalPartials)
      }),
      shareReplay(),
    )
    this.averageProofTimeInSeconds = averageProofTimeInSeconds.pipe(
      map(averageProofTime => {
        if (averageProofTime === undefined) {
          return 'N/A'
        }

        return `${averageProofTime.toFixed(3)} s`
      }),
      shareReplay(),
    )
    this.averageProofTimeInSecondsColorClass = averageProofTimeInSeconds.pipe(
      filter(averageProofTimeInSeconds => averageProofTimeInSeconds !== undefined),
      map(averageProofTimeInSeconds => this.getProofTimeColorClass(averageProofTimeInSeconds)),
      shareReplay(),
    )
    this.sharesChartOptions = {
      title: {
        text: 'Shares',
        left: 'center',
        top: 0,
        textStyle: {
          color: '#cfd0d1'
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
          color: '#cfd0d1',
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
        minInterval: 15 * 60 * 1000,
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
        color: '#c6d8d3',
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
          color: '#cfd0d1'
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
      this.sharesChartUpdateOptions = this.makeSharesChartUpdateOptions(stats)
    }))
    this.subscriptions.push(this.proofTimes.subscribe(proofTimes => {
      this.proofTimesChartUpdateOptions = this.makeProofTimesChartUpdateOptions(proofTimes)
    }))
    const sharesStream = this.stats
      .pipe(
        map(harvesterStats => {
          const totalValidShares = harvesterStats.submissionStats.reduce((acc, curr) => acc.plus(curr.shares), new BigNumber(0))
          const totalInvalidShares = harvesterStats.rejectedSubmissionStats
            .filter(stat => stat.type === RejectedSubmissionType.invalid)
            .reduce((acc, curr) => acc.plus(curr.shares), new BigNumber(0))
          const totalStaleShares = harvesterStats.rejectedSubmissionStats
            .filter(stat => stat.type === RejectedSubmissionType.stale)
            .reduce((acc, curr) => acc.plus(curr.shares), new BigNumber(0))
          const totalShares = totalValidShares.plus(totalInvalidShares).plus(totalStaleShares)

          return {
            totalValidShares,
            totalInvalidShares,
            totalStaleShares,
            totalShares,
          }
        }),
        shareReplay(),
      )
    this.totalValidShares = sharesStream.pipe(map(stream => stream.totalValidShares.toNumber().toLocaleString('en')), shareReplay())
    this.totalValidSharesPercentage = sharesStream.pipe(map(stream => stream.totalValidShares.dividedBy(BigNumber.max(stream.totalShares, 1)).multipliedBy(100).toFixed(2)), shareReplay())
    this.totalStaleShares = sharesStream.pipe(map(stream => stream.totalStaleShares.toNumber().toLocaleString('en')), shareReplay())
    const staleSharesPercentage = sharesStream.pipe(map(stream => stream.totalStaleShares.dividedBy(BigNumber.max(stream.totalShares, 1)).multipliedBy(100)), shareReplay())
    this.totalStaleSharesPercentage = staleSharesPercentage.pipe(map(percentage => percentage.toFixed(2)), shareReplay())
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
      shareReplay(),
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
  }

  public async ngOnInit(): Promise<void> {
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

  public get chiaVersionColorClasses(): string[] {
    const chiaVersion = this.chiaVersion
    if (chiaVersion === undefined) {
      return []
    }
    if (compare(chiaVersion, clientVersions.chia.recommendedMinimum, '>=')) {
      return []
    }
    if (compare(chiaVersion, clientVersions.chia.minimum, '>=')) {
      return ['color-orange']
    }

    return ['color-red']
  }

  private get chiaVersion(): string|undefined {
    if (this.harvester.versionInfo.clientName === null || this.harvester.versionInfo.clientName.indexOf('Chia') === -1) {
      return
    }

    return this.harvester.versionInfo.clientVersion
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

  public get fullChiaVersionString(): string {
    const chiaVersion = this.chiaVersion
    if (chiaVersion === undefined) {
      return 'Unknown'
    }

    // If we already show explicit compression version ignore rc and beta info
    if (this.hasChiaCompressionVersion) {
      return chiaVersion
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

  public get ogVersionColorClasses(): string[] {
    const ogVersion = this.ogVersion
    if (ogVersion === undefined) {
      return []
    }
    if (compare(ogVersion, clientVersions.og.recommendedMinimum, '>=')) {
      return []
    }
    if (compare(ogVersion, clientVersions.og.minimum, '>=')) {
      return ['color-orange']
    }

    return ['color-red']
  }

  public get ogVersion(): string|undefined {
    if (this.harvester.versionInfo.localName1 === 'og') {
      return this.harvester.versionInfo.localVersion1 ?? undefined
    }
    if (this.harvester.versionInfo.localName2 === 'og') {
      return this.harvester.versionInfo.localVersion2 ?? undefined
    }
    if (this.harvester.versionInfo.localName3 === 'og') {
      return this.harvester.versionInfo.localVersion3 ?? undefined
    }
  }

  public get hasOgVersion(): boolean {
    return this.ogVersion !== undefined
  }

  public get foxyFarmerVersionColorClasses(): string[] {
    const foxyFarmerVersion = this.foxyFarmerVersion
    if (foxyFarmerVersion === undefined) {
      return []
    }
    if (compare(foxyFarmerVersion, clientVersions.foxyFarmer.recommendedMinimum, '>=')) {
      return []
    }
    if (compare(foxyFarmerVersion, clientVersions.foxyFarmer.minimum, '>=')) {
      return ['color-orange']
    }

    return ['color-red']
  }

  public get foxyFarmerVersion(): string|undefined {
    if (this.harvester.versionInfo.localName1 === 'ff') {
      return this.harvester.versionInfo.localVersion1 ?? undefined
    }
    if (this.harvester.versionInfo.localName2 === 'ff') {
      return this.harvester.versionInfo.localVersion2 ?? undefined
    }
    if (this.harvester.versionInfo.localName3 === 'ff') {
      return this.harvester.versionInfo.localVersion3 ?? undefined
    }
  }

  public get hasFoxyFarmerVersion(): boolean {
    return this.foxyFarmerVersion !== undefined
  }

  public get gigahorseVersionColorClasses(): string[] {
    const gigahorseVersion = this.gigahorseVersion
    if (gigahorseVersion === undefined) {
      return []
    }
    const gigahorseVersionNumber = parseInt(gigahorseVersion, 10)
    if (isNaN(gigahorseVersionNumber)) {
      return []
    }
    if (gigahorseVersionNumber >= clientVersions.gigahorse.recommendedMinimum) {
      return []
    }
    if (gigahorseVersionNumber >= clientVersions.gigahorse.minimum) {
      return ['color-orange']
    }

    return ['color-red']
  }

  public get gigahorseVersion(): string|undefined {
    if (this.harvester.versionInfo.localName1 === 'giga') {
      return this.harvester.versionInfo.localVersion1 ?? undefined
    }
  }

  public get hasGigahorseVersion(): boolean {
    return this.gigahorseVersion !== undefined
  }

  private get chiaCompressionAlphaVersion(): string|undefined {
    if (this.harvester.versionInfo.localName1 === 'compression-alpha') {
      return this.harvester.versionInfo.localVersion1 ?? undefined
    }
    if (this.harvester.versionInfo.localName2 === 'compression-alpha') {
      return this.harvester.versionInfo.localVersion2 ?? undefined
    }
    if (this.harvester.versionInfo.localName3 === 'compression-alpha') {
      return this.harvester.versionInfo.localVersion3 ?? undefined
    }
    if (
      this.harvester.versionInfo.clientVersion === '2.0.0'
      && this.harvester.versionInfo.localName1 === 'b'
      && this.harvester.versionInfo.localVersion1 === '5'
      && this.harvester.versionInfo.localName2 === 'dev'
      && this.harvester.versionInfo.localVersion2 === '76'
    ) {
      return '4.6'
    }
    if (
      this.harvester.versionInfo.clientVersion === '1.8.2'
      && this.harvester.versionInfo.localName1 === 'rc'
      && this.harvester.versionInfo.localVersion1 === '6'
      && this.harvester.versionInfo.localName2 === 'dev'
      && this.harvester.versionInfo.localVersion2 === '115'
    ) {
      return '4.5'
    }
    if (
      this.harvester.versionInfo.clientVersion === '2.0.0'
      && this.harvester.versionInfo.localName1 === 'b'
      && this.harvester.versionInfo.localVersion1 === '3'
      && this.harvester.versionInfo.localName2 === 'dev'
      && this.harvester.versionInfo.localVersion2 === '116'
    ) {
      return '4.3'
    }
  }

  public get chiaCompressionVersionColorClasses(): string[] {
    const compressionAlphaVersion = this.chiaCompressionAlphaVersion
    if (compressionAlphaVersion !== undefined) {
      if (compare(compressionAlphaVersion, clientVersions.chiaCompressionAlpha.recommendedMinimum, '>=')) {
        return []
      }
      if (compare(compressionAlphaVersion, clientVersions.chiaCompressionAlpha.minimum, '>=')) {
        return ['color-orange']
      }

      return ['color-red']
    }

    return []
  }

  public get chiaCompressionVersion(): string|undefined {
    if (this.chiaCompressionAlphaVersion !== undefined) {
      return `Alpha ${this.chiaCompressionAlphaVersion}`
    }
  }

  public get hasChiaCompressionVersion(): boolean {
    return this.chiaCompressionVersion !== undefined
  }

  public get rowColumnClasses(): string[] {
    const cardCount = this.cardCount

    return [
      `row-cols-xl-${Math.min(6, cardCount)}`,
      `row-cols-xxl-${Math.min(7, cardCount)}`,
    ]
  }

  private get cardCount(): number {
    let count = 6
    if (this.hasOgVersion) {
      count += 1
    }
    if (this.hasGigahorseVersion) {
      count += 1
    }
    if (this.hasChiaCompressionVersion) {
      count += 1
    }
    if (this.hasFoxyFarmerVersion) {
      count += 1
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
    this.statsSubject.next(await this.statsService.getHarvesterStats(this.harvester._id))
  }

  private async updateProofTimes(): Promise<void> {
    this.proofTimes.next(await this.statsService.getHarvesterProofTimes(this.harvester._id))
  }

  private makeSharesChartUpdateOptions(stats: HarvesterStats): EChartsOption {
    const validSharesSeries = stats.submissionStats.map(stats => [stats.date, stats.shares])
    const staleSharesSeries = stats.rejectedSubmissionStats
      .filter(stat => stat.type === RejectedSubmissionType.stale)
      .map(stats => [stats.date, stats.shares])
    const invalidSharesSeries = stats.rejectedSubmissionStats
      .filter(stat => stat.type === RejectedSubmissionType.invalid)
      .map(stats => [stats.date, stats.shares])

    const proofTimeSumsByDate = new Map<string, ProofTimeSum[]>()
    stats.submissionStats.forEach(stat => {
      if (stat.proofTimeSumInSeconds !== null && stat.partials > 0) {
        const proofTimeSumsForDate = proofTimeSumsByDate.get(stat.date) ?? []
        proofTimeSumsForDate.push({ partials: stat.partials, proofTimeSumInSeconds: stat.proofTimeSumInSeconds })
        proofTimeSumsByDate.set(stat.date, proofTimeSumsForDate)
      }
    })
    stats.rejectedSubmissionStats.forEach(stat => {
      if (stat.proofTimeSumInSeconds !== null && stat.partials > 0) {
        const proofTimeSumsForDate = proofTimeSumsByDate.get(stat.date) ?? []
        proofTimeSumsForDate.push({ partials: stat.partials, proofTimeSumInSeconds: stat.proofTimeSumInSeconds })
        proofTimeSumsByDate.set(stat.date, proofTimeSumsForDate)
      }
    })
    const averageProofTimes = Array
      .from(proofTimeSumsByDate)
      .map(([date, proofTimeSums]) => ({ date, averageProofTime: proofTimeSums.reduce((acc, curr) => acc + curr.proofTimeSumInSeconds, 0) / proofTimeSums.reduce((acc, curr) => acc + curr.partials, 0) }))
    averageProofTimes.sort((lhs, rhs) => (new Date(lhs.date)).getTime() - (new Date(rhs.date)).getTime())
    const averageProofTimesSeries = averageProofTimes.map(stat => [stat.date, stat.averageProofTime])

    const roundToNextLower15Min = (date: Moment): Moment => {
      const minutesRoundedDown = Math.floor(date.minutes() / 15) * 15

      return date.clone().set({ minutes: minutesRoundedDown, seconds: 0, milliseconds: 0 })
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

    let startDate = roundToNextLower15Min(moment()).subtract(1, 'day')
    let currentPosition = 0
    while (startDate.isBefore(moment())) {
      insertEmptyPositionIfNotExists(currentPosition, startDate, invalidSharesSeries)
      insertEmptyPositionIfNotExists(currentPosition, startDate, staleSharesSeries)
      insertEmptyPositionIfNotExists(currentPosition, startDate, validSharesSeries)
      currentPosition += 1
      startDate = startDate.add(15, 'minutes')
    }

    return {
      series: [{
        data: invalidSharesSeries,
      }, {
        data: staleSharesSeries,
      }, {
        data: validSharesSeries,
      }, {
        data: averageProofTimesSeries,
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

    const date: string | undefined = params.at(0)?.value.at(0)
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
    const date: string | undefined = params.at(0)?.value.at(0)
    const proofTime: number | undefined = params.at(0)?.value.at(1)
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

interface ProofTimeSum {
  proofTimeSumInSeconds: number
  partials: number
}

enum ChartMode {
  shares = 'shares',
  proofTimes = 'proofTimes',
}
