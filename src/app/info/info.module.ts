import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'

import {InfoComponent} from './info.component'
import {InfoRoutingModule} from './info-routing.module'
import {NgbDropdownModule} from '@ng-bootstrap/ng-bootstrap'
import {NgxEchartsModule} from 'ngx-echarts'
import {FormsModule} from '@angular/forms'
import {FontAwesomeModule} from '@fortawesome/angular-fontawesome'

@NgModule({
  declarations: [InfoComponent],
  imports: [
    CommonModule,
    InfoRoutingModule,
    NgbDropdownModule,
    NgxEchartsModule,
    FormsModule,
    FontAwesomeModule,
  ],
})
export class InfoModule { }
