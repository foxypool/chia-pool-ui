import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {faMoneyCheckAlt} from '@fortawesome/free-solid-svg-icons';
import * as moment from 'moment';
import {EChartsOption} from 'echarts';
import BigNumber from 'bignumber.js';

import {SnippetService} from '../snippet.service';
import {ensureHexPrefix} from '../util';

@Component({
  selector: 'app-farmer-payout-history',
  templateUrl: './farmer-payout-history.component.html',
  styleUrls: ['./farmer-payout-history.component.scss']
})
export class FarmerPayoutHistoryComponent implements OnChanges {
  @Input() recentPayouts: Payout[] = [];
  @Input() isLoading = false;
  @Input() poolConfig = {
    blockExplorerCoinUrlTemplate: null,
    ticker: '',
  };

  public faMoneyCheck = faMoneyCheckAlt;
  public chartOptions: EChartsOption = {
    grid: {
      left: 45,
      top: 30,
      right: 10,
      bottom: 20,
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          formatter: params => {
            if (params.axisDimension === 'x') {
              return moment(params.value).format('YYYY-MM-DD');
            }

            return (params.value as number).toFixed(2);
          },
        },
      },
    },
    xAxis: {
      type: 'time',
      axisLabel: {
        formatter: '{MMM} {dd}',
      },
    },
    yAxis: [{
      type: 'value',
      name: this.snippetService.getSnippet('farmer-payout-history-component.chart.amount.name'),
      splitLine: {
        show: false,
      },
    }],
    series: [{
      data: [],
      type: 'bar',
      color: '#037ffc',
      name: this.snippetService.getSnippet('farmer-payout-history-component.chart.amount.name'),
    }],
  };
  public chartUpdateOptions: EChartsOption;

  constructor(public snippetService: SnippetService) {}

  ngOnChanges(changes: SimpleChanges): void {
    const recentPayoutsChange = changes.recentPayouts;
    if (!recentPayoutsChange) {
      return;
    }
    this.chartUpdateOptions = this.makeChartUpdateOptions();
  }

  public trackPayoutById(index: number, payout: Payout): string {
    return payout.coinId;
  }

  public getBlockExplorerCoinLink(coinId: string): string {
    return this.poolConfig.blockExplorerCoinUrlTemplate.replace('#COIN#', ensureHexPrefix(coinId));
  }

  public getPaymentState(payoutState: string): string {
    if (!payoutState || payoutState === 'IN_MEMPOOL') {
      return this.snippetService.getSnippet('payouts-component.in-mempool');
    }

    return this.snippetService.getSnippet('payouts-component.confirmed');
  }

  private makeChartUpdateOptions(): EChartsOption {
    return {
      tooltip: {
        formatter: params => `<strong>${params[0].value[1]} ${this.poolConfig.ticker}</strong>`,
      },
      series: [{
        data: this.recentPayouts.map(payout => ({
          value: [payout.payoutDate, (new BigNumber(payout.amount)).toNumber()],
        })),
      }],
    };
  }
}

export type Payout = {
  coinId: string,
  formattedPayoutDate: string,
  payoutDate: Date,
  amount: string,
  state: string,
};
