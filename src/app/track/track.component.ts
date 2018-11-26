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
  private parkingStart = '';
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

          if (transport.bearing === 0) {
            transport.bearing = self.mapUtil.geo.bearing(self.lastKnownPoint.lat, self.lastKnownPoint.lng, transport.lat, transport.lng);
          }

          let icon;
          const disconnectDuration = self.mapUtil.geo.timeDiffrence(new Date().getTime, transports[0].time);
          if (disconnectDuration <= 15) {
            self.track.status = 'Running';
            icon = self.mapUtil.geo.mapIcon('RUNNING');

            if (self.lastKnownPoint.lat === '' && self.lastKnownPoint.lng === '') {
              const latlngs = [[transport.lat, transport.lng], [transport.lat, transport.lng]];
              self.polyLine = L.polyline(latlngs, { color: 'green' }).addTo(self.glob.map);
            } else {

              if (transport.speed < 10) {
                icon = self.mapUtil.geo.mapIcon('IDLE');
                self.track.status = 'Idle';
                if (self.parkingStart === '') {
                  self.parkingStart = transports[0].time;
                } else {
                  const duration = self.mapUtil.geo.timeDiffrence(transports[0].time, self.parkingStart);
                  if (duration >= 5) {
                    transport.bearing = 0;
                    icon = self.mapUtil.geo.mapIcon('PARKING');
                    self.track.status = 'Parked';
                  }
                }
              }

              const latlngs = [[self.lastKnownPoint.lat, self.lastKnownPoint.lng], [transport.lat, transport.lng]];
              self.polyLine = L.polyline(latlngs, { color: 'green' }).addTo(self.glob.map);
            }

            self.mapUtil.geo.clearMarker(self.marker, self.glob.map);

            self.marker = self.mapUtil.geo.moveMarker(self.lastKnownPoint.lat, self.lastKnownPoint.lng, transport.lat,
              transport.lng, icon, transport.bearing, self.glob.map, '', 'Parked since ');

            self.lastKnownPoint.lat = transport.lat;
            self.lastKnownPoint.lng = transport.lng;
            self.track.speed = Math.round(transport.speed);

            const group = new L.featureGroup([self.marker]);
            self.glob.map.fitBounds(group.getBounds());

          } else {
            self.track.status = 'Disconnected';
            icon = self.mapUtil.geo.mapIcon('DISCONNECT');
            self.track.speed = 0;
            const marker = self.mapUtil.geo.marker(transport.lat, transport.lng, icon, 0, self.glob.map, '', '');

            const group = new L.featureGroup([marker]);
            self.glob.map.fitBounds(group.getBounds());
          }

          transport.power = Math.round(transport.power);
          transport.time = moment(transport.time).fromNow();
          self.track.battery = transport.power;
          self.track.reported = transport.time;

          self.isTracking = true;
        });
      }
    });
  }
}
