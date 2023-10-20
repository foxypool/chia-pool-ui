import {Component, Input} from '@angular/core'
import {IconDefinition} from '@fortawesome/fontawesome-svg-core'

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() text
  @Input() icon: IconDefinition
}
