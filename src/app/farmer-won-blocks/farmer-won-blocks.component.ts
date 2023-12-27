import {Component, Input, OnDestroy, OnInit} from '@angular/core'
import * as moment from 'moment'
import BigNumber from 'bignumber.js'
import {faCubes, faExchangeAlt, faInfoCircle} from '@fortawesome/free-solid-svg-icons'
import {BehaviorSubject, Observable, Subscription} from 'rxjs'

import {SnippetService} from '../snippet.service'
import {ConfigService, DateFormatting} from '../config.service'
import {getEffortColor, getEffortColorForChart} from '../util'
import {CsvExporter} from '../csv-exporter'
import {map, shareReplay} from 'rxjs/operators'
import {EChartsOption} from 'echarts'
import {StatsService} from '../stats.service'
import {AccountWonBlock, Remark, RemarkType} from '../api/types/account/account-won-block'
import {colors, Theme, ThemeProvider} from '../theme-provider'

@Component({
  selector: 'app-farmer-won-blocks',
  templateUrl: './farmer-won-blocks.component.html',
  styleUrls: ['./farmer-won-blocks.component.scss']
})
export class FarmerWonBlocksComponent implements OnInit, OnDestroy {
  @Input() wonBlocksObservable: Observable<AccountWonBlock[]>
  @Input() isLoading = false

  public page = 1
  public pageSize = 10
  public faCubes = faCubes
  public faExchangeAlt = faExchangeAlt
  public hasWonBlocksObservable: Observable<boolean>
  public hasWonBlocksWithEffort: Observable<boolean>
  public chartOptions: EChartsOption = {
    title: {
      text: 'Block Wins',
      left: 'center',
      top: 0,
      textStyle: {
        color: this.themeProvider.isDarkTheme ? colors.darkTheme.textColor : colors.lightTheme.textColor,
      }
    },
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
              return moment(params.value).format('YYYY-MM-DD')
            }

            return `${(params.value as number).toFixed(2)}%`
          },
        },
      },
    },
    xAxis: {
      type: 'time',
    },
    yAxis: [{
      type: 'value',
      name: 'Effort',
      splitLine: {
        show: false,
      },
      axisLabel: {
        formatter: '{value}%',
      },
    }],
    series: [{
      data: [],
      type: 'scatter',
      color: '#037ffc',
      name: 'Effort',
    }],
  }
  public chartUpdateOptions: EChartsOption

  public get exportCsvButtonClasses(): string {
    return this.themeProvider.isDarkTheme ? 'btn-outline-info' : 'btn-info'
  }

  public get effectiveGigahorseDevFeeBoxClasses(): string {
    return this.themeProvider.isDarkTheme ? 'border-primary' : 'border-black'
  }

  public hasGigahorseDevFeeBlocksAndEnoughWonBlocks$: Observable<boolean>
  public effectiveGigahorseDevFee$: Observable<string>

  protected readonly faInfoCircle = faInfoCircle

  private readonly wonBlocksSubject: BehaviorSubject<AccountWonBlock[]> = new BehaviorSubject<AccountWonBlock[]>([])
  private readonly subscriptions: Subscription[] = []

  constructor(
    public readonly snippetService: SnippetService,
    public readonly statsService: StatsService,
    private readonly configService: ConfigService,
    private readonly csvExporter: CsvExporter,
    private readonly themeProvider: ThemeProvider,
  ) {}

  public ngOnInit(): void {
    this.hasWonBlocksObservable = this.wonBlocksObservable.pipe(map(wonBlocks => wonBlocks.length > 0))
    this.hasWonBlocksWithEffort = this.wonBlocksObservable.pipe(map(wonBlocks => wonBlocks.filter(wonBlock => wonBlock.effort !== null).length > 0))
    const gigahorseDevFeeBlocksAndWonBlocks = this.wonBlocksObservable.pipe(
      map(wonBlocks => {
        const gigahorseDevFeeBlocks = wonBlocks.filter(wonBlock => wonBlock.remarks.some(remark => remark.type === RemarkType.gigahorseDevFee))

        return {
          wonBlocks,
          gigahorseDevFeeBlocks,
        }
      }),
      shareReplay(1),
    )
    this.hasGigahorseDevFeeBlocksAndEnoughWonBlocks$ = gigahorseDevFeeBlocksAndWonBlocks.pipe(
      map(({ gigahorseDevFeeBlocks, wonBlocks }) => gigahorseDevFeeBlocks.length > 0 && wonBlocks.length >= 8),
    )
    this.effectiveGigahorseDevFee$ = gigahorseDevFeeBlocksAndWonBlocks.pipe(
      map(({ wonBlocks, gigahorseDevFeeBlocks }) => {
        if (wonBlocks.length === 0) {
          return '0%'
        }

        return `${((gigahorseDevFeeBlocks.length / wonBlocks.length / 8) * 100).toFixed(3)}%`
      }),
    )
    this.subscriptions.push(this.wonBlocksObservable.subscribe(this.wonBlocksSubject))
    this.subscriptions.push(
      this.wonBlocksObservable.subscribe(wonBlocks => {
        this.chartUpdateOptions = {
          ...(this.chartUpdateOptions || {}),
          ...this.makeChartUpdateOptions(wonBlocks),
        }
      }),
    )
    this.subscriptions.push(
      this.themeProvider.theme$.subscribe(theme => {
        const textColor = theme === Theme.dark ? colors.darkTheme.textColor : colors.lightTheme.textColor
        this.chartUpdateOptions = {
          ...(this.chartUpdateOptions || {}),
          title: {
            textStyle: {
              color: textColor,
            },
          },
        }
      })
    )
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
  }

  public trackBlockByHash(index: number, block: AccountWonBlock): string {
    return block.hash
  }

  public getBlockExplorerBlockLink(block: AccountWonBlock): string {
    return this.statsService.poolConfig?.blockExplorerBlockUrlTemplate.replace('#BLOCK#', block.height.toString()).replace('#HASH#', block.hash)
  }

  public getBlockDate(block: AccountWonBlock): string {
    if (this.configService.wonBlockDateFormatting === DateFormatting.fixed) {
      return moment(block.createdAt).format('YYYY-MM-DD HH:mm')
    } else {
      return moment(block.createdAt).fromNow()
    }
  }

  public getFarmerReward(block: AccountWonBlock): undefined|string {
    if (block.blockRewardAmounts === undefined) {
      return
    }

    return `${block.blockRewardAmounts.farmer + block.blockRewardAmounts.fee} ${this.statsService.poolConfig?.ticker}`
  }

  public getEffortColor(block: AccountWonBlock): string {
    const effort = block.effort
    if (effort === null || effort === undefined) {
      return ''
    }

    return getEffortColor(new BigNumber(effort))
  }

  public getBlockEffort(block: AccountWonBlock): string {
    if (block.effort === null || block.effort === undefined) {
      return 'N/A'
    }

    return `${(block.effort * 100).toFixed(2)} %`
  }

  public getRemarkClasses(remark: Remark): string[] {
    switch (remark.type) {
      case RemarkType.gigahorseDevFee:
        return ['text-bg-info']
      case RemarkType.corePoolFarmerReward:
      case RemarkType.hpoolFarmerReward:
      case RemarkType.farmerRewardAddressDiffers:
        return ['background-color-orange']
    }
  }

  public getRemarkDetail(remark: Remark): string {
    switch (remark.type) {
      case RemarkType.gigahorseDevFee:
        return 'Gigahorse Dev Fee'
      case RemarkType.corePoolFarmerReward:
        return 'Core Pool reward address'
      case RemarkType.hpoolFarmerReward:
        return 'HPool reward address'
      case RemarkType.farmerRewardAddressDiffers:
        return 'Farmer reward address differs'
    }
  }

  public getRemarkTooltip(remark: Remark): string|undefined {
    switch (remark.type) {
      case RemarkType.gigahorseDevFee:
        return 'The farmer reward for this block win is taken as dev fee for using Gigahorse'
      case RemarkType.corePoolFarmerReward:
        return 'The farmer reward for this block win was credited to Core Pool, please change your config immediately!'
      case RemarkType.hpoolFarmerReward:
        return 'The farmer reward for this block win was credited to HPool, please change your config immediately!'
      case RemarkType.farmerRewardAddressDiffers:
        return `The Farmer reward for this block win was credited to address ${remark.meta.farmerRewardAddress}. Please ensure this address belongs to you.`
    }
  }

  public toggleDateFormatting(): void {
    if (this.configService.wonBlockDateFormatting === DateFormatting.fixed) {
      this.configService.wonBlockDateFormatting = DateFormatting.relative
    } else {
      this.configService.wonBlockDateFormatting = DateFormatting.fixed
    }
  }

  public exportCsv(): void {
    this.csvExporter.export(`blocks-${moment().format('YYYY-MM-DD')}.csv`, [
      'Date',
      'Height',
      'Hash',
      'Effort',
      'Remarks',
    ], this.wonBlocksSubject.getValue().map(wonBlock => ([
      moment(wonBlock.createdAt).format('YYYY-MM-DD HH:mm'),
      wonBlock.height,
      wonBlock.hash,
      wonBlock.effort,
      wonBlock.remarks.map(remark => remark.type).join(', '),
    ])))
  }

  private makeChartUpdateOptions(wonBlocks: AccountWonBlock[]): EChartsOption {
    const wonBlocksWithEffort = wonBlocks.filter(wonBlock => wonBlock.effort !== null)

    return {
      tooltip: {
        formatter: this.tooltipFormatter.bind(this),
      },
      series: [{
        data: wonBlocksWithEffort.map(wonBlock => ({
          value: [wonBlock.createdAt, (new BigNumber(wonBlock.effort)).multipliedBy(100).toNumber()],
          itemStyle: {
            color: getEffortColorForChart(wonBlock.effort),
          },
        })),
      }],
    }
  }

  private tooltipFormatter(params): string {
    return params.map(series => {
      return `${series.marker}${series.seriesName} <span style="padding-left: 10px; float: right"><strong>${series.value[1].toFixed(2)}%</strong></span>`
    }).join('<br/>')
  }
}

