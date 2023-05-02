import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core'
import {faCircleNotch, faInfoCircle} from '@fortawesome/free-solid-svg-icons'
import * as moment from 'moment'
import {BigNumber} from 'bignumber.js'
import {EChartsOption} from 'echarts'
import {YAXisOption} from 'echarts/types/dist/shared'
import {ActivatedRoute, Router} from '@angular/router'
import {distinctUntilChanged, map, shareReplay, skip} from 'rxjs/operators'
import {Observable, Subscription} from 'rxjs'

import {StatsService} from '../stats.service'
import {ToastService} from '../toast.service'
import {SnippetService} from '../snippet.service'
import Capacity from '../capacity'
import {AccountService} from '../account.service'
import {AuthenticationModalComponent} from '../authentication-modal/authentication-modal.component'
import {RatesService} from '../rates.service'
import {ConfigService, DateFormatting} from '../config.service'
import { getEffortColor } from '../util'
import {PoolsProvider} from '../pools.provider'
import {AccountHistoricalStat} from '../api.service'
import {SettingsModalComponent} from '../settings-modal/settings-modal.component'
import {RankInfo} from '../types'

@Component({
  selector: 'app-my-farmer',
  templateUrl: './my-farmer.component.html',
  styleUrls: ['./my-farmer.component.scss']
})
export class MyFarmerComponent implements OnInit, OnDestroy {
  @ViewChild(AuthenticationModalComponent) authenticationModal
  @ViewChild(SettingsModalComponent) settingsModal

  public poolConfig:any = {}
  public poolPublicKeyInput = null
  public faCircleNotch = faCircleNotch
  public faInfoCircle = faInfoCircle

  public ecChartOptions: EChartsOption
  public ecChartUpdateOptions: EChartsOption

  public sharesChartOptions: EChartsOption
  public sharesChartUpdateOptions: EChartsOption

  public readonly totalValidShares: Observable<string>
  public readonly totalInvalidShares: Observable<string>
  public readonly totalStaleShares: Observable<string>
  public readonly totalValidSharesPercentage: Observable<string>
  public readonly totalInvalidSharesPercentage: Observable<string>
  public readonly totalStaleSharesPercentage: Observable<string>
  public readonly staleSharesColorClasses: Observable<string[]>
  public readonly invalidSharesColorClasses: Observable<string[]>

  public isAccountLoading: Observable<boolean> = this.accountService.accountSubject
    .asObservable()
    .pipe(
      map(account => !account || !account.payoutAddress),
      distinctUntilChanged(),
      shareReplay(),
    )
  public payoutDateFormattingObservable: Observable<DateFormatting>
  public selectedCurrencyObservable: Observable<string>
  public exchangeStatsObservable: Observable<unknown>
  public averageEffortFormatted: Observable<string>
  public averageEffortColorClass: Observable<string>

  private poolEc = 0
  private dailyRewardPerPib = 0
  private networkSpaceInTiB = 0
  private currentHeight = 0

  private readonly historicalIntervalInMinutes = 15
  private readonly currentEcSeriesName = 'Current Effective Capacity'
  private readonly averageEcSeriesName = 'Average Effective Capacity'

  private readonly subscriptions: Subscription[] = [
    this.route.params.subscribe(async params => {
      if (params.poolPublicKey) {
        this.accountService.poolPublicKey = params.poolPublicKey
        this.accountService.isMyFarmerPage = false
      } else {
        this.accountService.isMyFarmerPage = true
        if (this.accountService.poolPublicKey !== this.accountService.poolPublicKeyFromLocalStorage) {
          this.accountService.poolPublicKey = this.accountService.poolPublicKeyFromLocalStorage
        }
      }
      await this.initAccount()
    }),
    this.accountService.accountHistoricalStats
      .pipe(skip(1))
      .subscribe(historicalStats => {
        this.ecChartUpdateOptions = this.makeEcChartUpdateOptions(historicalStats)
        this.sharesChartUpdateOptions = this.makeSharesChartUpdateOptions(historicalStats)
      }),
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig)),
    this.statsService.accountStats.asObservable().subscribe(accountStats => this.poolEc = accountStats.ecSum),
    this.statsService.rewardStats.asObservable().subscribe(rewardStats => this.dailyRewardPerPib = rewardStats.dailyRewardPerPiB),
    this.statsService.poolStats.asObservable().subscribe((poolStats => {
      this.currentHeight = poolStats.height
      this.networkSpaceInTiB = poolStats.networkSpaceInTiB
    })),
  ]
  private accountUpdateInterval: number = null
  private accountHistoricalUpdateInterval: number = null
  private accountWonBlocksUpdateInterval: number = null
  private accountPayoutsUpdateInterval: number = null

  constructor(
    public snippetService: SnippetService,
    public accountService: AccountService,
    public statsService: StatsService,
    private readonly toastService: ToastService,
    public ratesService: RatesService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly poolsProvider: PoolsProvider,
    configService: ConfigService,
  ) {
    this.ecChartOptions = {
      title: {
        text: this.snippetService.getSnippet('my-farmer-component.ec-chart.title'),
        left: 'center',
        top: 0,
        textStyle: {
          color: '#cfd0d1'
        }
      },
      legend: {
        data: [
          this.currentEcSeriesName,
          this.averageEcSeriesName,
        ],
        top: 25,
        textStyle: {
          color: '#cfd0d1',
        },
        tooltip: {
          show: true,
          backgroundColor: '#151517',
          borderWidth: 0,
          padding: 7,
          textStyle: {
            color: '#cfd0d1',
          },
          formatter: params => {
            if (params.name === this.currentEcSeriesName) {
              return 'Uses the last 1h of partials'
            }

            return 'Uses the last 24h of partials'
          },
        },
      },
      grid: {
        left: 65,
        top: this.ecChartTopMargin,
        right: 15,
        bottom: 20,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            formatter: params => {
              if (params.axisDimension === 'x') {
                return moment(params.value).format('YYYY-MM-DD HH:mm')
              }

              return `${(params.value as number).toFixed(1)} GiB`
            },
          },
        },
      },
      xAxis: {
        type: 'time',
        minInterval: this.historicalIntervalInMinutes * 60 * 1000,
      },
      yAxis: {
        type: 'value',
        name: 'Capacity',
        axisLabel : {
          formatter: '{value} GiB',
        },
        splitLine: {
          lineStyle: {
            type: 'solid',
            color: 'grey',
          },
        },
      },
      series: [{
        data: [],
        type: 'line',
        name: this.currentEcSeriesName,
        symbol: 'none',
        smooth: true,
        color: '#037ffc',
        lineStyle: {
          width: 4,
          cap: 'round',
        },
      }, {
        data: [],
        type: 'line',
        name: this.averageEcSeriesName,
        symbol: 'none',
        smooth: true,
        color: '#4bd28f',
        lineStyle: {
          width: 4,
          cap: 'round',
        },
      }],
    }
    this.sharesChartOptions = {
      legend: {
        data: [
          this.snippetService.getSnippet('my-farmer-component.shares-chart.valid-shares.name'),
          this.snippetService.getSnippet('my-farmer-component.shares-chart.stale-shares.name'),
          this.snippetService.getSnippet('my-farmer-component.shares-chart.invalid-shares.name'),
          this.snippetService.getSnippet('my-farmer-component.shares-chart.difficulty.name'),
          this.snippetService.getSnippet('my-farmer-component.shares-chart.partials.name'),
        ],
        top: 10,
        textStyle: {
          color: '#cfd0d1',
        },
      },
      grid: {
        left: 65,
        top: this.shareChartTopMargin,
        right: 40,
        bottom: 20,
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'time',
        minInterval: this.historicalIntervalInMinutes * 60 * 1000,
      },
      yAxis: this.makeShareChartYAxis({ isShowingDifficultySeries: true }),
      series: [{
        data: [],
        type: 'bar',
        stack: 'shares',
        name: this.snippetService.getSnippet('my-farmer-component.shares-chart.valid-shares.name'),
        color: '#037ffc',
        large: true,
        barWidth: 6,
      }, {
        data: [],
        type: 'bar',
        stack: 'shares',
        name: this.snippetService.getSnippet('my-farmer-component.shares-chart.stale-shares.name'),
        color: '#c98a1a',
        large: true,
        barWidth: 6,
      }, {
        data: [],
        type: 'bar',
        stack: 'shares',
        name: this.snippetService.getSnippet('my-farmer-component.shares-chart.invalid-shares.name'),
        color: '#dc3545',
        large: true,
        barWidth: 6,
      }, {
        data: [],
        type: 'line',
        name: this.snippetService.getSnippet('my-farmer-component.shares-chart.difficulty.name'),
        color: '#fac858',
        symbol: 'none',
        smooth: true,
        yAxisIndex: 1,
      }, {
        data: [],
        type: 'line',
        name: this.snippetService.getSnippet('my-farmer-component.shares-chart.partials.name'),
        color: '#46e8eb',
        symbol: 'none',
        yAxisIndex: 1,
        smooth: true,
        lineStyle: {
          type: 'dotted',
        },
      }],
    }
    this.payoutDateFormattingObservable = configService.payoutDateFormattingSubject.asObservable()
    this.selectedCurrencyObservable = configService.selectedCurrencySubject.asObservable()
    this.exchangeStatsObservable = this.statsService.exchangeStats.asObservable()
    const sharesStream = this.accountService.accountHistoricalStats
      .pipe(
        skip(1),
        map(historicalStats => {
          const totalValidShares = historicalStats.reduce((acc, curr) => acc.plus(curr.shares), new BigNumber(0))
          const totalInvalidShares = historicalStats.reduce((acc, curr) => acc.plus(curr.invalidShares), new BigNumber(0))
          const totalStaleShares = historicalStats.reduce((acc, curr) => acc.plus(curr.staleShares), new BigNumber(0))
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
    this.totalInvalidShares = sharesStream.pipe(map(stream => stream.totalInvalidShares.toNumber().toLocaleString('en')), shareReplay())
    this.totalInvalidSharesPercentage = sharesStream.pipe(map(stream => stream.totalInvalidShares.dividedBy(BigNumber.max(stream.totalShares, 1)).multipliedBy(100).toFixed(2)), shareReplay())
    this.invalidSharesColorClasses = sharesStream.pipe(map(stream => stream.totalInvalidShares.isZero() ? [] : ['color-red']), shareReplay())
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
    const averageEffort: Observable<BigNumber|undefined> = this.accountService
      .accountWonBlocks
      .pipe(
        map(accountWonBlocks => {
          const blocksWithEffort = accountWonBlocks.filter(block => block.effort !== null)
          if (blocksWithEffort.length === 0) {
            return
          }

          return blocksWithEffort
            .reduce((acc, curr) => acc.plus(curr.effort), new BigNumber(0))
            .dividedBy(blocksWithEffort.length)
        }),
        shareReplay(),
      )
    this.averageEffortFormatted = averageEffort.pipe(
      map(averageEffort => {
        if (averageEffort === undefined) {
          return 'N/A'
        }

        return `${averageEffort.multipliedBy(100).toFixed(2)} %`
      }),
      shareReplay(),
    )
    this.averageEffortColorClass = averageEffort.pipe(
      map(averageEffort => getEffortColor(averageEffort)),
      shareReplay(),
    )
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
    if (this.accountUpdateInterval) {
      clearInterval(this.accountUpdateInterval)
    }
    if (this.accountHistoricalUpdateInterval) {
      clearInterval(this.accountHistoricalUpdateInterval)
    }
    if (this.accountWonBlocksUpdateInterval) {
      clearInterval(this.accountWonBlocksUpdateInterval)
    }
    if (this.accountPayoutsUpdateInterval) {
      clearInterval(this.accountPayoutsUpdateInterval)
    }

    if (this.accountService.isMyFarmerPage) {
      return
    }

    this.accountService.clearStats()
  }

  public async ngOnInit(): Promise<void> {
    this.accountUpdateInterval = setInterval(async () => {
      if (!this.accountService.havePoolPublicKey) {
        return
      }
      await this.accountService.updateAccount()
    }, 3 * 60 * 1000)
    this.accountHistoricalUpdateInterval = setInterval(async () => {
      if (!this.accountService.havePoolPublicKey) {
        return
      }
      await this.accountService.updateAccountHistoricalStats()
    }, (this.historicalIntervalInMinutes + 1) * 60 * 1000)
    this.accountWonBlocksUpdateInterval = setInterval(async () => {
      if (!this.accountService.havePoolPublicKey) {
        return
      }
      await this.accountService.updateAccountWonBlocks()
    }, 11 * 60 * 1000)
    this.accountPayoutsUpdateInterval = setInterval(async () => {
      if (!this.accountService.havePoolPublicKey) {
        return
      }
      await this.accountService.updateAccountPayouts()
    }, 11 * 60 * 1000)
  }

  public onSharesChartLegendSelectChanged(event): void {
    const isShowingDifficultySeries = event.selected.Difficulty
    const yAxis = this.makeShareChartYAxis({ isShowingDifficultySeries })
    if (this.sharesChartUpdateOptions !== undefined) {
      this.sharesChartUpdateOptions = {
        ...this.sharesChartUpdateOptions,
        yAxis,
      }
    } else {
      this.sharesChartUpdateOptions = { yAxis }
    }
  }

  private makeShareChartYAxis({ isShowingDifficultySeries }: { isShowingDifficultySeries: boolean }): YAXisOption[] {
    return [{
      type: 'value',
      name: this.snippetService.getSnippet('my-farmer-component.shares-chart.shares.name'),
      splitLine: {
        lineStyle: {
          type: 'solid',
          color: 'grey',
        },
      },
    }, {
      type: 'value',
      name: isShowingDifficultySeries ? this.snippetService.getSnippet('my-farmer-component.shares-chart.difficulty.name') : 'Partials',
      splitLine: {
        show: false,
      },
    }]
  }

  private async initAccount() {
    if (!this.accountService.havePoolPublicKey) {
      return
    }
    await this.accountService.updateAccount()
    if (!this.accountService.haveAccount) {
      if (!this.accountService.isMyFarmerPage) {
        await new Promise(resolve => setTimeout(resolve, 500))
        await this.router.navigate(['/'])
      }

      return
    }
    await Promise.all([
      this.accountService.updateAccountHistoricalStats(),
      this.accountService.updateAccountWonBlocks(),
      this.accountService.updateAccountPayouts(),
    ])
  }

  public get rowClasses(): string[] {
    const xxxxlColumns = this.accountService.account?.collateral !== undefined ? 8 : 7

    return [
      `row-cols-xxxxl-${xxxxlColumns}`,
    ]
  }

  public get currentEffort(): BigNumber | null {
    if (this.accountService.accountWonBlocks.value.length === 0 || !this.accountService.account.ec || !this.currentHeight || !this.networkSpaceInTiB) {
      return null
    }

    const lastWonBlockHeight = this.accountService.accountWonBlocks.value[0].height
    const passedBlocks = this.currentHeight - lastWonBlockHeight
    const chanceToWinABlock = (new BigNumber(this.accountService.account.ec)).dividedBy(1024).dividedBy(this.networkSpaceInTiB)
    const blockCountFor100PercentEffort = new BigNumber(1).dividedBy(chanceToWinABlock)

    return (new BigNumber(passedBlocks)).dividedBy(blockCountFor100PercentEffort)
  }

  public get currentEffortFormatted(): string {
    const effort = this.currentEffort
    if (effort === null) {
      return 'N/A'
    }

    return `${effort.multipliedBy(100).toFixed(2)} %`
  }

  public getEffortColor(effort: BigNumber | null): string {
    return getEffortColor(effort)
  }

  public get tenureRankInfo(): RankInfo|undefined {
    if (this.accountService.account === null || this.accountService.account.hasLeftThePool || this.accountService.account.isCheating) {
      return
    }
    const farmingSince = this.accountService.account.rejoinedAt || this.accountService.account.createdAt
    if (moment().diff(farmingSince, 'years') >= 3) {
      return {
        imageFileName: '3-years.png',
        imageAlt: '3+ years farming',
      }
    }
    if (moment().diff(farmingSince, 'years') >= 2) {
      return {
        imageFileName: '2-years.png',
        imageAlt: '2+ years farming',
      }
    }
    if (moment().diff(farmingSince, 'years') >= 1) {
      return {
        imageFileName: '1-year.png',
        imageAlt: '1+ years farming',
      }
    }
    if (moment().diff(farmingSince, 'months') >= 6) {
      return {
        imageFileName: '6-months.png',
        imageAlt: '6+ months farming',
      }
    }
    if (moment().diff(farmingSince, 'months') >= 3) {
      return {
        imageFileName: '3-months.png',
        imageAlt: '3+ months farming',
      }
    }
    if (moment().diff(farmingSince, 'months') >= 2) {
      return {
        imageFileName: '2-months.png',
        imageAlt: '2+ months farming',
      }
    }
    if (moment().diff(farmingSince, 'months') >= 1) {
      return {
        imageFileName: '1-month.png',
        imageAlt: '1+ months farming',
      }
    }

    return {
      imageFileName: 'less-than-a-month.png',
      imageAlt: 'Farming for less than a month',
    }
  }

  public get topNRankInfo(): RankInfo|undefined {
    if (this.accountService.account === null || this.accountService.account.rank === undefined) {
      return
    }
    const rank = this.accountService.account.rank
    if (rank <= 10) {
      return {
        imageFileName: 'top-10.png',
        imageAlt: 'Top 10',
      }
    }
    if (rank <= 100) {
      return {
        imageFileName: 'top-100.png',
        imageAlt: 'Top 100',
      }
    }
  }

  public get capacityRankInfo(): RankInfo|undefined {
    if (this.accountService.account === null) {
      return
    }
    const capacityInTib = new BigNumber(this.accountService.account.ec).dividedBy(1024)
    const capacityInPib = capacityInTib.dividedBy(1024)
    if (capacityInPib.isGreaterThanOrEqualTo(10)) {
      return {
        imageFileName: '10-pib.png',
        imageAlt: '10+ PiB',
      }
    }
    if (capacityInPib.isGreaterThanOrEqualTo(5)) {
      return {
        imageFileName: '5-pib.png',
        imageAlt: '5+ PiB',
      }
    }
    if (capacityInPib.isGreaterThanOrEqualTo(1)) {
      return {
        imageFileName: '1-pib.png',
        imageAlt: '1+ PiB',
      }
    }
    if (capacityInTib.isGreaterThanOrEqualTo(500)) {
      return {
        imageFileName: '500-tib.png',
        imageAlt: '500+ TiB',
      }
    }
    if (capacityInTib.isGreaterThanOrEqualTo(250)) {
      return {
        imageFileName: '250-tib.png',
        imageAlt: '250+ TiB',
      }
    }
    if (capacityInTib.isGreaterThanOrEqualTo(100)) {
      return {
        imageFileName: '100-tib.png',
        imageAlt: '100+ TiB',
      }
    }
    if (capacityInTib.isGreaterThanOrEqualTo(50)) {
      return {
        imageFileName: '50-tib.png',
        imageAlt: '50+ TiB',
      }
    }
    if (capacityInTib.isGreaterThanOrEqualTo(10)) {
      return {
        imageFileName: '10-tib.png',
        imageAlt: '10+ TiB',
      }
    }
    if (capacityInTib.isGreaterThan(0)) {
      return {
        imageFileName: 'less-than-10-tib.png',
        imageAlt: 'less than 10 TiB',
      }
    }
  }

  public get joinedFirstYear(): boolean {
    if (this.accountService.account === null) {
      return false
    }

    return moment(this.accountService.account.createdAt).isBefore('2022-06-13T00:00:00.000Z')
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

  private get ecChartTopMargin(): number {
    if (window.innerWidth >= 600) {
      return 50
    }
    if (window.innerWidth >= 450) {
      return 75
    }

    return 99
  }

  private get minimumPayout() {
    if (this.accountService.account && this.accountService.account.minimumPayout) {
      return this.accountService.account.minimumPayout
    }
    if (this.poolConfig.minimumPayout) {
      return this.poolConfig.minimumPayout
    }

    return 0
  }

  public get pendingProgressRaw(): number {
    if (!this.accountService.account || !this.minimumPayout) {
      return 0
    }

    return this.accountService.account.pendingBN
      .dividedBy(this.minimumPayout)
      .multipliedBy(100)
      .toNumber()
  }

  public get pendingProgress(): number {
    const progress = this.pendingProgressRaw

    return Math.min(progress, 100)
  }

  public get timeTillMinimumPayoutReached(): string {
    const remainingAmount = (new BigNumber(this.minimumPayout)).minus(this.accountService.account.pendingBN)
    if (remainingAmount.isLessThanOrEqualTo(0)) {
      return 'now'
    }
    if (this.estimatedDailyRewardBN.isZero()) {
      return 'in unknown time'
    }
    const remainingHours = remainingAmount.dividedBy(this.estimatedDailyRewardBN).multipliedBy(24)

    return moment.duration(remainingHours.toNumber(), 'hours').humanize(true)
  }

  public get timeTillNextPayout(): string {
    let payoutDate = moment().utc().set({ hours: 12, minutes: 0, seconds: 0, milliseconds: 0 })
    if (moment().isAfter(payoutDate)) {
      payoutDate = payoutDate.add(1, 'day')
    }

    return payoutDate.fromNow()
  }

  public get collateralProgressRaw(): number {
    if (!this.accountService.account || !this.accountService.account.collateralBN || !this.poolConfig.poolRewardPortion) {
      return 0
    }

    return this.accountService.account.collateralBN
      .dividedBy(this.poolConfig.poolRewardPortion)
      .multipliedBy(100)
      .toNumber()
  }

  public get collateralProgress(): number {
    const progress = this.collateralProgressRaw

    return Math.min(progress, 100)
  }

  public get timeTillCollateralReached(): string {
    if (this.poolConfig.poolRewardPortion === undefined || this.accountService.account === null) {
      return 'N/A'
    }
    const remainingAmount = (new BigNumber(this.poolConfig.poolRewardPortion)).minus(this.accountService.account.collateralBN)
    if (remainingAmount.isLessThanOrEqualTo(0)) {
      return 'now'
    }
    if (this.estimatedDailyRewardBN.isZero()) {
      return 'in unknown time'
    }
    const remainingHours = remainingAmount.dividedBy(this.estimatedDailyRewardBN).multipliedBy(24)

    return moment.duration(remainingHours.toNumber(), 'hours').humanize(true)
  }

  public get isCollateralFilledOrNonExistent(): boolean {
    if (this.accountService.account === null || this.accountService.account.collateral === undefined) {
      return true
    }

    return this.collateralProgress === 100
  }

  private makeEcChartUpdateOptions(historicalStats: AccountHistoricalStat[]): EChartsOption {
    const biggestEc = historicalStats.reduce((acc, curr) => {
      const currBiggestEc = (curr.ecLastHour || 0) > curr.ec ? curr.ecLastHour : curr.ec

      return acc > currBiggestEc ? acc : currBiggestEc
    }, 0)
    const { unit, unitIndex } = this.getUnitForCapacity(biggestEc)
    const ecInLastHourSeries = historicalStats.map(stats => [stats.createdAt, (new BigNumber(stats.ecLastHour || 0)).dividedBy((new BigNumber(1024)).exponentiatedBy(unitIndex)).decimalPlaces(2).toNumber()])
    const ecSeries = historicalStats.map(stats => [stats.createdAt, (new BigNumber(stats.ec)).dividedBy((new BigNumber(1024)).exponentiatedBy(unitIndex)).decimalPlaces(2).toNumber()])
    const lastDate = historicalStats.length > 0 ? historicalStats[0].createdAt : new Date()
    const missingDataLeading = []
    if (moment(lastDate).isAfter(moment().subtract(23, 'hours'))) {
      let startDate = moment(lastDate).subtract(this.historicalIntervalInMinutes, 'minutes')
      while (startDate.isAfter(moment().subtract(1, 'day'))) {
        missingDataLeading.unshift([startDate.toISOString(), 0])
        startDate = startDate.subtract(this.historicalIntervalInMinutes, 'minutes')
      }
    }
    const latestDate = historicalStats.length > 0 ? historicalStats[historicalStats.length - 1].createdAt : new Date()
    const missingDataTrailing = []
    if (moment(latestDate).isBefore(moment().subtract(1, 'hours'))) {
      let endDate = moment(latestDate).add(this.historicalIntervalInMinutes, 'minutes')
      while (endDate.isBefore(moment())) {
        missingDataTrailing.push([endDate.toISOString(), 0])
        endDate = endDate.add(this.historicalIntervalInMinutes, 'minutes')
      }
    }

    return {
      tooltip: {
        formatter: this.ecChartTooltipFormatter.bind(this, unit),
        axisPointer: {
          label: {
            formatter: params => {
              if (params.axisDimension === 'x') {
                return moment(params.value).format('YYYY-MM-DD HH:mm')
              }

              return `${(params.value as number).toFixed(1)} ${unit}`
            },
          },
        },
      },
      yAxis: {
        axisLabel: {
          formatter: `{value} ${unit}`,
        },
      },
      series: [{
        data: missingDataLeading.concat(ecInLastHourSeries, missingDataTrailing),
      },{
        data: missingDataLeading.concat(ecSeries, missingDataTrailing),
      }],
    }
  }

  private makeSharesChartUpdateOptions(historicalStats: AccountHistoricalStat[]): EChartsOption {
    const historicalSharesSeries = historicalStats.map(stats => [stats.createdAt, stats.shares])
    const historicalStaleSharesSeries = historicalStats.map(stats => [stats.createdAt, stats.staleShares || 0])
    const historicalInvalidSharesSeries = historicalStats.map(stats => [stats.createdAt, stats.invalidShares || 0])
    const historicalShareCountSeries = historicalStats.map(stats => [stats.createdAt, stats.shareCount])
    const historicalDifficultySeries = historicalStats.map(stats => [stats.createdAt, stats.difficulty])
    const lastDate = historicalStats.length > 0 ? historicalStats[0].createdAt : new Date()
    const missingSharesDataLeading = []
    const missingShareCountDataLeading = []
    const missingDifficultyDataLeading = []
    if (moment(lastDate).isAfter(moment().subtract(23, 'hours'))) {
      let startDate = moment(lastDate).subtract(this.historicalIntervalInMinutes, 'minutes')
      while (startDate.isAfter(moment().subtract(1, 'day'))) {
        missingSharesDataLeading.unshift([startDate.toISOString(), 0])
        missingShareCountDataLeading.unshift([startDate.toISOString(), 0])
        missingDifficultyDataLeading.unshift([startDate.toISOString(), 1])
        startDate = startDate.subtract(this.historicalIntervalInMinutes, 'minutes')
      }
    }
    const latestDate = historicalStats.length > 0 ? historicalStats[historicalStats.length - 1].createdAt : new Date()
    const missingSharesDataTrailing = []
    const missingShareCountDataTrailing = []
    const missingDifficultyDataTrailing = []
    if (moment(latestDate).isBefore(moment().subtract(1, 'hours'))) {
      let endDate = moment(latestDate).add(this.historicalIntervalInMinutes, 'minutes')
      while (endDate.isBefore(moment())) {
        missingSharesDataTrailing.push([endDate.toISOString(), 0])
        missingShareCountDataTrailing.push([endDate.toISOString(), 0])
        missingDifficultyDataTrailing.push([endDate.toISOString(), 1])
        endDate = endDate.add(this.historicalIntervalInMinutes, 'minutes')
      }
    }

    return {
      series: [{
        data: missingSharesDataLeading.concat(historicalSharesSeries, missingSharesDataTrailing),
      }, {
        data: missingSharesDataLeading.concat(historicalStaleSharesSeries, missingSharesDataTrailing),
      }, {
        data: missingSharesDataLeading.concat(historicalInvalidSharesSeries, missingSharesDataTrailing),
      }, {
        data: missingDifficultyDataLeading.concat(historicalDifficultySeries, missingDifficultyDataTrailing),
      }, {
        data: missingShareCountDataLeading.concat(historicalShareCountSeries, missingShareCountDataTrailing),
      }],
    }
  }

  private ecChartTooltipFormatter(unit, params) {
    return params.map(series => {
      return `${series.marker}${series.seriesName} <span style="padding-left: 10px; float: right"><strong>${series.value[1]} ${unit}</strong></span>`
    }).join('<br/>')
  }

  private getUnitForCapacity(capacityInGib) {
    let unitIndex = 0
    const units = ['GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
    while (capacityInGib >= 1024) {
      capacityInGib /= 1024
      unitIndex += 1
    }

    return {
      unitIndex,
      unit: units[unitIndex],
    }
  }

  async login() {
    if (!this.poolPublicKeyInput) {
      this.toastService.showErrorToast(this.snippetService.getSnippet('my-farmer-component.pool-pk-input.error.missing'))
      return
    }
    const success: boolean = await this.accountService.login({ poolPublicKey: this.poolPublicKeyInput })
    if (!success) {
      return
    }
    this.poolPublicKeyInput = null
  }

  getFormattedCapacity(capacityInGiB) {
    if (capacityInGiB === 0) {
      return this.snippetService.getSnippet('general.not-available.short')
    }

    return (new Capacity(capacityInGiB)).toString()
  }

  getLastAcceptedPartialAtDuration(lastAcceptedPartialAt) {
    if (!lastAcceptedPartialAt) {
      return 'Never'
    }

    return moment(lastAcceptedPartialAt).fromNow()
  }

  get ecShare() {
    if (!this.accountService.account || !this.poolEc) {
      return 0
    }

    return ((this.accountService.account.ec / this.poolEc) * 100).toFixed(2)
  }

  public get rank(): number|undefined {
    return this.accountService.account?.rank
  }

  public get estimatedDailyReward(): string {
    return this.estimatedDailyRewardBN.toFixed(4)
  }

  private get estimatedDailyRewardBN(): BigNumber {
    if (!this.accountService.account || !this.dailyRewardPerPib) {
      return new BigNumber(0)
    }
    const ecInPib = (new BigNumber(this.accountService.account.ec)).dividedBy((new BigNumber(1024).exponentiatedBy(2)))

    return ecInPib.multipliedBy(this.dailyRewardPerPib)
  }

  get canRejoinPool() {
    if (!this.accountService.account) {
      return false
    }
    const account = this.accountService.account
    if (!account.hasLeftThePool) {
      return false
    }

    return account.collateral === undefined || account.collateral !== '0'
  }

  async authenticate() {
    this.authenticationModal.openModal()
  }

  async openSettingsModal() {
    this.settingsModal.openModal()
  }

  async rejoinPool() {
    try {
      await this.accountService.rejoinPool()
      this.toastService.showSuccessToast(this.snippetService.getSnippet('my-farmer-component.rejoin-pool.success'))
    } catch (err) {
      this.toastService.showErrorToast(err.message)
    }
  }

  getBlockExplorerAddressLink(address) {
    if (!this.poolConfig || !this.poolConfig.blockExplorerAddressUrlTemplate) {
      return ''
    }

    return this.poolConfig.blockExplorerAddressUrlTemplate.replace('#ADDRESS#', address)
  }
}
