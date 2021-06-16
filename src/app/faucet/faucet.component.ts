import { Component, OnInit } from '@angular/core';
import {StatsService} from '../stats.service';
import {FaucetService} from '../faucet.service';
import {SnippetService} from '../snippet.service';

@Component({
  selector: 'app-faucet',
  templateUrl: './faucet.component.html',
  styleUrls: ['./faucet.component.scss']
})
export class FaucetComponent implements OnInit {

  private _poolConfig:any = {};
  private _address = '';
  private _success = null;
  private timeout = null;
  private _error = null;
  private _requestingCoins = false;

  constructor(
    private faucetService: FaucetService,
    private statsService: StatsService,
    private _snippetService: SnippetService
  ) {}

  get snippetService(): SnippetService {
    return this._snippetService;
  }

  ngOnInit() {
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig));
    this.poolConfig = this.statsService.poolConfig.getValue();
  }

  get faucetInput() {
    if (!this.poolConfig || !this.poolConfig.faucetInput) {
      return 'address';
    }

    return this.poolConfig.faucetInput;
  }

  get bindToFunction() {
    if (!this.poolConfig || !this.poolConfig.bindToFunction) {
      return 'Reward Assignment';
    }

    return this.poolConfig.bindToFunction;
  }

  async getCoins() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    if (this.address.length === 0) {
      this._success = false;
      this._error = this.snippetService.getSnippet('faucet-component.errors.missing-address');
      this.onAfterCollect(false);
      return;
    }
    try {
      this.requestingCoins = true;
      await this.faucetService.getCoins(this.address, this.faucetInput);
      this.requestingCoins = false;
      this._success = true;
    } catch (err) {
      this.requestingCoins = false;
      this._success = false;
      this._error = err;
    }
    this.onAfterCollect();
  }

  onAfterCollect(clear = true) {
    if (clear) {
      this.address = '';
    }
    this.timeout = setTimeout(() => {
      this._success = null;
      this.timeout = null;
      this._error = null;
    }, 3 * 1000);
  }

  get success() {
    return this._success;
  }

  get error() {
    return this._error;
  }

  set poolConfig(poolConfig) {
    this._poolConfig = poolConfig;
  }

  get poolConfig() {
    return this._poolConfig;
  }

  get address() {
    return this._address;
  }

  set address(address) {
    this._address = address;
  }

  get requestingCoins(): boolean {
    return this._requestingCoins;
  }

  set requestingCoins(value: boolean) {
    this._requestingCoins = value;
  }
}
