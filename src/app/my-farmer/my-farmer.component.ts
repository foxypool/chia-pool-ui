import {Component, OnInit, ViewChild} from '@angular/core';
import {StatsService} from '../stats.service';
import {ToastService} from '../toast.service';
import {SnippetService} from '../snippet.service';
import Capacity from '../capacity';
import {faCircleNotch, faInfoCircle, faUserCheck} from '@fortawesome/free-solid-svg-icons';
import {AccountService} from '../account.service';
import * as moment from 'moment';
import {AuthenticationModalComponent} from '../authentication-modal/authentication-modal.component';
import {UpdateNameModalComponent} from '../update-name-modal/update-name-modal.component';
import BigNumber from 'bignumber.js';
import {LeavePoolModalComponent} from '../leave-pool-modal/leave-pool-modal.component';
import {UpdateMinimumPayoutModalComponent} from '../update-minimum-payout-modal/update-minimum-payout-modal.component';

@Component({
  selector: 'app-my-farmer',
  templateUrl: './my-farmer.component.html',
  styleUrls: ['./my-farmer.component.scss']
})
export class MyFarmerComponent implements OnInit {
  @ViewChild(AuthenticationModalComponent) authenticationModal;
  @ViewChild(UpdateNameModalComponent) updateNameModal;
  @ViewChild(LeavePoolModalComponent) leavePoolModal;
  @ViewChild(UpdateMinimumPayoutModalComponent) updateMinimumPayoutModal;

  public poolConfig:any = {};
  public exchangeStats:any = {};
  public poolPublicKeyInput = null;
  public faCircleNotch = faCircleNotch;
  public faUserCheck = faUserCheck;
  public faInfoCircle = faInfoCircle;

  private randomBlockHeightOffset = Math.round(Math.random() * 9);
  private poolEc = 0;
  private dailyRewardPerPib = 0;

  constructor(
    public snippetService: SnippetService,
    public accountService: AccountService,
    private statsService: StatsService,
    private toastService: ToastService,
  ) {}

  async ngOnInit() {
    this.statsService.poolConfig.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig));
    this.statsService.exchangeStats.asObservable().subscribe((exchangeStats => this.exchangeStats = exchangeStats));
    this.poolConfig = this.statsService.poolConfig.getValue();
    this.exchangeStats = this.statsService.exchangeStats.getValue();

    this.statsService.accountStats.asObservable().subscribe(async accountStats => {
      this.poolEc = accountStats.ecSum;
    });
    this.statsService.rewardStats.asObservable().subscribe(async rewardStats => {
      this.dailyRewardPerPib = rewardStats.dailyRewardPerPiB;
    });
    this.statsService.poolStats.asObservable().subscribe(async poolStats => {
      if ((poolStats.height + this.randomBlockHeightOffset) % 9 !== 0) {
        return;
      }
      if (!this.accountService.havePoolPublicKey) {
        return;
      }
      await this.accountService.updateAccount();
    });

    if (!this.accountService.havePoolPublicKey) {
      return;
    }
    await this.accountService.updateAccount();
  }

  async login() {
    if (!this.poolPublicKeyInput) {
      this.toastService.showErrorToast(this.snippetService.getSnippet('my-farmer-component.pool-pk-input.error.missing'));
      return;
    }
    const success: boolean = await this.accountService.login({ poolPublicKey: this.poolPublicKeyInput });
    if (!success) {
      return;
    }
    this.poolPublicKeyInput = null;
  }

  getFormattedCapacity(capacityInGiB) {
    if (capacityInGiB === 0) {
      return this.snippetService.getSnippet('general.not-available.short');
    }

    return (new Capacity(capacityInGiB)).toString();
  }

  getLastAcceptedPartialAtDuration(lastAcceptedPartialAt) {
    if (!lastAcceptedPartialAt) {
      return 'Never';
    }

    return moment(lastAcceptedPartialAt).fromNow();
  }

  get ecShare() {
    if (!this.accountService.account || !this.poolEc) {
      return 0;
    }

    return ((this.accountService.account.ec / this.poolEc) * 100).toFixed(2);
  }

  get estimatedDailyReward() {
    if (!this.accountService.account || !this.dailyRewardPerPib) {
      return 0;
    }
    const ecInPib = (new BigNumber(this.accountService.account.ec)).dividedBy((new BigNumber(1024).exponentiatedBy(2)));

    return ecInPib.multipliedBy(this.dailyRewardPerPib).toFixed(4);
  }

  get canLeavePool() {
    if (!this.accountService.account) {
      return false;
    }
    const account = this.accountService.account;

    return !account.hasLeftThePool && !account.isCheating
  }

  get canRejoinPool() {
    if (!this.accountService.account) {
      return false;
    }
    const account = this.accountService.account;
    if (!account.hasLeftThePool) {
      return false;
    }

    return account.collateral === undefined || account.collateral !== '0';
  }

  async authenticate() {
    this.authenticationModal.openModal();
  }

  async updateName() {
    this.updateNameModal.openModal();
  }

  async leavePool() {
    this.leavePoolModal.openModal();
  }

  async updateMinimumPayout() {
    this.updateMinimumPayoutModal.openModal();
  }

  async rejoinPool() {
    try {
      await this.accountService.rejoinPool();
      this.toastService.showSuccessToast(this.snippetService.getSnippet('my-farmer-component.rejoin-pool.success'));
    } catch (err) {
      this.toastService.showErrorToast(err.message);
    }
  }

  getCoinValueAsFiat(value) {
    if (!this.exchangeStats || !this.exchangeStats.rates) {
      return 0;
    }
    if (!value) {
      return 0;
    }
    if (this.poolConfig.isTestnet) {
      return 0;
    }
    if (!this.exchangeStats.rates.usd) { // TODO: user configurable
      return 0;
    }

    return value * this.exchangeStats.rates.usd;
  }
}
