import {Component, Input} from '@angular/core'
import {faInfoCircle} from '@fortawesome/free-solid-svg-icons'
import {VersionUpdateInfo} from '../clients/clients'

@Component({
  selector: 'app-version-info',
  templateUrl: './version-info.component.html',
  styleUrls: ['./version-info.component.scss']
})
export class VersionInfoComponent {
  @Input() versionName: string
  @Input() versionString: string
  @Input() versionUpdateInfo: VersionUpdateInfo

  protected readonly faInfoCircle = faInfoCircle

  public get versionColorClasses(): string[] {
    switch (this.versionUpdateInfo) {
      case VersionUpdateInfo.noActionRequired: return []
      case VersionUpdateInfo.updateRecommended: return ['color-orange']
      case VersionUpdateInfo.updateStronglyRecommended: return ['color-red']
    }
  }

  public get versionUpdateTooltip(): string|undefined {
    switch (this.versionUpdateInfo) {
      case VersionUpdateInfo.noActionRequired: return
      case VersionUpdateInfo.updateRecommended: return 'There is an update available, it is recommended to update'
      case VersionUpdateInfo.updateStronglyRecommended: return 'There is an update available, it is strongly recommended to update'
    }
  }
}
