import {Component, Input} from '@angular/core'
import {StatsService} from '../stats.service'
import * as moment from 'moment'
import {SnippetService} from '../snippet.service'
import {faExchangeAlt, faMoneyCheckAlt} from '@fortawesome/free-solid-svg-icons'
import {BigNumber} from 'bignumber.js'
import {PoolsProvider} from '../pools.provider'
import {ConfigService, DateFormatting} from '../config.service'
import {Payout, PayoutState} from '../api/types/pool/payout'
import {RatesService} from '../rates.service'

@Component({
  selector: 'app-payouts',
  templateUrl: './payouts.component.html',
  styleUrls: ['./payouts.component.scss']
})
export class PayoutsComponent {
  @Input() limit: number|null = null
  private showPayouts: any = {}
  private addressAmountPairs: any = {}

  public faMoneyCheck = faMoneyCheckAlt
  public faExchangeAlt = faExchangeAlt

  constructor(
    public readonly statsService: StatsService,
    public readonly ratesService: RatesService,
    private readonly _snippetService: SnippetService,
    private readonly poolsProvider: PoolsProvider,
    private readonly configService: ConfigService,
  ) {}

  get snippetService(): SnippetService {
    return this._snippetService
  }

  public get recentPayouts(): Payout[] {
    if (this.statsService.recentPayouts === undefined) {
      return []
    }
    if (!this.limit) {
      return this.statsService.recentPayouts
    }

    return this.statsService.recentPayouts.slice(0, this.limit)
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

  public getBlockExplorerCoinLink(coinId: string): string|undefined {
    return this.statsService.poolConfig?.blockExplorerCoinUrlTemplate.replace('#COIN#', coinId.ensureHexPrefix())
  }

  getCoinIdsForPayout(payout) {
    return payout.transactions.map(transaction => transaction.coinIds).flat()
  }

  get splitMultiPayoutsByBreak() {
    switch(this.poolsProvider.coin) {
      default: return true
    }
  }

  public getPaymentState(payout: Payout): string {
    if (!payout.state || payout.state === PayoutState.inMempool) {
      return this.snippetService.getSnippet('payouts-component.in-mempool')
    }
    if (payout.state === PayoutState.partiallyConfirmed) {
      return this.snippetService.getSnippet('payouts-component.partially-confirmed')
    }

    return this.snippetService.getSnippet('payouts-component.confirmed')
  }

  public trackPayoutBy(index: number, payout: Payout): string {
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
