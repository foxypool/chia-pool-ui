import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {faCircleNotch, faInfoCircle, faUserCheck} from '@fortawesome/free-solid-svg-icons';
import * as moment from 'moment';
import BigNumber from 'bignumber.js';
import {EChartsOption} from 'echarts';
import {YAXisOption} from 'echarts/types/dist/shared'
import {ActivatedRoute, Router} from '@angular/router';
import {distinctUntilChanged, map, shareReplay, skip} from 'rxjs/operators'
import {Observable, Subscription} from 'rxjs';

import {StatsService} from '../stats.service';
import {ToastService} from '../toast.service';
import {SnippetService} from '../snippet.service';
import Capacity from '../capacity';
import {AccountService} from '../account.service';
import {AuthenticationModalComponent} from '../authentication-modal/authentication-modal.component';
import {UpdateNameModalComponent} from '../update-name-modal/update-name-modal.component';
import {LeavePoolModalComponent} from '../leave-pool-modal/leave-pool-modal.component';
import {UpdateMinimumPayoutModalComponent} from '../update-minimum-payout-modal/update-minimum-payout-modal.component';
import {RatesService} from '../rates.service';
import {ConfigService, DateFormatting} from '../config.service'
import { getEffortColor } from '../util';
import {UpdateDifficultyModalComponent} from '../update-difficulty-modal/update-difficulty-modal.component'
import {
  UpdateNotificationSettingsModalComponent
} from '../update-notification-settings-modal/update-notification-settings-modal.component'
import {PoolsProvider} from '../pools.provider'
import {AccountHistoricalStat} from '../api.service'

@Component({
  selector: 'app-my-farmer',
  templateUrl: './my-farmer.component.html',
  styleUrls: ['./my-farmer.component.scss']
})
export class MyFarmerComponent implements OnInit, OnDestroy {
  @ViewChild(AuthenticationModalComponent) authenticationModal;
  @ViewChild(UpdateNameModalComponent) updateNameModal;
  @ViewChild(LeavePoolModalComponent) leavePoolModal;
  @ViewChild(UpdateMinimumPayoutModalComponent) updateMinimumPayoutModal;
  @ViewChild(UpdateDifficultyModalComponent) updateDifficultyModal
  @ViewChild(UpdateNotificationSettingsModalComponent) updateNotificationSettingsModal

  public poolConfig:any = {};
  public poolPublicKeyInput = null;
  public faCircleNotch = faCircleNotch;
  public faUserCheck = faUserCheck;
  public faInfoCircle = faInfoCircle;

  public ecChartOptions: EChartsOption;
  public ecChartUpdateOptions: EChartsOption;

  public sharesChartOptions: EChartsOption;
  public sharesChartUpdateOptions: EChartsOption;

  public readonly totalValidShares: Observable<string>
  public readonly totalInvalidShares: Observable<string>
  public readonly totalStaleShares: Observable<string>
  public readonly totalValidSharesPercentage: Observable<string>
  public readonly totalInvalidSharesPercentage: Observable<string>
  public readonly totalStaleSharesPercentage: Observable<string>

  public isAccountLoading: Observable<boolean> = this.accountService.accountSubject
    .asObservable()
    .pipe(
      map(account => !account || !account.payoutAddress),
      distinctUntilChanged(),
      shareReplay(),
    );
  public payoutDateFormattingObservable: Observable<DateFormatting>
  public selectedCurrencyObservable: Observable<string>
  public exchangeStatsObservable: Observable<unknown>

  private poolEc = 0;
  private dailyRewardPerPib = 0;
  private networkSpaceInTiB = 0
  private currentHeight = 0

  private historicalIntervalInMinutes = 15;
  private currentEcSeriesName = 'Current Effective Capacity'
  private averageEcSeriesName = 'Average Effective Capacity'

  private subscriptions: Subscription[] = [
    this.route.params.subscribe(async params => {
      if (params.poolPublicKey) {
        this.accountService.poolPublicKey = params.poolPublicKey;
        this.accountService.isMyFarmerPage = false;
      } else {
        this.accountService.isMyFarmerPage = true;
        if (this.accountService.poolPublicKey !== this.accountService.poolPublicKeyFromLocalStorage) {
          this.accountService.poolPublicKey = this.accountService.poolPublicKeyFromLocalStorage;
        }
      }
      await this.initAccount();
    }),
    this.accountService.accountHistoricalStats
      .pipe(skip(1))
      .subscribe(historicalStats => {
        this.ecChartUpdateOptions = this.makeEcChartUpdateOptions(historicalStats);
        this.sharesChartUpdateOptions = this.makeSharesChartUpdateOptions(historicalStats);
      }),
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig)),
    this.statsService.accountStats.asObservable().subscribe(accountStats => this.poolEc = accountStats.ecSum),
    this.statsService.rewardStats.asObservable().subscribe(rewardStats => this.dailyRewardPerPib = rewardStats.dailyRewardPerPiB),
    this.statsService.poolStats.asObservable().subscribe((poolStats => {
      this.currentHeight = poolStats.height
      this.networkSpaceInTiB = poolStats.networkSpaceInTiB
    })),
  ];
  private accountUpdateInterval: number = null;
  private accountHistoricalUpdateInterval: number = null;
  private accountWonBlocksUpdateInterval: number = null;
  private accountPayoutsUpdateInterval: number = null

  constructor(
    public snippetService: SnippetService,
    public accountService: AccountService,
    public statsService: StatsService,
    private toastService: ToastService,
    public ratesService: RatesService,
    private route: ActivatedRoute,
    private router: Router,
    private poolsProvider: PoolsProvider,
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
                return moment(params.value).format('YYYY-MM-DD HH:mm');
              }

              return `${(params.value as number).toFixed(1)} GiB`;
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
    };
    this.sharesChartOptions = {
      legend: {
        data: [
          this.snippetService.getSnippet('my-farmer-component.shares-chart.invalid-shares.name'),
          this.snippetService.getSnippet('my-farmer-component.shares-chart.stale-shares.name'),
          this.snippetService.getSnippet('my-farmer-component.shares-chart.valid-shares.name'),
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
    };
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
    this.totalValidSharesPercentage = sharesStream.pipe(map(stream => stream.totalValidShares.dividedBy(stream.totalShares).multipliedBy(100).toFixed(2)), shareReplay())
    this.totalInvalidShares = sharesStream.pipe(map(stream => stream.totalInvalidShares.toNumber().toLocaleString('en')), shareReplay())
    this.totalInvalidSharesPercentage = sharesStream.pipe(map(stream => stream.totalInvalidShares.dividedBy(stream.totalShares).multipliedBy(100).toFixed(2)), shareReplay())
    this.totalStaleShares = sharesStream.pipe(map(stream => stream.totalStaleShares.toNumber().toLocaleString('en')), shareReplay())
    this.totalStaleSharesPercentage = sharesStream.pipe(map(stream => stream.totalStaleShares.dividedBy(stream.totalShares).multipliedBy(100).toFixed(2)), shareReplay())

  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe());
    if (this.accountUpdateInterval) {
      clearInterval(this.accountUpdateInterval);
    }
    if (this.accountHistoricalUpdateInterval) {
      clearInterval(this.accountHistoricalUpdateInterval);
    }
    if (this.accountWonBlocksUpdateInterval) {
      clearInterval(this.accountWonBlocksUpdateInterval);
    }
    if (this.accountPayoutsUpdateInterval) {
      clearInterval(this.accountPayoutsUpdateInterval);
    }

    if (this.accountService.isMyFarmerPage) {
      return;
    }

    this.accountService.clearStats();
  }

  public async ngOnInit(): Promise<void> {
    this.accountUpdateInterval = setInterval(async () => {
      if (!this.accountService.havePoolPublicKey) {
        return;
      }
      await this.accountService.updateAccount();
    }, 3 * 60 * 1000);
    this.accountHistoricalUpdateInterval = setInterval(async () => {
      if (!this.accountService.havePoolPublicKey) {
        return;
      }
      await this.accountService.updateAccountHistoricalStats();
    }, (this.historicalIntervalInMinutes + 1) * 60 * 1000);
    this.accountWonBlocksUpdateInterval = setInterval(async () => {
      if (!this.accountService.havePoolPublicKey) {
        return;
      }
      await this.accountService.updateAccountWonBlocks();
    }, 11 * 60 * 1000);
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
      return;
    }
    await this.accountService.updateAccount();
    if (!this.accountService.haveAccount) {
      if (!this.accountService.isMyFarmerPage) {
        await new Promise(resolve => setTimeout(resolve, 500));
        await this.router.navigate(['/']);
      }

      return;
    }
    await Promise.all([
      this.accountService.updateAccountHistoricalStats(),
      this.accountService.updateAccountWonBlocks(),
      this.accountService.updateAccountPayouts(),
    ]);
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

  private get shareChartTopMargin(): number {
    if (window.innerWidth >= 716) {
      return 50;
    }
    if (window.innerWidth >= 541) {
      return 75;
    }

    return 99;
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
      return this.accountService.account.minimumPayout;
    }
    if (this.poolConfig.minimumPayout) {
      return this.poolConfig.minimumPayout;
    }

    return 0;
  }

  public get pendingProgressRaw(): number {
    if (!this.accountService.account || !this.minimumPayout) {
      return 0;
    }

    return this.accountService.account.pendingBN
      .dividedBy(this.minimumPayout)
      .multipliedBy(100)
      .toNumber();
  }

  public get pendingProgress(): number {
    const progress = this.pendingProgressRaw;

    return Math.min(progress, 100);
  }

  public get collateralProgressRaw(): number {
    if (!this.accountService.account || !this.accountService.account.collateralBN || !this.poolConfig.poolRewardPortion) {
      return 0;
    }

    return this.accountService.account.collateralBN
      .dividedBy(this.poolConfig.poolRewardPortion)
      .multipliedBy(100)
      .toNumber();
  }

  public get collateralProgress(): number {
    const progress = this.collateralProgressRaw;

    return Math.min(progress, 100);
  }

  private makeEcChartUpdateOptions(historicalStats: AccountHistoricalStat[]): EChartsOption {
    const biggestEc = historicalStats.reduce((acc, curr) => {
      const currBiggestEc = (curr.ecLastHour || 0) > curr.ec ? curr.ecLastHour : curr.ec

      return acc > currBiggestEc ? acc : currBiggestEc
    }, 0);
    const { unit, unitIndex } = this.getUnitForCapacity(biggestEc);
    const ecInLastHourSeries = historicalStats.map(stats => [stats.createdAt, (new BigNumber(stats.ecLastHour || 0)).dividedBy((new BigNumber(1024)).exponentiatedBy(unitIndex)).decimalPlaces(2).toNumber()]);
    const ecSeries = historicalStats.map(stats => [stats.createdAt, (new BigNumber(stats.ec)).dividedBy((new BigNumber(1024)).exponentiatedBy(unitIndex)).decimalPlaces(2).toNumber()]);
    const lastDate = historicalStats.length > 0 ? historicalStats[0].createdAt : new Date();
    const missingDataLeading = [];
    if (moment(lastDate).isAfter(moment().subtract(23, 'hours'))) {
      let startDate = moment(lastDate).subtract(this.historicalIntervalInMinutes, 'minutes');
      while (startDate.isAfter(moment().subtract(1, 'day'))) {
        missingDataLeading.unshift([startDate.toISOString(), 0]);
        startDate = startDate.subtract(this.historicalIntervalInMinutes, 'minutes');
      }
    }
    const latestDate = historicalStats.length > 0 ? historicalStats[historicalStats.length - 1].createdAt : new Date();
    const missingDataTrailing = [];
    if (moment(latestDate).isBefore(moment().subtract(1, 'hours'))) {
      let endDate = moment(latestDate).add(this.historicalIntervalInMinutes, 'minutes');
      while (endDate.isBefore(moment())) {
        missingDataTrailing.push([endDate.toISOString(), 0]);
        endDate = endDate.add(this.historicalIntervalInMinutes, 'minutes');
      }
    }

    return {
      tooltip: {
        formatter: this.ecChartTooltipFormatter.bind(this, unit),
        axisPointer: {
          label: {
            formatter: params => {
              if (params.axisDimension === 'x') {
                return moment(params.value).format('YYYY-MM-DD HH:mm');
              }

              return `${(params.value as number).toFixed(1)} ${unit}`;
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
    };
  }

  private makeSharesChartUpdateOptions(historicalStats: AccountHistoricalStat[]): EChartsOption {
    const historicalSharesSeries = historicalStats.map(stats => [stats.createdAt, stats.shares]);
    const historicalStaleSharesSeries = historicalStats.map(stats => [stats.createdAt, stats.staleShares || 0]);
    const historicalInvalidSharesSeries = historicalStats.map(stats => [stats.createdAt, stats.invalidShares || 0]);
    const historicalShareCountSeries = historicalStats.map(stats => [stats.createdAt, stats.shareCount]);
    const historicalDifficultySeries = historicalStats.map(stats => [stats.createdAt, stats.difficulty]);
    const lastDate = historicalStats.length > 0 ? historicalStats[0].createdAt : new Date();
    const missingSharesDataLeading = [];
    const missingShareCountDataLeading = [];
    const missingDifficultyDataLeading = [];
    if (moment(lastDate).isAfter(moment().subtract(23, 'hours'))) {
      let startDate = moment(lastDate).subtract(this.historicalIntervalInMinutes, 'minutes');
      while (startDate.isAfter(moment().subtract(1, 'day'))) {
        missingSharesDataLeading.unshift([startDate.toISOString(), 0]);
        missingShareCountDataLeading.unshift([startDate.toISOString(), 0]);
        missingDifficultyDataLeading.unshift([startDate.toISOString(), 1]);
        startDate = startDate.subtract(this.historicalIntervalInMinutes, 'minutes');
      }
    }
    const latestDate = historicalStats.length > 0 ? historicalStats[historicalStats.length - 1].createdAt : new Date();
    const missingSharesDataTrailing = [];
    const missingShareCountDataTrailing = [];
    const missingDifficultyDataTrailing = [];
    if (moment(latestDate).isBefore(moment().subtract(1, 'hours'))) {
      let endDate = moment(latestDate).add(this.historicalIntervalInMinutes, 'minutes');
      while (endDate.isBefore(moment())) {
        missingSharesDataTrailing.push([endDate.toISOString(), 0]);
        missingShareCountDataTrailing.push([endDate.toISOString(), 0]);
        missingDifficultyDataTrailing.push([endDate.toISOString(), 1]);
        endDate = endDate.add(this.historicalIntervalInMinutes, 'minutes');
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
    };
  }

  private ecChartTooltipFormatter(unit, params) {
    return params.map(series => {
      return `${series.marker}${series.seriesName} <span style="padding-left: 10px; float: right"><strong>${series.value[1]} ${unit}</strong></span>`;
    }).join('<br/>');
  }

  private getUnitForCapacity(capacityInGib) {
    let unitIndex = 0;
    const units = ['GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    while (capacityInGib >= 1024) {
      capacityInGib /= 1024;
      unitIndex += 1;
    }

    return {
      unitIndex,
      unit: units[unitIndex],
    };
  }

  async login() {
    if (!this.poolPublicKeyInput) {
      this.toastService.showErrorToast(this.snippetService.getSnippet('my-farmer-component.pool-pk-input.error.missing'));
      return;
    }
    const success: boolean = await this.accountService.login({ poolPublicKey: this.poolPublicKeyInput });
    if (!success) {
      return;
    }
    this.poolPublicKeyInput = null;
  }

  getFormattedCapacity(capacityInGiB) {
    if (capacityInGiB === 0) {
      return this.snippetService.getSnippet('general.not-available.short');
    }

    return (new Capacity(capacityInGiB)).toString();
  }

  getLastAcceptedPartialAtDuration(lastAcceptedPartialAt) {
    if (!lastAcceptedPartialAt) {
      return 'Never';
    }

    return moment(lastAcceptedPartialAt).fromNow();
  }

  get ecShare() {
    if (!this.accountService.account || !this.poolEc) {
      return 0;
    }

    return ((this.accountService.account.ec / this.poolEc) * 100).toFixed(2);
  }

  get estimatedDailyReward() {
    if (!this.accountService.account || !this.dailyRewardPerPib) {
      return 0;
    }
    const ecInPib = (new BigNumber(this.accountService.account.ec)).dividedBy((new BigNumber(1024).exponentiatedBy(2)));

    return ecInPib.multipliedBy(this.dailyRewardPerPib).toFixed(4);
  }

  get supportsNotifications(): boolean {
    return this.poolsProvider.coin === 'CHIA'
  }

  get canLeavePool() {
    if (!this.accountService.account) {
      return false;
    }
    const account = this.accountService.account;

    return !account.hasLeftThePool && !account.isCheating
  }

  get canRejoinPool() {
    if (!this.accountService.account) {
      return false;
    }
    const account = this.accountService.account;
    if (!account.hasLeftThePool) {
      return false;
    }

    return account.collateral === undefined || account.collateral !== '0';
  }

  async authenticate() {
    this.authenticationModal.openModal();
  }

  async updateName() {
    this.updateNameModal.openModal();
  }

  async leavePool() {
    this.leavePoolModal.openModal();
  }

  async updateMinimumPayout() {
    this.updateMinimumPayoutModal.openModal();
  }

  public updateDifficulty(): void {
    this.updateDifficultyModal.openModal()
  }

  public updateNotificationSettings(): void {
    this.updateNotificationSettingsModal.openModal()
  }

  async rejoinPool() {
    try {
      await this.accountService.rejoinPool();
      this.toastService.showSuccessToast(this.snippetService.getSnippet('my-farmer-component.rejoin-pool.success'));
    } catch (err) {
      this.toastService.showErrorToast(err.message);
    }
  }

  getBlockExplorerAddressLink(address) {
    if (!this.poolConfig || !this.poolConfig.blockExplorerAddressUrlTemplate) {
      return '';
    }

    return this.poolConfig.blockExplorerAddressUrlTemplate.replace('#ADDRESS#', address);
  }
}
