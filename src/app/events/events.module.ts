import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import {EventsRoutingModule} from './events-routing.module';
import {EventsComponent} from './events.component';
import {NgbProgressbarModule} from '@ng-bootstrap/ng-bootstrap';

@NgModule({
  declarations: [EventsComponent],
  imports: [
    CommonModule,
    EventsRoutingModule,
    NgbProgressbarModule,
  ],
})
export class EventsModule { }
