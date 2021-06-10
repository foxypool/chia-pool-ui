import { Injectable } from '@angular/core';

import {StatsService} from "./stats.service";
import {PoolsProvider} from "./pools.provider";

@Injectable({
  providedIn: 'root'
})
export class FaucetService {

  constructor(
    private statsService: StatsService,
    private poolsProvider: PoolsProvider,
  ) {}

  getCoins(address, type) {
    return new Promise((resolve, reject) => this.statsService.getWebsocketService().publish(`faucet/${type}`, this.poolsProvider.poolIdentifier, address, ({result, error}) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    }));
  }
}
