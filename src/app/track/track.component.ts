import { Component, OnInit, EventEmitter, Input, Output } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { Config } from '../utility/config';
import { MapUtil } from '../utility/maputil';
import { THIS_EXPR } from '@angular/compiler/src/output/output_ast';

declare var firebase: any;
declare var moment: any;
declare let L;

@Component({
  selector: 'app-track',
  templateUrl: './track.component.html',
  styleUrls: ['./track.component.scss']
})
export class TrackComponent implements OnInit {

  @Input() glob: any;
  @Output() trackClosed = new EventEmitter<boolean>();

  private transportId = '';
  private isTracking = false;
  private fireMovementRef;
  private marker;
  private polyLine;
  private lastKnownPoint = { lat: '', lng: '' };
  private track = { speed: 0, battery: 0, status: '', reported: '', place: '2nd Aveneue, Mugalivakkam, Chennai' };

  constructor(private config: Config, private snackBar: MatSnackBar, private mapUtil: MapUtil) { }

  ngOnInit() { }

  transportSearch = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 2 ? []
        : this.glob.myAllTransport.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )

  onTrack() {
    const self = this;
    this.trackClosed.emit(false);
    if (this.transportId === this.config.EMPTY) {
      this.snackBar.open(this.config.ERR_TRANSPORT_ID_REQUIRED, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    }

    for (let itr = 0; itr <= this.glob.markers.length - 1; itr++) {
      this.glob.map.removeLayer(this.glob.markers[itr]);
    }

    this.fireMovementRef = firebase.database().ref('movement/' + this.glob.user.uId + '/' + this.transportId);
    this.onMovementListener();
  }

  onTrackEnd() {
    this.isTracking = false;
    this.mapUtil.geo.clearMarker(this.marker, this.glob.map);
    this.mapUtil.geo.clearMarker(this.polyLine, this.glob.map);
    this.fireMovementRef.off('value');
  }

  closeTrackWindow() {
    this.trackClosed.emit(true);
  }

  onMovementListener() {
    const self = this;

    self.fireMovementRef.on('value', function (data) {
      const transports = data.val();
      if (transports !== null && transports !== undefined) {
        Object.keys(transports).map(function (index) {
          const transport = transports[0];
          transport.power = Math.round(transport.power);
          transport.time = moment(transport.time).fromNow();

          self.track.speed = Math.round(transport.speed);
          self.track.battery = transport.power;
          self.track.reported = transport.time;

          if (transport.bearing === 0) {
            transport.bearing = self.mapUtil.geo.bearing(self.lastKnownPoint.lat, self.lastKnownPoint.lng, transport.lat, transport.lng);
          }

          let icon;
          if (transport.speed > 10) {
            icon = self.mapUtil.geo.mapIcon('CAR');
            self.track.status = 'Running';
          } else {
            icon = self.mapUtil.geo.mapIcon('PARKING');
            transport.bearing = 0;
            self.track.status = 'Parked';
          }

          if (self.lastKnownPoint.lat === '' && self.lastKnownPoint.lng === '') {
            const latlngs = [[transport.lat, transport.lng], [transport.lat, transport.lng]];
            self.polyLine = L.polyline(latlngs, { color: 'green' }).addTo(self.glob.map);
          } else {
            const latlngs = [[self.lastKnownPoint.lat, self.lastKnownPoint.lng], [transport.lat, transport.lng]];
            self.polyLine = L.polyline(latlngs, { color: 'green' }).addTo(self.glob.map);
          }

          self.mapUtil.geo.clearMarker(self.marker, self.glob.map);

          self.marker = self.mapUtil.geo.moveMarker(self.lastKnownPoint.lat, self.lastKnownPoint.lng, transport.lat,
            transport.lng, icon, transport.bearing, self.glob.map, '', 'Parked since ');

          self.lastKnownPoint.lat = transport.lat;
          self.lastKnownPoint.lng = transport.lng;

          setTimeout(() => {
            if (self.polyLine !== undefined) {
              self.glob.map.fitBounds(self.polyLine.getBounds());
            }
          }, 500);

          self.isTracking = true;
        });
      }
    });
  }
}
