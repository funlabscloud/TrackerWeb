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
    this.trackClosed.emit(false);
    if (this.transportId === this.config.EMPTY) {
      this.snackBar.open(this.config.ERR_TRANSPORT_ID_REQUIRED, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    }

    // Remove all layers
    this.mapUtil.geo.clearLayers(this.glob.layers, this.glob.map);

    this.glob.layers = [];
    this.lastKnownPoint = { lat: '', lng: '' };

    this.fireMovementRef = firebase.database().ref('movement/' + this.glob.user.uId + '/' + this.transportId);
    this.onMovementListener();
  }

  onTrackEnd() {
    this.isTracking = false;
    this.mapUtil.geo.clearLayers(this.glob.layers, this.glob.map);
    this.fireMovementRef.off('value');
  }

  closeTrackWindow() {
    this.isTracking = false;
    this.mapUtil.geo.clearLayers(this.glob.layers, this.glob.map);
    if (this.fireMovementRef !== undefined) {
      this.fireMovementRef.off('value');
    }
    this.trackClosed.emit(true);
  }

  onMovementListener() {
    const self = this;

    setTimeout(() => {
      self.snackBar.open(self.config.MSG_PLS_WAIT, self.config.EMPTY, { duration: self.config.SNACKBAR_EVER });
    });

    self.fireMovementRef.on('value', function (data) {
      const transports = data.val();
      if (transports !== null && transports !== undefined) {
        Object.keys(transports).forEach(function (index) {
          const transport = transports[0];

          let icon;
          const disconnectDuration = self.mapUtil.geo.timeDiffrence(transports[0].time, new Date().getTime());
          if (disconnectDuration >= 10) {
            self.track.speed = 0;
            self.isParked = false;
            self.parkingStart = undefined;
            self.track.statusCSS = 'dot-danger';
            self.track.status = 'Disconnected';
            icon = self.mapUtil.geo.mapIcon('DISCONNECT');
            self.marker = self.mapUtil.geo.marker(transport.lat, transport.lng, icon, 0, self.glob.map, '', '');
          } else {
            if (transport.motion === 'IDLE') {
              self.isParked = false;
              self.parkingStart = undefined;
              icon = self.mapUtil.geo.mapIcon('IDLE');
              self.track.status = 'IDLE';
              self.track.statusCSS = 'dot-facebook';
              self.marker = self.mapUtil.geo.marker(transport.lat, transport.lng, icon, 0, self.glob.map, '', '');
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
              self.glob.layers.push(self.polyLine);
            }
          }
          self.glob.layers.push(self.marker);

          self.lastKnownPoint.lat = transport.lat;
          self.lastKnownPoint.lng = transport.lng;
          transport.power = Math.round(transport.power);
          transport.time = moment(transport.time).fromNow();
          self.track.battery = transport.power;
          self.track.reported = transport.time;

          if (transport.power >= 0 && transport.power <= 20) {
            self.track.batteryCSS = 'badge-danger';
          } else if (transport.power >= 21 && transport.power <= 50) {
            self.track.batteryCSS = 'badge-warning';
          } else if (transport.power > 51 && transport.power <= 100) {
            self.track.batteryCSS = 'badge-success';
          }
          self.isTracking = true;

          // Fit Bounds
          self.layerGroup = new L.featureGroup(self.glob.layers);
          self.glob.map.fitBounds(self.layerGroup.getBounds());
        });
      }
      self.snackBar.dismiss();
    });
  }
}
