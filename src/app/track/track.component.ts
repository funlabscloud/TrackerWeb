import { Component, OnInit, EventEmitter, Input, Output } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { Observable } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { Config } from '../utility/config';
import { MapUtil } from '../utility/maputil';

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
  private layerGroup;
  private parkingStart: any;
  private isParked = false;
  private runningTime = new Date();
  private lastKnownPoint = { lat: '', lng: '' };
  private track = {
    speed: 0,
    battery: 0,
    status: '',
    reported: '',
    place: '2nd Aveneue, Mugalivakkam, Chennai',
    batteryCSS: '',
    statusCSS: ''
  };

  constructor(private config: Config,
    private snackBar: MatSnackBar,
    private mapUtil: MapUtil) { }

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
    this.trackClosed.emit(true);
  }

  closeTrackWindow() {
    this.isTracking = false;
    this.mapUtil.geo.clearMarker(this.marker, this.glob.map);
    this.mapUtil.geo.clearMarker(this.polyLine, this.glob.map);
    if (this.fireMovementRef !== undefined) {
      this.fireMovementRef.off('value');
    }
    this.trackClosed.emit(true);
  }

  onMovementListener() {
    const self = this;

    self.fireMovementRef.on('value', function (data) {
      const transports = data.val();
      if (transports !== null && transports !== undefined) {
        Object.keys(transports).map(function (index) {
          const transport = transports[0];

          let icon;
          self.mapUtil.geo.clearMarker(self.marker, self.glob.map);

          const disconnectDuration = self.mapUtil.geo.timeDiffrence(new Date().getTime(),
            transports[0].time);
          if (disconnectDuration >= 30) {
            self.track.speed = 0;
            self.track.statusCSS = 'dot-danger';
            self.track.status = 'Disconnected';
            icon = self.mapUtil.geo.mapIcon('DISCONNECT');
            self.marker = self.mapUtil.geo.marker(transport.lat, transport.lng, icon, 0, self.glob.map, '', '');
            self.layerGroup = new L.featureGroup([self.marker]);
            self.isParked = false;
            self.parkingStart = undefined;
          } else {
            if (transport.motion === 'IDLE') {
              icon = self.mapUtil.geo.mapIcon('IDLE');
              self.track.status = 'IDLE';
              self.track.statusCSS = 'dot-facebook';
              self.marker = self.mapUtil.geo.marker(transport.lat, transport.lng, icon, 0, self.glob.map, '', '');
              self.layerGroup = new L.featureGroup([self.marker]);
              self.isParked = false;
              self.parkingStart = undefined;
            } else if (transport.motion === 'PARKED') {
              if (self.parkingStart === undefined) {
                self.parkingStart = new Date(transport.time);
              }
              icon = self.mapUtil.geo.mapIcon('PARKED');
              self.isParked = true;
              self.track.speed = 0;
              self.track.status = 'Parked';
              self.track.statusCSS = 'dot-warning';
              self.marker = self.mapUtil.geo.marker(transport.lat, transport.lng, icon, 0, self.glob.map, '', '');
              self.layerGroup = new L.featureGroup([self.marker]);
              setInterval(() => {
                self.runningTime = new Date();
              }, 1000);
            } else if (transport.motion === 'RUNNING') {
              self.isParked = false;
              self.parkingStart = undefined;
              self.track.status = 'Running';
              self.track.statusCSS = 'dot-success';
              self.track.speed = Math.round(transport.speed);
              icon = self.mapUtil.geo.mapIcon('RUNNING');

              if (transport.bearing === 0) {
                transport.bearing = self.mapUtil.geo.bearing(self.lastKnownPoint.lat,
                  self.lastKnownPoint.lng, transport.lat, transport.lng);
              }
              if (self.lastKnownPoint.lat === '' && self.lastKnownPoint.lng === '') {
                const latlngs = [[transport.lat, transport.lng], [transport.lat, transport.lng]];
                self.polyLine = L.polyline(latlngs, { color: 'green' }).addTo(self.glob.map);

                self.marker = self.mapUtil.geo.moveMarker(self.lastKnownPoint.lat, self.lastKnownPoint.lng, transport.lat,
                  transport.lng, icon, transport.bearing, self.glob.map, '', '');
              } else {
                const latlngs = [[self.lastKnownPoint.lat, self.lastKnownPoint.lng], [transport.lat, transport.lng]];
                self.polyLine = L.polyline(latlngs, { color: 'green' }).addTo(self.glob.map);
                self.marker = self.mapUtil.geo.moveMarker(self.lastKnownPoint.lat, self.lastKnownPoint.lng, transport.lat,
                  transport.lng, icon, transport.bearing, self.glob.map, '', '');
              }
              self.layerGroup = new L.featureGroup([self.polyLine]);
            }
          }

          self.lastKnownPoint.lat = transport.lat;
          self.lastKnownPoint.lng = transport.lng;
          transport.power = Math.round(transport.power);
          transport.time = moment(transport.time).fromNow();
          self.track.battery = transport.power;
          self.track.reported = transport.time;
          self.glob.map.fitBounds(self.layerGroup.getBounds());

          if (transport.power >= 0 && transport.power <= 20) {
            self.track.batteryCSS = 'badge-danger';
          } else if (transport.power >= 21 && transport.power <= 50) {
            self.track.batteryCSS = 'badge-warning';
          } else if (transport.power > 51 && transport.power <= 100) {
            self.track.batteryCSS = 'badge-success';
          }
          self.isTracking = true;
        });
      }
    });
  }
}
