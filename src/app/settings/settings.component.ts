import { Component, OnInit } from '@angular/core';
import {StatsService} from '../stats.service';
import {SettingsService} from '../settings.service';
import {faCheck, faCircleNotch, faSignOutAlt, faTimes} from '@fortawesome/free-solid-svg-icons';
import { NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {ToastService} from '../toast.service';
import {SnippetService} from '../snippet.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {

  private _poolConfig:any = {};
  private _poolStats:any = {};
  private _payoutAddress;
  private _checkingPayoutAddress = false;
  private _verifyingIdentity = false;
  private _payoutAddressExists = false;
  private _identityVerified = null;
  private _messageToSign;
  private _pubKey;
  private _messageSignature;
  private _faCheck = faCheck;
  private _faCircleNotch = faCircleNotch;
  private _faTimes = faTimes;
  private _faSignOut = faSignOutAlt;
  private _accountName;
  private _distributionRatio;
  private _accountStats;
  private _onDemandPayoutAmount;

  constructor(
    private statsService: StatsService,
    private settingsService: SettingsService,
    private modalService: NgbModal,
    private toastService: ToastService,
    private _snippetService: SnippetService,
  ) {
    this._payoutAddress = this.settingsService.payoutAddress;
    this.messageToSign = this.settingsService.messageToSign;
    this.pubKey = this.settingsService.pubKey;
    this.messageSignature = this.settingsService.messageSignature;
    this.identityVerified = this.settingsService.identityVerified;
    if (this.payoutAddress && !this.messageToSign) {
      this.checkPayoutAddress();
    }
  }

  get snippetService(): SnippetService {
    return this._snippetService;
  }

  ngOnInit() {
    this.statsService.poolConfigSubject.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig));
    this.statsService.poolStatsSubject.asObservable().subscribe((poolStats => this.poolStats = poolStats));
    this.poolConfig = this.statsService.poolConfigSubject.getValue();
    this.poolStats = this.statsService.poolStatsSubject.getValue();
    if (this.identityVerified) {
      this.updateAccountStats();
    }
  }

  set poolConfig(poolConfig) {
    this._poolConfig = poolConfig;
  }

  get poolConfig() {
    return this._poolConfig;
  }

  async checkPayoutAddress() {
    this.payoutAddressExists = false;
    if (!this.payoutAddress) {
      return;
    }
    this.checkingPayoutAddress = true;
    const exists = await this.settingsService.checkPayoutAddress(this.payoutAddress);
    this.checkingPayoutAddress = false;
    this.payoutAddressExists = exists;
    if (this.payoutAddressExists) {
      this.settingsService.payoutAddress = this.payoutAddress;
      this._messageToSign = this.getMessageToSign();
    }
  }

  async verifyIdentity() {
    this.verifyingIdentity = true;
    const valid = await this.settingsService.verifyIdentity(this.payoutAddress, this.messageToSign, this.messageSignature, this.pubKey);
    this.verifyingIdentity = false;
    this.identityVerified = valid;
    if (this.identityVerified) {
      this.settingsService.messageToSign = this.messageToSign;
      this.settingsService.pubKey = this.pubKey;
      this.settingsService.messageSignature = this.messageSignature;
      this.settingsService.identityVerified = true;
      this.updateAccountStats();
    }
  }

  updateAccountStats() {
    this.accountStats = this.accounts.find(account => account.payoutAddress === this.payoutAddress);
  }

  openOnDemandPayout(content) {
    this.modalService.open(content).result.then(async () => {
      try {
        await this.requestOnDemandPayout(this.onDemandPayoutAmount);
        this.onDemandPayoutAmount = undefined;
        this.toastService.showSuccessToast(this.snippetService.getSnippet('settings-component.actions.on-demand-payout.success'));
      } catch (err) {
        this.toastService.showErrorToast(this.snippetService.getSnippet('general.error', err));
      }
    }, (reason) => {
    });
  }

  openSetAccountName(content) {
    this.modalService.open(content).result.then(async () => {
      try {
        await this.setAccountName(this.accountName);
        this.toastService.showSuccessToast(this.snippetService.getSnippet('settings-component.actions.set-account-name.success'));
      } catch (err) {
        this.toastService.showErrorToast(this.snippetService.getSnippet('general.error', err));
      }
    }, (reason) => {
    });
  }

  openSetDistributionRatio(content) {
    this.modalService.open(content).result.then(async () => {
      try {
        await this.setDistributionRatio(this.distributionRatio);
        this.toastService.showSuccessToast(this.snippetService.getSnippet('settings-component.actions.set-distribution-ratio.success'));
      } catch (err) {
        this.toastService.showErrorToast(this.snippetService.getSnippet('general.error', err));
      }
    }, (reason) => {
    });
  }

  setAccountName(accountName) {
    return this.settingsService.setAccountName(this.payoutAddress, this.messageToSign, this.messageSignature, this.pubKey, accountName);
  }

  setDistributionRatio(ratio) {
    return this.settingsService.setDistributionRatio(this.payoutAddress, this.messageToSign, this.messageSignature, this.pubKey, ratio);
  }

  requestOnDemandPayout(amount) {
    return this.settingsService.requestPayout(this.payoutAddress, this.messageToSign, this.messageSignature, this.pubKey, amount);
  }

  logout() {
    this.settingsService.logout();
    this.payoutAddress = null;
    this.messageToSign = null;
    this.pubKey = null;
    this.messageSignature = null;
    this.identityVerified = null;
  }

  set poolStats(stats) {
    this._poolStats = stats;
    if (this.identityVerified) {
      this.updateAccountStats();
    }
  }

  get poolStats() {
    return this._poolStats;
  }

  get accounts() {
    if (!this.poolStats || !this.poolStats.accounts) {
      return [];
    }

    return this.poolStats.accounts;
  }

  get payoutAddress() {
    return this._payoutAddress;
  }

  set payoutAddress(payoutAddress) {
    if (payoutAddress) {
      payoutAddress = payoutAddress.trim();
    }
    this._payoutAddress = payoutAddress;
    this._messageToSign = undefined;
    this.checkPayoutAddress();
  }

  get checkingPayoutAddress(): boolean {
    return this._checkingPayoutAddress;
  }

  set checkingPayoutAddress(value: boolean) {
    this._checkingPayoutAddress = value;
  }

  get payoutAddressExists(): boolean {
    return this._payoutAddressExists;
  }

  set payoutAddressExists(value: boolean) {
    this._payoutAddressExists = value;
  }

  get faCheck() {
    return this._faCheck;
  }

  get faCircleNotch() {
    return this._faCircleNotch;
  }

  get faTimes() {
    return this._faTimes;
  }

  get faSignOut() {
    return this._faSignOut;
  }

  get messageSignature() {
    return this._messageSignature;
  }

  set messageSignature(value) {
    this._messageSignature = value;
  }

  get time() {
    return (new Date()).getTime();
  }

  getMessageToSign() {
    return `${this.payoutAddress}|${this.time}`;
  }

  get messageToSign() {
    return this._messageToSign;
  }

  set messageToSign(messageToSign) {
    this._messageToSign = messageToSign;
  }

  coinRequiresPubKey(coin) {
    return coin === 'BURST';
  }

  get pubKey() {
    return this._pubKey;
  }

  set pubKey(value) {
    this._pubKey = value;
  }

  get verificationInputExists() {
    return this.messageSignature && (this.coinRequiresPubKey(this.poolConfig.coin) ? !!this.pubKey : true);
  }

  get verifyingIdentity(): boolean {
    return this._verifyingIdentity;
  }

  set verifyingIdentity(value: boolean) {
    this._verifyingIdentity = value;
  }

  get identityVerified(): boolean {
    return this._identityVerified;
  }

  set identityVerified(value: boolean) {
    this._identityVerified = value;
  }

  get accountName() {
    return this._accountName;
  }

  set accountName(value) {
    this._accountName = value;
  }

  get distributionRatio() {
    return this._distributionRatio;
  }

  set distributionRatio(value) {
    this._distributionRatio = value;
  }

  set blockWinnerRatio(ratio) {
    if (ratio < 0 || ratio > 100) {
      return;
    }
    ratio = Math.round(ratio);
    this.distributionRatio = `${ratio}-${100 - ratio}`;
  }

  get blockWinnerRatio() {
    let dr = this.poolConfig.defaultDistributionRatio
    if (this.distributionRatio) {
      dr = this.distributionRatio;
    }

    return dr.split('-').map(part => parseInt(part, 10))[0];
  }

  set historicalRatio(ratio) {
    if (ratio < 0 || ratio > 100) {
      return;
    }
    ratio = Math.round(ratio);
    this.distributionRatio = `${100 - ratio}-${ratio}`;
  }

  get historicalRatio() {
    let dr = this.poolConfig.defaultDistributionRatio
    if (this.distributionRatio) {
      dr = this.distributionRatio;
    }

    return dr.split('-').map(part => parseInt(part, 10))[1];
  }

  get accountStats() {
    return this._accountStats || { pending: 0 };
  }

  get onDemandPayoutAmount() {
    return this._onDemandPayoutAmount;
  }

  set onDemandPayoutAmount(value) {
    this._onDemandPayoutAmount = value;
  }

  set accountStats(accountStats) {
    this._accountStats = accountStats;
    if (!accountStats) {
      return;
    }
    this.distributionRatio = accountStats.distributionRatio;
    this.accountName = accountStats.name;
  }

  get signingUrl() {
    let endpoint = '';
    switch (this.poolConfig.coin) {
      default:
        endpoint = '/chia';
    }

    return `https://signing.foxypool.io${endpoint}?messageToSign=${this.messageToSign}`;
  }
}
