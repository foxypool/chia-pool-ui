import {Component, Input} from '@angular/core'
import {IconDefinition} from '@fortawesome/fontawesome-svg-core'
import {FaIconComponent} from '@fortawesome/angular-fontawesome'

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  standalone: true,
  imports: [
    FaIconComponent,
  ],
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() text: string
  @Input() icon: IconDefinition
}
