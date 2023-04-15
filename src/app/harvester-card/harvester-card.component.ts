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
  public readonly totalShares: Observable<string>
  public readonly sharesChartOptions: EChartsOption
  public sharesChartUpdateOptions: EChartsOption
  private readonly stats: Observable<HarvesterStats>
  private readonly statsSubject: BehaviorSubject<HarvesterStats|undefined> = new BehaviorSubject<HarvesterStats>(undefined)
  private statsUpdateInterval?: number
  private subscriptions: Subscription[] = []

  constructor(
    private accountService: AccountService,
    private statsService: StatsService,
    private toastService: ToastService,
  ) {
    this.stats = this.statsSubject.asObservable().pipe(filter(stats => stats !== undefined), shareReplay())
    this.isLoading = this.statsSubject.asObservable().pipe(map(stats => stats === undefined), distinctUntilChanged(), shareReplay())
    const totalShares = this.stats.pipe(
      map(stats => stats.submissionStats.reduce((acc, submissionStat) => acc.plus(submissionStat.shares), new BigNumber(0))),
      shareReplay(),
    )
    this.averageEc = totalShares.pipe(
      map(totalShares => {
        const ecInGib = totalShares
          .dividedBy(sharesPerDayPerK32)
          .multipliedBy(k32SizeInGib)

        return new Capacity(ecInGib.toNumber()).toString()
      }),
    )
    this.totalShares = totalShares.pipe(map(totalShares => totalShares.toNumber().toLocaleString()))
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
          'Invalid Shares',
          'Stale Shares',
          'Valid Shares',
        ],
        top: 25,
        textStyle: {
          color: '#cfd0d1',
        },
      },
      grid: {
        left: 45,
        top: this.shareChartTopMargin,
        right: 30,
        bottom: 20,
      },
      tooltip: {
        trigger: 'axis',
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
      }],
    }
    this.subscriptions.push(this.stats.subscribe(stats => {
      this.sharesChartUpdateOptions = this.makeSharesChartUpdateOptions(stats)
    }))
  }

  public async ngOnInit(): Promise<void> {
    this.nameControl = new UntypedFormControl(this.harvester.name)
    this.statsUpdateInterval = setInterval(this.updateStats.bind(this), 5 * 60 * 1000)
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
    return this.harvester.peerId.slice(2, 12)
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

  public get chiaVersion(): string {
    if (this.harvester.versionInfo.clientName === null || this.harvester.versionInfo.clientName.indexOf('Chia') === -1) {
      return 'Unknown'
    }

    return this.harvester.versionInfo.clientVersion
  }

  public get ogVersion(): string|undefined {
    if (this.harvester.versionInfo.localName1 === 'og') {
      return this.harvester.versionInfo.localVersion1 || undefined
    }
  }

  public get hasOgVersion(): boolean {
    return this.ogVersion !== undefined
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

  public get gigahorseVersion(): string|undefined {
    if (this.harvester.versionInfo.localName1 === 'giga') {
      return this.harvester.versionInfo.localVersion1 || undefined
    }
  }

  public get hasGigahorseVersion(): boolean {
    return this.gigahorseVersion !== undefined
  }

  public get xlRowColumnClass(): string {
    const cardCount = this.cardCount

    return `row-col-xl-${Math.min(6, cardCount)}`
  }

  private get cardCount(): number {
    let count = 4
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
      }],
    };
  }
}
