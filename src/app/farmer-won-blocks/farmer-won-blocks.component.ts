import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import * as moment from 'moment';
import BigNumber from 'bignumber.js';
import {faCubes, faExchangeAlt} from '@fortawesome/free-solid-svg-icons';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';

import {SnippetService} from '../snippet.service';
import {ConfigService, DateFormatting} from '../config.service';
import {getEffortColor} from '../util';
import {CsvExporter} from '../csv-exporter';
import {map} from 'rxjs/operators';

@Component({
  selector: 'app-farmer-won-blocks',
  templateUrl: './farmer-won-blocks.component.html',
  styleUrls: ['./farmer-won-blocks.component.scss']
})
export class FarmerWonBlocksComponent implements OnInit, OnDestroy {
  @Input() wonBlocksObservable: Observable<WonBlock[]>;
  @Input() isLoading = false;
  @Input() poolConfig = {
    blockExplorerBlockUrlTemplate: null,
    ticker: '',
  };

  public faCubes = faCubes;
  public faExchangeAlt = faExchangeAlt;
  public hasWonBlocksObservable: Observable<boolean>;

  private wonBlocksSubject: BehaviorSubject<WonBlock[]> = new BehaviorSubject<WonBlock[]>([]);
  private subscriptions: Subscription[] = [];

  constructor(
    public snippetService: SnippetService,
    private configService: ConfigService,
    private csvExporter: CsvExporter,
  ) {}

  public ngOnInit(): void {
    this.hasWonBlocksObservable = this.wonBlocksObservable.pipe(map(wonBlocks => wonBlocks.length > 0));
    this.subscriptions.push(this.wonBlocksObservable.subscribe(this.wonBlocksSubject));
  }

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe());
  }

  public trackBlockByHash(index: number, block: WonBlock): string {
    return block.hash;
  }

  public getBlockExplorerBlockLink(block: WonBlock): string {
    return this.poolConfig.blockExplorerBlockUrlTemplate.replace('#BLOCK#', block.height).replace('#HASH#', block.hash);
  }

  public getBlockDate(block: WonBlock): string {
    if (this.configService.wonBlockDateFormatting === DateFormatting.fixed) {
      return moment(block.createdAt).format('YYYY-MM-DD HH:mm');
    } else {
      return moment(block.createdAt).fromNow();
    }
  }

  public getEffortColor(block: WonBlock): string {
    const effort = block.effort;
    if (effort === null || effort === undefined) {
      return '';
    }

    return getEffortColor(new BigNumber(effort));
  }

  public getBlockEffort(block: WonBlock): string {
    if (block.effort === null || block.effort === undefined) {
      return 'N/A';
    }

    return `${(block.effort * 100).toFixed(2)} %`;
  }

  public getRemarkClasses(remark: Remark): string[] {
    switch (remark.type) {
      case RemarkType.gigahorseDevFee:
        return ['badge-info']
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
      this.configService.wonBlockDateFormatting = DateFormatting.relative;
    } else {
      this.configService.wonBlockDateFormatting = DateFormatting.fixed;
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
}

export type WonBlock = {
  height: number
  hash: string
  effort: number|null
  createdAt: string
  remarks: Remark[]
}

export interface Remark {
  type: RemarkType
  meta?: any
}

enum RemarkType {
  gigahorseDevFee = 'GIGAHORSE_DEV_FEE',
  corePoolFarmerReward = 'CORE_POOL_FARMER_REWARD',
  hpoolFarmerReward = 'HPOOL_FARMER_REWARD',
  farmerRewardAddressDiffers = 'FARMER_REWARD_ADDRESS_DIFFERS',
}
