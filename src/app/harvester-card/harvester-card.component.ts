import {Component, Input, OnDestroy, OnInit} from '@angular/core'
import {Harvester} from '../types'
import {UntypedFormControl} from '@angular/forms'
import {ToastService} from '../toast.service'
import {AccountService} from '../account.service'
import * as moment from 'moment/moment'
import {BehaviorSubject, Observable, Subscription} from 'rxjs'
import {StatsService} from '../stats.service'
import {HarvesterStats, RejectedSubmissionType} from '../api.service'
import {distinctUntilChanged, filter, map, shareReplay} from 'rxjs/operators'
import {BigNumber} from 'bignumber.js'
import Capacity from '../capacity'
import {EChartsOption} from 'echarts'
import {Moment} from 'moment'
import {stripHexPrefix} from '../util'
import {compare} from 'compare-versions'
import {clientVersions} from '../client-versions'

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

  public nameControl: UntypedFormControl
  public readonly isLoading: Observable<boolean>
  public readonly averageEc: Observable<string>
  public readonly averageProofTimeInSeconds: Observable<string>
  public readonly totalValidShares: Observable<string>
  public readonly totalStaleShares: Observable<string>
  public readonly totalValidSharesPercentage: Observable<string>
  public readonly totalStaleSharesPercentage: Observable<string>
  public readonly staleSharesColorClasses: Observable<string[]>
  public readonly sharesChartOptions: EChartsOption
  public sharesChartUpdateOptions: EChartsOption
  private readonly stats: Observable<HarvesterStats>
  private readonly statsSubject: BehaviorSubject<HarvesterStats|undefined> = new BehaviorSubject<HarvesterStats>(undefined)
  private statsUpdateInterval?: number
  private readonly subscriptions: Subscription[] = []

  constructor(
    private readonly accountService: AccountService,
    private readonly statsService: StatsService,
    private readonly toastService: ToastService,
  ) {
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
    this.averageProofTimeInSeconds = this.stats.pipe(
      map(stats => {
        const averageProofTimes = stats.submissionStats
          .map(stat => ({ partials: stat.partials, proofTimeSumInSeconds: stat.proofTimeSumInSeconds }))
          .concat(stats.rejectedSubmissionStats.map(stat => ({ partials: stat.partials, proofTimeSumInSeconds: stat.proofTimeSumInSeconds })))
          .filter(stat => stat.proofTimeSumInSeconds !== null && stat.partials > 0 && stat.proofTimeSumInSeconds > 0)

        const totalPartials = averageProofTimes.reduce((acc, curr) => acc.plus(curr.partials), new BigNumber(0))
        if (totalPartials.isZero()) {
          return 'N/A'
        }

        const averageProofTime = averageProofTimes
          .reduce((acc, curr) => acc.plus(curr.proofTimeSumInSeconds), new BigNumber(0))
          .dividedBy(totalPartials)

        return `${averageProofTime.toFixed(3)} s`
      }),
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
        formatter: this.tooltipFormatter.bind(this),
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
        barWidth: 6,
      }, {
        data: [],
        type: 'bar',
        stack: 'shares',
        name: 'Stale Shares',
        color: '#c98a1a',
        large: true,
        barWidth: 6,
      }, {
        data: [],
        type: 'bar',
        stack: 'shares',
        name: 'Valid Shares',
        color: '#037ffc',
        large: true,
        barWidth: 6,
      }, {
        data: [],
        type: 'line',
        name: 'Proof times',
        color: '#426b69',
        showSymbol: false,
        lineStyle: {
          width: 4,
          cap: 'round',
        },
        smooth: true,
        yAxisIndex: 1,
      }],
    }
    this.subscriptions.push(this.stats.subscribe(stats => {
      this.sharesChartUpdateOptions = this.makeSharesChartUpdateOptions(stats)
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
  }

  public get nameOrPeerIdSlug(): string {
    return this.harvester.name ?? this.peerIdSlug
  }

  public get peerIdSlug(): string {
    return stripHexPrefix(this.harvester.peerId).slice(0, 10)
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
    if (chiaVersion === 'Unknown') {
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

  public get chiaVersion(): string {
    if (this.harvester.versionInfo.clientName === null || this.harvester.versionInfo.clientName.indexOf('Chia') === -1) {
      return 'Unknown'
    }

    return this.harvester.versionInfo.clientVersion
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
      return this.harvester.versionInfo.localVersion1 || undefined
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
      return this.harvester.versionInfo.localVersion1 || undefined
    }
    if (this.harvester.versionInfo.localName2 === 'ff') {
      return this.harvester.versionInfo.localVersion2 || undefined
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
      return this.harvester.versionInfo.localVersion1 || undefined
    }
  }

  public get hasGigahorseVersion(): boolean {
    return this.gigahorseVersion !== undefined
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

  private async updateStats(): Promise<void> {
    this.statsSubject.next(await this.statsService.getHarvesterStats(this.harvester._id))
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
      if (stat.proofTimeSumInSeconds !== null && stat.partials > 0 && stat.proofTimeSumInSeconds > 0) {
        const proofTimeSumsForDate = proofTimeSumsByDate.get(stat.date) ?? []
        proofTimeSumsForDate.push({ partials: stat.partials, proofTimeSumInSeconds: stat.proofTimeSumInSeconds })
        proofTimeSumsByDate.set(stat.date, proofTimeSumsForDate)
      }
    })
    stats.rejectedSubmissionStats.forEach(stat => {
      if (stat.proofTimeSumInSeconds !== null && stat.partials > 0 && stat.proofTimeSumInSeconds > 0) {
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

  private tooltipFormatter(params): string {
    const seriesTooltip = params.map(series => {
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
}

interface ProofTimeSum {
  proofTimeSumInSeconds: number
  partials: number
}
