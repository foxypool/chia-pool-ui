import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {InfoComponent} from './info.component';
import {InfoRoutingModule} from './info-routing.module';
import {NgbDropdownModule} from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [InfoComponent],
  imports: [
    CommonModule,
    InfoRoutingModule,
    NgbDropdownModule,
  ],
})
export class InfoModule { }
