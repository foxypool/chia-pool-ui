import { Injectable } from '@angular/core';
import {LocalStorageService} from './local-storage.service';
import {StatsService} from "./stats.service";
import {PoolsProvider} from "./pools.provider";
import {BehaviorSubject} from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class SettingsService {

  private _dr = new BehaviorSubject<string>(null);

  constructor(
    private statsService: StatsService,
    private localStorageService: LocalStorageService,
    private poolsProvider: PoolsProvider,
  ) {
    let dr = this.localStorageService.getItem('settings/dr') || null;
    if (dr === 'null') {
      dr = null;
    }
    this._dr.next(dr);
  }

  set dr(dr) {
    this.localStorageService.setItem('settings/dr', dr);
    this._dr.next(dr);
  }

  get dr() {
    return this._dr.getValue();
  }

  subscribeToDrChange(cb) {
    this._dr.subscribe(cb);
  }

  checkPayoutAddress(payoutAddress): Promise<boolean> {
    return new Promise((resolve) => this.statsService.getWebsocketService().publish('check/payout-address', this.poolsProvider.poolIdentifier, payoutAddress, ({ result }) => resolve(result)));
  }

  verifyIdentity(payoutAddress, messageToVerify, messageSignature, pubKey = null): Promise<boolean> {
    return new Promise((resolve) => this.statsService.getWebsocketService().publish('verify/identity', this.poolsProvider.poolIdentifier, {
      payoutAddress,
      messageToVerify,
      messageSignature,
      pubKey,
    }, ({ result }) => {
      resolve(!!result);
    }));
  }

  setAccountName(payoutAddress, messageToVerify, messageSignature, pubKey = null, accountName) {
    return new Promise((resolve, reject) => this.statsService.getWebsocketService().publish('settings/set-account-name', this.poolsProvider.poolIdentifier, {
      payoutAddress,
      messageToVerify,
      messageSignature,
      pubKey,
      accountName,
    }, ({error, result}) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    }));
  }

  setDistributionRatio(payoutAddress, messageToVerify, messageSignature, pubKey = null, distributionRatio) {
    return new Promise((resolve, reject) => this.statsService.getWebsocketService().publish('settings/set-distribution-ratio', this.poolsProvider.poolIdentifier, {
      payoutAddress,
      messageToVerify,
      messageSignature,
      pubKey,
      distributionRatio,
    }, ({error, result}) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    }));
  }

  requestPayout(payoutAddress, messageToVerify, messageSignature, pubKey = null, payoutAmount) {
    return new Promise((resolve, reject) => this.statsService.getWebsocketService().publish('settings/request-payout', this.poolsProvider.poolIdentifier, {
      payoutAddress,
      messageToVerify,
      messageSignature,
      pubKey,
      payoutAmount,
    },({error, result}) => {
      if (error) {
        return reject(error);
      }
      resolve(result);
    }));
  }

  logout() {
    this.localStorageService.removeItem('settings/payoutAddress');
    this.localStorageService.removeItem('settings/messageToSign');
    this.localStorageService.removeItem('settings/pubKey');
    this.localStorageService.removeItem('settings/messageSignature');
    this.localStorageService.removeItem('settings/identityVerified');
  }

  get payoutAddress() {
    return this.localStorageService.getItem('settings/payoutAddress');
  }

  set payoutAddress(payoutAddress) {
    this.localStorageService.setItem('settings/payoutAddress', payoutAddress);
  }

  get messageToSign() {
    return this.localStorageService.getItem('settings/messageToSign');
  }

  set messageToSign(messageToSign) {
    this.localStorageService.setItem('settings/messageToSign', messageToSign);
  }

  get pubKey() {
    return this.localStorageService.getItem('settings/pubKey');
  }

  set pubKey(pubKey) {
    this.localStorageService.setItem('settings/pubKey', pubKey);
  }

  get messageSignature() {
    return this.localStorageService.getItem('settings/messageSignature');
  }

  set messageSignature(messageSignature) {
    this.localStorageService.setItem('settings/messageSignature', messageSignature);
  }

  get identityVerified() {
    const identityVerifiedString = this.localStorageService.getItem('settings/identityVerified');
    return identityVerifiedString === 'true' ? true : identityVerifiedString === 'false' ? false : null;
  }

  set identityVerified(identityVerified) {
    this.localStorageService.setItem('settings/identityVerified', identityVerified.toString());
  }
}
