import {Component, Input, OnDestroy} from '@angular/core'
import {StatsService} from '../stats.service'
import * as moment from 'moment'
import {SnippetService} from '../snippet.service'
import {faMoneyCheckAlt, faExchangeAlt} from '@fortawesome/free-solid-svg-icons'
import {BigNumber} from 'bignumber.js'
import {PoolsProvider} from '../pools.provider'
import {ConfigService, DateFormatting} from '../config.service'
import {Subscription} from 'rxjs'

@Component({
  selector: 'app-payouts',
  templateUrl: './payouts.component.html',
  styleUrls: ['./payouts.component.scss']
})
export class PayoutsComponent implements OnDestroy {

  @Input() limit: number|null = null
  private _poolConfig:any = {}
  private _poolStats:any = {}
  public lastPayouts:any = null
  private showPayouts: any = {}
  private addressAmountPairs: any = {}

  public faMoneyCheck = faMoneyCheckAlt
  public faExchangeAlt = faExchangeAlt

  private readonly subscriptions: Subscription[] = [
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig)),
    this.statsService.poolStats.asObservable().subscribe((poolStats => this.poolStats = poolStats)),
    this.statsService.lastPayouts.asObservable().subscribe((lastPayouts => this.lastPayouts = lastPayouts)),
  ]

  constructor(
    private readonly statsService: StatsService,
    private readonly _snippetService: SnippetService,
    private readonly poolsProvider: PoolsProvider,
    private readonly configService: ConfigService,
  ) {}

  public ngOnDestroy(): void {
    this.subscriptions.map(subscription => subscription.unsubscribe())
  }

  get snippetService(): SnippetService {
    return this._snippetService
  }

  set poolConfig(poolConfig) {
    this._poolConfig = poolConfig
  }

  get poolConfig() {
    return this._poolConfig
  }

  set poolStats(stats) {
    this._poolStats = stats
  }

  get poolStats() {
    return this._poolStats
  }

  get lastPayoutsArray() {
    if (!this.lastPayouts) {
      return []
    }
    if (!this.limit) {
      return this.lastPayouts
    }

    return this.lastPayouts.slice(0, this.limit)
  }

  getPayoutDate(payout): string {
    if (this.configService.payoutDateFormatting === DateFormatting.fixed) {
      return moment(payout.createdAt).format('YYYY-MM-DD HH:mm')
    } else {
      return moment(payout.createdAt).fromNow()
    }
  }

  getTotalPayout(transactions) {
    return transactions.reduce((acc, transaction) => {
      return acc.plus(
        Object.keys(transaction.payoutAmounts)
          .map(key => transaction.payoutAmounts[key])
          .reduce((acc, curr) => acc.plus(curr), new BigNumber(0))
      )
    }, new BigNumber(0)).decimalPlaces(8, BigNumber.ROUND_FLOOR).toNumber()
  }

  showPayout(id) {
    return !!this.showPayouts[id]
  }

  toggleShowPayout({_id, transactions}) {
    this.showPayouts[_id] = !this.showPayouts[_id]
    if (this.showPayouts[_id]) {
      const addressAmountPairs = transactions.reduce((acc, transaction) => {
        return Object.assign(acc, transaction.payoutAmounts)
      }, {})
      this.addressAmountPairs[_id] = this.getArray(addressAmountPairs)
    } else {
      this.addressAmountPairs[_id] = []
    }
  }

  getAddressAmountPairs(id) {
    return this.addressAmountPairs[id] || []
  }

  getArray(obj) {
    return Object.keys(obj)
      .map(key => {
        const amount: number = (new BigNumber(obj[key])).decimalPlaces(8, BigNumber.ROUND_FLOOR).toNumber()

        return {
          address: key,
          amount,
        }
      }).sort((a, b) => b.amount - a.amount)
  }

  public getBlockExplorerCoinLink(coinId: string): string {
    return this.poolConfig.blockExplorerCoinUrlTemplate.replace('#COIN#', coinId.ensureHexPrefix())
  }

  getCoinIdsForPayout(payout) {
    return payout.transactions.map(transaction => transaction.coinIds).flat()
  }

  get splitMultiPayoutsByBreak() {
    switch(this.poolsProvider.coin) {
      default: return true
    }
  }

  getPaymentState(payout): string {
    if (!payout.state || payout.state === 'IN_MEMPOOL') {
      return this.snippetService.getSnippet('payouts-component.in-mempool')
    }
    if (payout.state === 'PARTIALLY_CONFIRMED') {
      return this.snippetService.getSnippet('payouts-component.partially-confirmed')
    }

    return this.snippetService.getSnippet('payouts-component.confirmed')
  }

  trackPayoutBy(index, payout) {
    return payout._id
  }

  public toggleDateFormatting(): void {
    if (this.configService.payoutDateFormatting === DateFormatting.fixed) {
      this.configService.payoutDateFormatting = DateFormatting.relative
    } else {
      this.configService.payoutDateFormatting = DateFormatting.fixed
    }
  }
}
