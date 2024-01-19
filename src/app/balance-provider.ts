import { Injectable } from '@angular/core'
import axios, {AxiosInstance} from 'axios'
import {BigNumber} from 'bignumber.js'

@Injectable({
  providedIn: 'root'
})
export class BalanceProvider {
  private readonly client: AxiosInstance = axios.create({
    baseURL: 'https://oracle.foxypool.io/v1',
  })

  public constructor() {}

  public async getBalance(address: string): Promise<BigNumber> {
    try {
      const { data } = await this.client.get<string>('balance', {
        params: {
          type: 'coin',
          symbol: 'xch',
          address,
        },
      })

      return new BigNumber(data)
    } catch (err) {
      return new BigNumber(0)
    }
  }
}
