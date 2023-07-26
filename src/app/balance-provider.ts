import { Injectable } from '@angular/core'
import axios, {AxiosInstance} from 'axios'
import {BigNumber} from 'bignumber.js'
import {TtlCache} from './ttl-cache'

@Injectable({
  providedIn: 'root'
})
export class BalanceProvider {
  private readonly cache: TtlCache = new TtlCache(29 * 60)
  private readonly client: AxiosInstance = axios.create({
    baseURL: 'https://www.chia.tt/api/chia',
  })

  public constructor() {}

  public async getBalance(address: string): Promise<BigNumber> {
    const cachedBalance = this.cache.get<BigNumber>(address)
    if (cachedBalance !== undefined) {
      return cachedBalance
    }

    const balance = await this.getBalanceFromApi(address)
    this.cache.set(address, balance)

    return balance
  }

  private async getBalanceFromApi(address: string): Promise<BigNumber> {
    try {
      const { data } = await this.client.get<GetAddressResponse>(`blockchain/address/${address}`)

      return new BigNumber(data.balance)
    } catch (err) {
      return new BigNumber(0)
    }
  }
}

interface GetAddressResponse {
  address: string
  txCount: number
  balance: string
  flag: boolean
}
