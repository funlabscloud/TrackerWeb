import { Component, OnInit, EventEmitter, Input, Output } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
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
    private mapUtil: MapUtil,
    private http: HttpClient) { }

  ngOnInit() {

  }

  transportSearch = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => term.length < 2 ? []
        : this.glob.myAllTransport.filter(v => v.toLowerCase().indexOf(term.toLowerCase()) > -1).slice(0, 10))
    )

  onReplay() {
    const self = this;
    this.glob.layers = [];
    this.previousPoint = { lat: '', lng: '' };
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

    this.snackBar.open(this.config.MSG_REPLAY_HISTORY, this.config.OK, { duration: this.config.SNACKBAR_EVER });

    // Remove all layers
    this.mapUtil.geo.clearLayers(this.glob.layers, this.glob.map);

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

        /*Object.keys(movementWaypoint).map(function (index) {
          const movement = movementWaypoint[index];

          let latlngs = {};
          if (self.previousPoint.lat === '' && self.previousPoint.lng === '') {
            latlngs = [[movement.lat, movement.lng], [movement.lat, movement.lng]];
          } else {
            latlngs = [[self.previousPoint.lat, self.previousPoint.lng], [movement.lat, movement.lng]];
          }

          if (movement.calspeed < 80) {
            self.polyLine = L.polyline(latlngs, { className: 'ployline_green' }).addTo(self.glob.map);
          } else {
            self.polyLine = L.polyline(latlngs, { className: 'ployline_red' }).
              bindPopup('Speed ' + movement.calspeed + 'km/h').addTo(self.glob.map);
          }
          self.previousPoint.lat = movement.lat;
          self.previousPoint.lng = movement.lng;
          self.glob.layers.push(self.polyLine);
        });*/

        // Start & End marker
        const maxWaypoints = Object.keys(movementWaypoint).length;
        const startPoint: any = Object.keys(movementWaypoint)[0];
        const endPoint: any = Object.keys(movementWaypoint)[maxWaypoints - 1];
        const iconStart = self.mapUtil.geo.mapIcon('START');
        const iconEnd = self.mapUtil.geo.mapIcon('END');
        const startMarker = self.mapUtil.geo.marker(movementWaypoint[startPoint].lat,
          movementWaypoint[startPoint].lng, iconStart, 0, self.glob.map, '', '');
        const endMarker = self.mapUtil.geo.marker(movementWaypoint[endPoint].lat,
          movementWaypoint[endPoint].lng, iconEnd, 0, self.glob.map, '', '');
        self.glob.layers.push(startMarker);
        self.glob.layers.push(endMarker);

        // Find Parking
        const parked = self.mapUtil.geo.parkingFinder(movementWaypoint);
        if (parked.length > 0) {
          for (let itr = 0; itr <= parked.length - 1; itr++) {
            const icon_blink = L.divIcon({
              className: '',
              iconSize: null,
              html: '<span class="dot-indicator"><div style="position: relative;margin: 0px auto;" class="dot-warning"></div></span>'
            });
            self.marker = self.mapUtil.geo.marker(parked[itr].lat, parked[itr].lng, icon_blink, 0, self.glob.map, '', '');
            self.glob.layers.push(self.marker);
            const icon = self.mapUtil.geo.mapIcon('PARKED');
            self.marker = self.mapUtil.geo.marker(parked[itr].lat, parked[itr].lng, icon, 0, self.glob.map, '', '');

            self.glob.layers.push(self.marker);
          }
        }

        // Direction API call
        let mapQuestDirApi = 'https://api.openrouteservice.org/directions?' +
          'api_key=5b3ce3597851110001cf6248ab48c8e792414510a89922081cff3695&' +
          'profile=driving-car&format=json&' +
          'units=km&geometry=true&geometry_format=geojson&instructions=false' +
          '&coordinates=';


        Object.keys(movementWaypoint).map(function (index) {
          const movement = movementWaypoint[index];
          mapQuestDirApi = mapQuestDirApi + movement.lng + ',' + movement.lat + '|';
        });

        mapQuestDirApi = mapQuestDirApi.substring(0, mapQuestDirApi.length - 2);

        self.getMapQuestDirection(mapQuestDirApi)
          .subscribe((d: any) => {
            for (let itr = 0; itr <= d.routes[0].geometry.coordinates.length - 1; itr++) {

              const lat = d.routes[0].geometry.coordinates[itr][1];
              const lng = d.routes[0].geometry.coordinates[itr][0];
              let latlngs = {};
              if (self.previousPoint.lat === '' && self.previousPoint.lng === '') {
                latlngs = [[lat, lng],
                [lat, lng]];
              } else {
                latlngs = [[self.previousPoint.lat, self.previousPoint.lng],
                [lat, lng]];
              }

              self.polyLine = L.polyline(latlngs, { className: 'ployline_green' }).addTo(self.glob.map);
              self.previousPoint.lat = lat;
              self.previousPoint.lng = lng;
              self.glob.layers.push(self.polyLine);
            }
          });

        /*if (maxWaypoints > 2) {
          const wayPoints = [];
          let maxPoints = 7;
          let direction = 0;

          const directionService = new google.maps.DirectionsService();
          const src = new google.maps.LatLng(startPoint.lat, startPoint.lng);
          const dest = new google.maps.LatLng(endPoint.lat, endPoint.lng);

          Object.keys(movementWaypoint).map(function (index) {
            if (maxPoints > 0 && direction % 5 === 0) {
              const movement = movementWaypoint[index];
              wayPoints.push({
                location: { lat: movement.lat, lng: movement.lng },
                stopover: true
              });
              maxPoints = maxPoints - 1;
            }
            direction = direction + 1;
          });

          directionService.route({
            origin: src,
            destination: dest,
            optimizeWaypoints: true,
            travelMode: google.maps.DirectionsTravelMode.DRIVING
          }, function (result, status) {
            if (status === google.maps.DirectionsStatus.OK) {
              for (let itr = 0, len = result.routes[0].overview_path.length; itr < len; itr++) {
                self.polyLine.push(result.routes[0].overview_path[itr]);
              }
            }
          });
        }*/

        // Fit Bounds
        self.layerGroup = new L.featureGroup(self.glob.layers);
        self.glob.map.fitBounds(self.layerGroup.getBounds());
        self.snackBar.dismiss();
      } else {
        self.snackBar.open(self.config.ERR_NO_DATA_FOUND, self.config.OK, { duration: self.config.SNACKBAR_TIMEOUT });
      }
    });
  }

  closeReplayWindow() {
    this.mapUtil.geo.clearLayers(this.glob.layers, this.glob.map);
    this.replayClosed.emit(true);
  }

  getMapQuestDirection(url) {
    return this.http.get(url);
  }
}

