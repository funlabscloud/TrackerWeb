import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MaterialModule } from './material.module';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { OwlDateTimeModule, OwlNativeDateTimeModule, OWL_DATE_TIME_FORMATS } from 'ng-pick-datetime';
import 'hammerjs';

export const MY_NATIVE_FORMATS = {
  fullPickerInput: { day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' },
  datePickerInput: { day: 'numeric', month: 'numeric', year: 'numeric' },
  timePickerInput: { hour: 'numeric', minute: 'numeric' },
  monthYearLabel: { month: 'short', year: 'numeric' },
  dateA11yLabel: { day: 'numeric', month: 'long', year: 'numeric' },
  monthYearA11yLabel: { month: 'long', year: 'numeric' },
};


import { Config } from './utility/config';
import { MapUtil } from './utility/maputil';

import { User } from './model/User';
import { Location } from './model/Location';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { AuthComponent } from './auth/auth.component';
import { MapComponent } from './map/map.component';
import { TrackComponent } from './track/track.component';
import { ReplayComponent } from './replay/replay.component';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    AuthComponent,
    MapComponent,
    TrackComponent,
    ReplayComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    MaterialModule,
    HttpClientModule,
    AppRoutingModule,
    LeafletModule.forRoot(),
    LeafletModule,
    NgbModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule
  ],
  providers: [
    { provide: OWL_DATE_TIME_FORMATS, useValue: MY_NATIVE_FORMATS },
    Config,
    MapUtil,
    User,
    Location],
  bootstrap: [AppComponent]
})
export class AppModule { }
