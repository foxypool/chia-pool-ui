import {Component} from '@angular/core';
import { faCircleNotch } from '@fortawesome/free-solid-svg-icons';
import {AccountService} from '../account.service';
import {ToastService} from '../toast.service';
import {SnippetService} from '../snippet.service';

@Component({
  selector: 'app-update-name',
  templateUrl: './update-name.component.html',
  styleUrls: ['./update-name.component.scss']
})
export class UpdateNameComponent {
  public newName = null;
  public faCircleNotch = faCircleNotch;

  constructor(
    public accountService: AccountService,
    public snippetService: SnippetService,
    private toastService: ToastService,
  ) {
    this.newName = this.accountService.account.name
  }

  get isNewNameValid(): boolean {
    return !this.newNameOrUndefined || this.newNameOrUndefined.length <= 64;
  }

  get canUpdateName(): boolean {
    if (this.accountService.isUpdatingAccount) {
      return false;
    }
    if (!this.isNewNameValid) {
      return false;
    }

    return this.accountService.account.name !== this.newNameOrUndefined;
  }

  get newNameOrUndefined(): string|undefined {
    return this.newName ? this.newName.trim() : undefined;
  }

  get accountHasName(): boolean {
    return this.accountService.account.name !== undefined;
  }

  async updateName(): Promise<void> {
    if (this.accountService.isUpdatingAccount) {
      return;
    }
    const newName = this.newNameOrUndefined;
    try {
      await this.accountService.updateName({ newName });
      if (newName) {
        this.toastService.showSuccessToast(this.snippetService.getSnippet('update-name-modal.update-success', newName));
      } else {
        this.toastService.showSuccessToast(this.snippetService.getSnippet('update-name-modal.remove-success'));
      }
    } catch (err) {
      this.toastService.showErrorToast(err.message);
    }
  }
}
