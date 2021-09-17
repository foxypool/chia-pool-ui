import {Component, OnInit, ViewChild} from '@angular/core';
import {faCircleNotch, faInfoCircle, faUserCheck} from '@fortawesome/free-solid-svg-icons';
import * as Sentry from '@sentry/angular';
import * as moment from 'moment';
import BigNumber from 'bignumber.js';
import {EChartsOption, graphic} from 'echarts';

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

@Component({
  selector: 'app-my-farmer',
  templateUrl: './my-farmer.component.html',
  styleUrls: ['./my-farmer.component.scss']
})
export class MyFarmerComponent implements OnInit {
  @ViewChild(AuthenticationModalComponent) authenticationModal;
  @ViewChild(UpdateNameModalComponent) updateNameModal;
  @ViewChild(LeavePoolModalComponent) leavePoolModal;
  @ViewChild(UpdateMinimumPayoutModalComponent) updateMinimumPayoutModal;

  public poolConfig:any = {};
  public exchangeStats:any = {};
  public poolPublicKeyInput = null;
  public faCircleNotch = faCircleNotch;
  public faUserCheck = faUserCheck;
  public faInfoCircle = faInfoCircle;

  public ecChartOptions: EChartsOption;
  public ecChartUpdateOptions: EChartsOption;

  public sharesChartOptions: EChartsOption;
  public sharesChartUpdateOptions: EChartsOption;

  private poolEc = 0;
  private dailyRewardPerPib = 0;

  private historicalIntervalInMinutes = 15;

  constructor(
    public snippetService: SnippetService,
    public accountService: AccountService,
    private statsService: StatsService,
    private toastService: ToastService,
    public ratesService: RatesService,
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
      grid: {
        left: 65,
        top: 50,
        right: 15,
        bottom: 20,
      },
      tooltip: {
        trigger: 'axis',
        formatter: params => `${moment(params[0].value[0]).format('yyyy-mm-dd HH:mm')}: <strong>${params[0].value[1]} GiB</strong>`,
      },
      xAxis: {
        type: 'time',
        minInterval: this.historicalIntervalInMinutes * 60 * 1000,
      },
      yAxis: {
        type: 'value',
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
        symbol: 'none',
        smooth: true,
        color: '#4bd28f',
        areaStyle: {
          color: new graphic.LinearGradient(0, 0, 0, 1, [{
            offset: 0,
            color: '#4bd28f',
          }, {
            offset: 1,
            color: '#01bfec',
          }]),
        },
      }],
    };
    this.sharesChartOptions = {
      title: {
        text: this.snippetService.getSnippet('my-farmer-component.shares-chart.title'),
        left: 'center',
        top: 0,
        textStyle: {
          color: '#cfd0d1'
        }
      },
      legend: {
        data: [
          this.snippetService.getSnippet('my-farmer-component.shares-chart.shares.name'),
          this.snippetService.getSnippet('my-farmer-component.shares-chart.difficulty.name'),
          this.snippetService.getSnippet('my-farmer-component.shares-chart.partials.name'),
        ],
        top: 20,
        textStyle: {
          color: '#cfd0d1',
        },
      },
      grid: {
        left: 65,
        top: 50,
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
      yAxis: [{
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
        name: this.snippetService.getSnippet('my-farmer-component.shares-chart.difficulty.name'),
        splitLine: {
          show: false,
        },
      }],
      series: [{
        data: [],
        type: 'bar',
        name: this.snippetService.getSnippet('my-farmer-component.shares-chart.shares.name'),
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
    this.accountService.accountHistoricalStats.subscribe(historicalStats => {
      this.ecChartUpdateOptions = this.makeEcChartUpdateOptions(historicalStats);
      this.sharesChartUpdateOptions = this.makeSharesChartUpdateOptions(historicalStats);
    });
    this.snippetService.selectedLanguageSubject.subscribe(() => {
      this.ecChartUpdateOptions = {
        title: {
          text: this.snippetService.getSnippet('my-farmer-component.ec-chart.title'),
        },
      };
      this.sharesChartUpdateOptions = {
        title: {
          text: this.snippetService.getSnippet('my-farmer-component.shares-chart.title'),
        },
        legend: {
          data: [
            this.snippetService.getSnippet('my-farmer-component.shares-chart.shares.name'),
            this.snippetService.getSnippet('my-farmer-component.shares-chart.difficulty.name'),
            this.snippetService.getSnippet('my-farmer-component.shares-chart.partials.name'),
          ],
        },
        yAxis: [{
          name: this.snippetService.getSnippet('my-farmer-component.shares-chart.shares.name'),
        }, {
          name: this.snippetService.getSnippet('my-farmer-component.shares-chart.difficulty.name'),
        }],
        series: [{
          name: this.snippetService.getSnippet('my-farmer-component.shares-chart.shares.name'),
        }, {
          name: this.snippetService.getSnippet('my-farmer-component.shares-chart.difficulty.name'),
        }, {
          name: this.snippetService.getSnippet('my-farmer-component.shares-chart.partials.name'),
        }],
      };
    });
  }

  async ngOnInit() {
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig));
    this.statsService.exchangeStats.asObservable().subscribe((exchangeStats => this.exchangeStats = exchangeStats));
    this.poolConfig = this.statsService.poolConfig.getValue();
    this.exchangeStats = this.statsService.exchangeStats.getValue();

    this.statsService.accountStats.asObservable().subscribe(async accountStats => {
      this.poolEc = accountStats.ecSum;
    });
    this.statsService.rewardStats.asObservable().subscribe(async rewardStats => {
      this.dailyRewardPerPib = rewardStats.dailyRewardPerPiB;
    });
    setInterval(async () => {
      if (!this.accountService.havePoolPublicKey) {
        return;
      }
      await this.accountService.updateAccount();
    }, 3 * 60 * 1000);
    setInterval(async () => {
      if (!this.accountService.havePoolPublicKey) {
        return;
      }
      await this.accountService.updateAccountHistoricalStats();
    }, (this.historicalIntervalInMinutes + 1) * 60 * 1000);

    if (!this.accountService.havePoolPublicKey) {
      return;
    }
    Sentry.setUser({ id: this.accountService.poolPublicKey });
    await this.accountService.updateAccount();
    await this.accountService.updateAccountHistoricalStats();
  }

  private makeEcChartUpdateOptions(historicalStats): EChartsOption {
    let biggestEc = historicalStats.reduce((acc, curr) => acc > curr.ec ? acc : curr.ec, 0);
    const { unit, unitIndex } = this.getUnitForCapacity(biggestEc);
    const historicalStatsSeries = historicalStats.map(stats => [stats.createdAt, (new BigNumber(stats.ec)).dividedBy((new BigNumber(1024)).exponentiatedBy(unitIndex)).decimalPlaces(2).toNumber()]);
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
        formatter: params => `${moment(params[0].value[0]).format('YYYY-MM-DD HH:mm')}<br/> <strong>${params[0].value[1]} ${unit}</strong>`,
      },
      yAxis: {
        axisLabel: {
          formatter: `{value} ${unit}`,
        },
      },
      series: [{
        data: missingDataLeading.concat(historicalStatsSeries, missingDataTrailing),
      }],
    };
  }

  private makeSharesChartUpdateOptions(historicalStats): EChartsOption {
    const historicalSharesSeries = historicalStats.map(stats => [stats.createdAt, stats.shares]);
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
        data: missingSharesDataLeading.concat(historicalSharesSeries, missingSharesDataTrailing),
      }, {
        data: missingDifficultyDataLeading.concat(historicalDifficultySeries, missingDifficultyDataTrailing),
      }, {
        data: missingShareCountDataLeading.concat(historicalShareCountSeries, missingShareCountDataTrailing),
      }],
    };
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
