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
    ], this.wonBlocksSubject.getValue().map(wonBlock => ([
      moment(wonBlock.createdAt).format('YYYY-MM-DD HH:mm'),
      wonBlock.height,
      wonBlock.hash,
      wonBlock.effort,
    ])));
  }
}

export type WonBlock = {
  height: number,
  hash: string,
  effort: number|null,
  createdAt: string,
};
