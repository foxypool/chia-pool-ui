import {Component, Input, OnDestroy, OnInit} from '@angular/core'
import {Harvester} from '../types'
import {FormControl} from '@angular/forms'
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

  public nameControl: FormControl
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
        selected: {
          'Invalid Shares': true,
          'Stale Shares': true,
          'Valid Shares': true,
        },
        top: 25,
        textStyle: {
          color: '#cfd0d1',
        },
      },
      grid: {
        left: 30,
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
    this.nameControl = new FormControl(this.harvester.name)
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
    const newName = this.nameControl.value.trim() || undefined
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

    const makeMissingLeadingData = (series: (string | number)[][], fallbackDate: string) => {
      const missingDataLeading = []
      const lastDate = series.length > 0 ? series[0][0] : fallbackDate
      if (moment(lastDate).isAfter(moment().subtract(23, 'hours'))) {
        let startDate = moment(lastDate).subtract(15, 'minutes')
        while (startDate.isAfter(moment().subtract(1, 'day'))) {
          missingDataLeading.unshift([startDate.toISOString(), 0])
          startDate = startDate.subtract(15, 'minutes')
        }
      }

      return missingDataLeading
    }
    const makeMissingTrailingData = (series: (string | number)[][], fallbackDate: string) => {
      const missingDataTrailing = []
      const latestDate = series.length > 0 ? series[series.length - 1][0] : fallbackDate
      if (moment(latestDate).isBefore(moment().subtract(1, 'hours'))) {
        let endDate = moment(latestDate).add(15, 'minutes')
        while (endDate.isBefore(moment())) {
          missingDataTrailing.push([endDate.toISOString(), 0])
          endDate = endDate.add(15, 'minutes')
        }
      }

      return missingDataTrailing
    }

    let latestDate: string
    if (validSharesSeries.length > 0) {
      latestDate = validSharesSeries[validSharesSeries.length - 1][0] as string
    } else if (staleSharesSeries.length > 0) {
      latestDate = staleSharesSeries[staleSharesSeries.length - 1][0] as string
    } else if (invalidSharesSeries.length > 0) {
      latestDate = invalidSharesSeries[invalidSharesSeries.length - 1][0] as string
    } else {
      latestDate = (new Date()).toISOString()
    }

    return {
      series: [{
        data: makeMissingLeadingData(invalidSharesSeries, latestDate).concat(invalidSharesSeries, makeMissingTrailingData(invalidSharesSeries, latestDate)),
      }, {
        data: makeMissingLeadingData(staleSharesSeries, latestDate).concat(staleSharesSeries, makeMissingTrailingData(staleSharesSeries, latestDate)),
      }, {
        data: makeMissingLeadingData(validSharesSeries, latestDate).concat(validSharesSeries, makeMissingTrailingData(validSharesSeries, latestDate)),
      }],
    };
  }
}
