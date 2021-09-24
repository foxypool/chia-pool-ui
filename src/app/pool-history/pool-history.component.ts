import { Component } from '@angular/core';
import {EChartsOption} from 'echarts';
import {StatsService} from '../stats.service';
import {SnippetService} from '../snippet.service';
import * as moment from 'moment';
import BigNumber from 'bignumber.js';

@Component({
  selector: 'app-pool-history',
  templateUrl: './pool-history.component.html',
  styleUrls: ['./pool-history.component.scss']
})
export class PoolHistoryComponent {
  public chartOptions: EChartsOption;
  public chartUpdateOptions: EChartsOption;

  constructor(
    private snippetService: SnippetService,
    private statsService: StatsService,
  ) {
    this.chartOptions = {
      title: {
        text: this.snippetService.getSnippet('pool-history-component.chart.title'),
        left: 'center',
        top: 0,
        textStyle: {
          color: '#cfd0d1'
        }
      },
      legend: {
        data: [
          this.snippetService.getSnippet('pool-history-component.chart.blocks.name'),
          this.snippetService.getSnippet('pool-history-component.chart.pool-ec.name'),
        ],
        top: 20,
        textStyle: {
          color: '#cfd0d1',
        },
      },
      grid: {
        left: 40,
        top: 50,
        right: 55,
        bottom: 25,
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
              if (params.axisIndex === 0) {
                return (params.value as Number).toFixed(0);
              }

              return (params.value as Number).toFixed(2);
            },
          },
        },
      },
      xAxis: {
        type: 'time',
      },
      yAxis: [{
        type: 'value',
        name: this.snippetService.getSnippet('pool-history-component.chart.blocks.name'),
        splitLine: {
          show: false,
        },
      }, {
        type: 'value',
        name: this.snippetService.getSnippet('pool-history-component.chart.capacity.name'),
        splitLine: {
          show: false,
        },
      }],
      series: [{
        data: [],
        type: 'bar',
        color: '#037ffc',
        name: this.snippetService.getSnippet('pool-history-component.chart.blocks.name'),
      }, {
        data: [],
        type: 'line',
        name: this.snippetService.getSnippet('pool-history-component.chart.pool-ec.name'),
        color: '#28736f',
        showSymbol: false,
        lineStyle: {
          width: 4,
          cap: 'round',
        },
        smooth: true,
        yAxisIndex: 1,
      }],
    };
    this.snippetService.selectedLanguageSubject.subscribe(() => {
      this.chartUpdateOptions = {
        title: {
          text: this.snippetService.getSnippet('pool-history-component.chart.title'),
        },
        legend: {
          data: [
            this.snippetService.getSnippet('pool-history-component.chart.blocks.name'),
            this.snippetService.getSnippet('pool-history-component.chart.pool-ec.name'),
          ],
        },
        yAxis: [{
          name: this.snippetService.getSnippet('pool-history-component.chart.blocks.name'),
        }, {
          name: this.snippetService.getSnippet('pool-history-component.chart.capacity.name'),
        }],
        series: [{
          name: this.snippetService.getSnippet('pool-history-component.chart.blocks.name'),
        }, {
          name: this.snippetService.getSnippet('pool-history-component.chart.pool-ec.name'),
        }],
      };
    });
    this.statsService.poolHistoricalStats.subscribe(historicalStats => {
      this.chartUpdateOptions = this.makeChartUpdateOptions(historicalStats);
    });
  }

  private makeChartUpdateOptions(historicalStats): EChartsOption {
    const biggestEc = historicalStats.reduce((acc, curr) => acc.isGreaterThan(curr.poolEcInTib) ? acc : new BigNumber(curr.poolEcInTib), new BigNumber(0));
    const { unit, unitIndex } = this.getUnitForCapacity(biggestEc);

    return {
      tooltip: {
        formatter: this.tooltipFormatter.bind(this, unit),
      },
      yAxis: [{},{
        axisLabel: {
          formatter: `{value} ${unit}`,
        },
      }],
      series: [{
        data: historicalStats.map(historicalStat => ({
          value: [historicalStat.timestamp, historicalStat.blocks, historicalStat.effort],
          itemStyle: {
            color: this.getEffortColor(historicalStat.effort),
          },
        })),
      }, {
        data: historicalStats.map(historicalStat => [historicalStat.timestamp, (new BigNumber(historicalStat.poolEcInTib)).dividedBy((new BigNumber(1024)).exponentiatedBy(unitIndex)).decimalPlaces(2).toNumber()]),
      }],
    };
  }

  private tooltipFormatter(unit, params) {
    return params.map(series => {
      switch (series.seriesIndex) {
        case 0:
          return `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:#037ffc;"></span>${series.seriesName} <span style="padding-left: 10px; float: right"><strong>${series.value[1]}</strong></span><br/>`
            +`${series.marker}${this.snippetService.getSnippet('pool-history-component.chart.effort.name')} <span style="padding-left: 10px; float: right"><strong>${this.getEffortString(series.value[2])}</strong></span>`;
        case 1:
          return `${series.marker}${series.seriesName} <span style="padding-left: 10px; float: right"><strong>${series.value[1]} ${unit}</strong></span>`;
      }

    }).join('<br/>');
  }

  private getUnitForCapacity(capacityInTibBN) {
    let unitIndex = 0;
    const units = ['TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    while (capacityInTibBN.isGreaterThanOrEqualTo(1024)) {
      capacityInTibBN = capacityInTibBN.dividedBy(1024);
      unitIndex += 1;
    }

    return {
      unitIndex,
      unit: units[unitIndex],
    };
  }

  private getEffortString(effort) {
    if (effort === null) {
      return 'N/A';
    }

    return `${(new BigNumber(effort)).multipliedBy(100).toFixed(2)}%`;
  }

  private getEffortColor(effort) {
    if (effort === null || effort === undefined) {
      return '#bbb';
    }
    if (effort < 0.25) {
      return '#53b332';
    }
    if (effort < 0.5) {
      return '#46cf76';
    }
    if (effort < 0.75) {
      return '#4bd28f';
    }
    if (effort < 1) {
      return '#87d3b5';
    }
    if (effort < 1.5) {
      return '#cfd0d1';
    }
    if (effort < 2.5) {
      return '#8c8c8c';
    }
    if (effort < 4) {
      return '#cc9321';
    }

    return '#ff4d4d';
  }
}
