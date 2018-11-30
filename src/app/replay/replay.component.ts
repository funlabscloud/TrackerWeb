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
  selector: 'app-replay',
  templateUrl: './replay.component.html',
  styleUrls: ['./replay.component.scss']
})
export class ReplayComponent implements OnInit {

  @Input() glob: any;
  @Output() replayClosed = new EventEmitter<boolean>();

  private transportId = '';
  private selectedMoments;
  private marker;
  private polyLine;
  private layerGroup;
  private isTrailing = false;
  private fireMovementHisRef;
  private previousPoint = { lat: '', lng: '' };

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

  onReplay() {
    const self = this;
    this.replayClosed.emit(false);
    if (this.transportId === '' || this.transportId === undefined || this.transportId === null) {
      this.snackBar.open(this.config.ERR_TRANSPORT_ID_REQUIRED, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    }
    if (this.selectedMoments === '' || this.selectedMoments === undefined || this.selectedMoments === null) {
      this.snackBar.open(this.config.ERR_DATE_RANGE_REQUIRED, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    }
    if (this.selectedMoments[0] === '' || this.selectedMoments[0] === undefined || this.selectedMoments[0] === null) {
      this.snackBar.open(this.config.ERR_DATE_RANGE_FROM_REQUIRED, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    }
    if (this.selectedMoments[1] === '' || this.selectedMoments[1] === undefined || this.selectedMoments[1] === null) {
      this.snackBar.open(this.config.ERR_DATE_RANGE_TO_REQUIRED, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    }

    for (let itr = 0; itr <= this.glob.markers.length - 1; itr++) {
      this.glob.map.removeLayer(this.glob.markers[itr]);
    }

    this.fireMovementHisRef = firebase.database()
      .ref('movement_history/' + this.glob.user.uId + '/' + this.transportId)
      .orderByChild('time')
      .startAt(new Date(this.selectedMoments[0]).getTime())
      .endAt(new Date(this.selectedMoments[1]).getTime());

    this.onTrail();
  }

  onTrail() {
    const self = this;
    this.fireMovementHisRef.once('value').then(function (movementSnapshot) {
      const movementWaypoint = movementSnapshot.val();
      if (movementWaypoint !== null && movementWaypoint !== undefined) {
        Object.keys(movementWaypoint).map(function (index) {
          const movement = movementWaypoint[index];

          let latlngs = {};
          if (self.previousPoint.lat === '' && self.previousPoint.lng === '') {
            latlngs = [[movement.lat, movement.lng], [movement.lat, movement.lng]];
          } else {
            latlngs = [[self.previousPoint.lat, self.previousPoint.lng], [movement.lat, movement.lng]];
          }
          if (movement.speed < 10) {
            self.polyLine = L.polyline(latlngs, { className: 'ployline_green' }).addTo(self.glob.map);
          } else {
            self.polyLine = L.polyline(latlngs, { className: 'ployline_red' }).addTo(self.glob.map);
          }
          self.previousPoint.lat = movement.lat;
          self.previousPoint.lng = movement.lng;
          self.layerGroup = new L.featureGroup([self.polyLine]);
        });

        // Find Parking
        const parked = self.mapUtil.geo.parkingFinder(movementWaypoint);
        if (parked.length > 0) {
          for (let itr = 0; itr <= parked.length - 1; itr++) {
            const icon = self.mapUtil.geo.mapIcon('PARKED');
            self.marker = self.mapUtil.geo.marker(parked[itr].lat, parked[itr].lng, icon, 0, self.glob.map, '', '');
            self.layerGroup = new L.featureGroup([self.marker]);
          }
        }

        self.glob.map.fitBounds(self.layerGroup.getBounds());
      } else {
        self.snackBar.open(self.config.ERR_NO_DATA_FOUND, self.config.OK, { duration: self.config.SNACKBAR_TIMEOUT });
      }
    });
  }

  closeReplayWindow() {
    this.replayClosed.emit(true);
  }
}
