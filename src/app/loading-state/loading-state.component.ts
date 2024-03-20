import {Component, Input} from '@angular/core'
import {NgClass} from '@angular/common'

@Component({
  selector: 'app-loading-state',
  templateUrl: './loading-state.component.html',
  standalone: true,
  imports: [
    NgClass,
  ],
  styleUrls: ['./loading-state.component.scss']
})
export class LoadingStateComponent {
  @Input() width = 3
  @Input() height = 3
  @Input() fontSize = 'inherit'
  @Input() colorClass = 'text-primary'
}
