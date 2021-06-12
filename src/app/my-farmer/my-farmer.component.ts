import { Component, OnInit } from '@angular/core';
import {SettingsService} from '../settings.service';
import {LocalStorageService} from '../local-storage.service';
import {StatsService} from '../stats.service';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {ToastService} from '../toast.service';
import {SnippetService} from '../snippet.service';
import Capacity from '../capacity';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import {AccountService} from '../account.service';
import * as moment from 'moment';

@Component({
  selector: 'app-my-farmer',
  templateUrl: './my-farmer.component.html',
  styleUrls: ['./my-farmer.component.scss']
})
export class MyFarmerComponent implements OnInit {
  public poolConfig:any = {};
  public account = null;
  public isLoading = false;
  public poolPublicKeyInput = null;
  public faCircleNotch = faCircleNotch;

  private randomBlockHeightOffset = Math.round(Math.random() * 9);
  private poolEc = 0;

  constructor(
    public snippetService: SnippetService,
    public accountService: AccountService,
    private statsService: StatsService,
    private toastService: ToastService,
  ) {}

  async ngOnInit() {
    this.statsService.poolConfigSubject.asObservable().subscribe((poolConfig => this.poolConfig = poolConfig));
    this.poolConfig = this.statsService.poolConfigSubject.getValue();

    this.statsService.poolStatsSubject.asObservable().subscribe(async poolStats => {
      this.poolEc = poolStats.ecSum;
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
}
