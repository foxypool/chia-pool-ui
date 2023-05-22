import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core'
import {faCircleNotch, faInfoCircle, faTriangleExclamation} from '@fortawesome/free-solid-svg-icons'
import * as moment from 'moment'
import {BigNumber} from 'bignumber.js'
import {EChartsOption} from 'echarts'
import {YAXisOption} from 'echarts/types/dist/shared'
import {ActivatedRoute, Router} from '@angular/router'
import {distinctUntilChanged, filter, map, mergeMap, shareReplay, skip, tap} from 'rxjs/operators'
import {BehaviorSubject, combineLatest, Observable, Subscription, takeWhile, timer} from 'rxjs'

import {StatsService} from '../stats.service'
import {ToastService} from '../toast.service'
import {SnippetService} from '../snippet.service'
import Capacity from '../capacity'
import {AccountService} from '../account.service'
import {AuthenticationModalComponent} from '../authentication-modal/authentication-modal.component'
import {RatesService} from '../rates.service'
import {ConfigService, DateFormatting, TimeInterval} from '../config.service'
import { getEffortColor } from '../util'
import {PoolsProvider} from '../pools.provider'
import {AccountHistoricalStat} from '../api.service'
import {SettingsModalComponent} from '../settings-modal/settings-modal.component'
import {BalanceProvider} from '../balance-provider'
import {fromPromise} from 'rxjs/internal/observable/innerFrom'
import {corePoolAddress, hpoolAddress} from '../known-addresses'

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
  public readonly faCircleNotch = faCircleNotch
  public readonly faInfoCircle = faInfoCircle
  public readonly faTriangleExclamation = faTriangleExclamation

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
  public readonly payoutAddressBalance: Observable<number>
  public readonly isLoadingPayoutAddressBalance: Observable<boolean>

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
  private readonly isUpdatingPayoutAddressBalance: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true)

  private readonly subscriptions: Subscription[] = [
    this.activatedRoute.params.subscribe(async params => {
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
  private accountUpdateInterval: ReturnType<typeof setInterval> = null
  private accountHistoricalUpdateInterval: ReturnType<typeof setInterval> = null
  private accountWonBlocksUpdateInterval: ReturnType<typeof setInterval> = null
  private accountPayoutsUpdateInterval: ReturnType<typeof setInterval> = null

  constructor(
    public snippetService: SnippetService,
    public accountService: AccountService,
    public statsService: StatsService,
    public ratesService: RatesService,
    private readonly toastService: ToastService,
    private readonly poolsProvider: PoolsProvider,
    private readonly activatedRoute: ActivatedRoute,
    private readonly router: Router,
    private readonly configService: ConfigService,
    private readonly balanceProvider: BalanceProvider,
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
        name: this.snippetService.getSnippet('my-farmer-component.shares-chart.invalid-shares.name'),
        color: '#dc3545',
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
        name: this.snippetService.getSnippet('my-farmer-component.shares-chart.valid-shares.name'),
        color: '#037ffc',
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
    this.payoutDateFormattingObservable = this.configService.payoutDateFormattingSubject.asObservable()
    this.selectedCurrencyObservable = this.configService.selectedCurrencySubject.asObservable()
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
    this.isLoadingPayoutAddressBalance = this.isUpdatingPayoutAddressBalance.pipe(
      distinctUntilChanged(),
      takeWhile(isLoading => isLoading, true),
      shareReplay(),
    )
    this.payoutAddressBalance = combineLatest([
      this.accountService.accountSubject
        .pipe(
          filter(account => account !== null),
          map(account => account.payoutAddress),
          distinctUntilChanged(),
        ),
      timer(0, 30 * 60 * 1000),
    ])
      .pipe(
        map(([payoutAddress]) => payoutAddress),
        tap(() => this.isUpdatingPayoutAddressBalance.next(true)),
        mergeMap(payoutAddress => fromPromise(this.balanceProvider.getBalance(payoutAddress))),
        tap(() => this.isUpdatingPayoutAddressBalance.next(false)),
        map(balance => balance.toNumber()),
        shareReplay({ refCount: true }),
      )
    // Add dummy subscribe to trigger stream
    this.subscriptions.push(this.payoutAddressBalance.subscribe(() => {}))
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

    if (this.isLoginTokenRequest) {
      await this.authenticateUsingTokenFromQueryParams()
      await this.router.navigate([])
    }
  }

  public trackBadgesBySrc(index: number, badge: Badge): string {
    return badge.imgSrcPath
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

  public get hasName(): boolean {
    if (this.accountService.account === null) {
      return false
    }

    return this.accountService.account.name !== undefined
  }

  public get badges(): Badge[] {
    const badges = [
      this.topNBadge,
      this.tenureBadge,
      this.capacityBadge,
      this.firstYearBadge,
    ]

    return badges.filter(badge => badge !== undefined)
  }

  private get topNBadge(): Badge|undefined {
    if (this.accountService.account === null || this.accountService.account.rank === undefined) {
      return
    }
    const rank = this.accountService.account.rank
    if (rank <= 10) {
      return {
        imgSrcPath: 'assets/top-n-ranks/top-10.png',
        description: 'Top 10',
      }
    }
    if (rank <= 100) {
      return {
        imgSrcPath: 'assets/top-n-ranks/top-100.png',
        description: 'Top 100',
      }
    }
  }

  private get tenureBadge(): Badge|undefined {
    if (this.accountService.account === null || this.accountService.account.hasLeftThePool || this.accountService.account.isCheating) {
      return
    }
    const farmingSince = this.accountService.account.rejoinedAt || this.accountService.account.createdAt
    if (moment().diff(farmingSince, 'years') >= 5) {
      return {
        imgSrcPath: 'assets/tenure-ranks/5-years.png',
        description: '5+ years farming',
      }
    }
    if (moment().diff(farmingSince, 'years') >= 3) {
      return {
        imgSrcPath: 'assets/tenure-ranks/3-years.png',
        description: '3+ years farming',
      }
    }
    if (moment().diff(farmingSince, 'years') >= 2) {
      return {
        imgSrcPath: 'assets/tenure-ranks/2-years.png',
        description: '2+ years farming',
      }
    }
    if (moment().diff(farmingSince, 'years') >= 1) {
      return {
        imgSrcPath: 'assets/tenure-ranks/1-year.png',
        description: '1+ years farming',
      }
    }
    if (moment().diff(farmingSince, 'months') >= 6) {
      return {
        imgSrcPath: 'assets/tenure-ranks/6-months.png',
        description: '6+ months farming',
      }
    }
    if (moment().diff(farmingSince, 'months') >= 3) {
      return {
        imgSrcPath: 'assets/tenure-ranks/3-months.png',
        description: '3+ months farming',
      }
    }
    if (moment().diff(farmingSince, 'months') >= 2) {
      return {
        imgSrcPath: 'assets/tenure-ranks/2-months.png',
        description: '2+ months farming',
      }
    }
    if (moment().diff(farmingSince, 'months') >= 1) {
      return {
        imgSrcPath: 'assets/tenure-ranks/1-month.png',
        description: '1+ months farming',
      }
    }

    return {
      imgSrcPath: 'assets/tenure-ranks/less-than-a-month.png',
      description: 'Farming for less than a month',
    }
  }

  private get capacityBadge(): Badge|undefined {
    if (this.accountService.account === null) {
      return
    }
    const capacityInTib = new BigNumber(this.accountService.account.ec).dividedBy(1024)
    const capacityInPib = capacityInTib.dividedBy(1024)
    if (capacityInPib.isGreaterThanOrEqualTo(10)) {
      return {
        imgSrcPath: 'assets/capacity-ranks/10-pib.png',
        description: '10+ PiB',
      }
    }
    if (capacityInPib.isGreaterThanOrEqualTo(5)) {
      return {
        imgSrcPath: 'assets/capacity-ranks/5-pib.png',
        description: '5+ PiB',
      }
    }
    if (capacityInPib.isGreaterThanOrEqualTo(1)) {
      return {
        imgSrcPath: 'assets/capacity-ranks/1-pib.png',
        description: '1+ PiB',
      }
    }
    if (capacityInTib.isGreaterThanOrEqualTo(500)) {
      return {
        imgSrcPath: 'assets/capacity-ranks/500-tib.png',
        description: '500+ TiB',
      }
    }
    if (capacityInTib.isGreaterThanOrEqualTo(250)) {
      return {
        imgSrcPath: 'assets/capacity-ranks/250-tib.png',
        description: '250+ TiB',
      }
    }
    if (capacityInTib.isGreaterThanOrEqualTo(100)) {
      return {
        imgSrcPath: 'assets/capacity-ranks/100-tib.png',
        description: '100+ TiB',
      }
    }
    if (capacityInTib.isGreaterThanOrEqualTo(50)) {
      return {
        imgSrcPath: 'assets/capacity-ranks/50-tib.png',
        description: '50+ TiB',
      }
    }
    if (capacityInTib.isGreaterThanOrEqualTo(10)) {
      return {
        imgSrcPath: 'assets/capacity-ranks/10-tib.png',
        description: '10+ TiB',
      }
    }
    if (capacityInTib.isGreaterThan(0)) {
      return {
        imgSrcPath: 'assets/capacity-ranks/less-than-10-tib.png',
        description: 'less than 10 TiB',
      }
    }
  }

  private get firstYearBadge(): Badge|undefined {
    if (this.accountService.account === null || moment(this.accountService.account.createdAt).isAfter('2022-06-13T00:00:00.000Z')) {
      return
    }

    return {
      imgSrcPath: 'assets/joined-first-year.png',
      description: 'Year 1 member',
    }
  }

  private get isLoginTokenRequest() {
    const accountIdentifier = this.activatedRoute.snapshot.queryParamMap.get('account_identifier')
    const token = this.activatedRoute.snapshot.queryParamMap.get('token')

    return accountIdentifier && token
  }

  private async authenticateUsingTokenFromQueryParams() {
    const accountIdentifier = this.activatedRoute.snapshot.queryParamMap.get('account_identifier')
    const token = this.activatedRoute.snapshot.queryParamMap.get('token')
    await this.accountService.loginUsingToken({ poolPublicKey: accountIdentifier, token })
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

  private get minimumPayout(): string|number {
    if (this.accountService.account) {
      const minimumPayout = this.accountService.account.minimumPayout
      const payoutMultiplesOf = this.accountService.account.payoutMultiplesOf
      if (minimumPayout !== undefined && payoutMultiplesOf !== undefined) {
        return BigNumber.max(minimumPayout, payoutMultiplesOf).toString()
      }
      if (minimumPayout !== undefined) {
        return minimumPayout
      }
      if (payoutMultiplesOf !== undefined) {
        return payoutMultiplesOf
      }
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
        data: missingSharesDataLeading.concat(historicalInvalidSharesSeries, missingSharesDataTrailing),
      }, {
        data: missingSharesDataLeading.concat(historicalStaleSharesSeries, missingSharesDataTrailing),
      }, {
        data: missingSharesDataLeading.concat(historicalSharesSeries, missingSharesDataTrailing),
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

  public get estimatedScaledReward(): string {
    switch (this.configService.rewardTimeInterval) {
      case TimeInterval.daily: return this.estimatedDailyRewardBN.toFixed(4)
      case TimeInterval.weekly: return this.estimatedDailyRewardBN.multipliedBy(7).toFixed(4)
      case TimeInterval.monthly: return this.estimatedDailyRewardBN.multipliedBy(31).toFixed(4)
    }
  }

  public get estimatedRewardIntervalLabel(): string {
    return this.configService.rewardTimeInterval
  }

  public cycleRewardInterval() {
    switch (this.configService.rewardTimeInterval) {
      case TimeInterval.daily:
        this.configService.rewardTimeInterval = TimeInterval.weekly
        break
      case TimeInterval.weekly:
        this.configService.rewardTimeInterval = TimeInterval.monthly
        break
      case TimeInterval.monthly:
        this.configService.rewardTimeInterval = TimeInterval.daily
        break
    }
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

  public get payoutAddressWarning(): string|undefined {
    if (this.accountService.account === null) {
      return
    }

    switch (this.accountService.account.payoutAddress) {
      case corePoolAddress: return 'Your payout address is set to Core-Pools reward address, please change it immediately!'
      case hpoolAddress: return  'Your payout address is set to HPools reward address, please change it immediately!'
    }
  }
}

interface Badge {
  imgSrcPath: string
  description: string
}
