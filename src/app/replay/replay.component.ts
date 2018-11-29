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
  private dateRange;
  private isTrailing = false;
  private fireMovementHisRef;

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
    if (this.transportId === this.config.EMPTY || this.transportId === this.config.UNDEFINED) {
      this.snackBar.open(this.config.ERR_TRANSPORT_ID_REQUIRED, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    }
    if (this.dateRange === this.config.EMPTY || this.dateRange === this.config.UNDEFINED) {
      this.snackBar.open(this.config.ERR_DATE_RANGE_REQUIRED, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    }

    for (let itr = 0; itr <= this.glob.markers.length - 1; itr++) {
      this.glob.map.removeLayer(this.glob.markers[itr]);
    }

    this.fireMovementHisRef = firebase.database()
      .ref('movement_history/' + this.glob.user.uId + '/' + this.transportId)
      .orderByChild('time')
      .startAt(new Date(this.dateRange[0]).getTime())
      .endAt(new Date(this.dateRange[1]).getTime());

    this.onTrail();
  }

  onTrail() {
    this.fireMovementHisRef.once('value').then(function (movementSnapshot) {

      const movementWaypoint = movementSnapshot.val();
      if (movementWaypoint !== null && movementWaypoint !== undefined) {
        Object.keys(movementWaypoint).map(function (index) {
          console.log(index);
        });
      }
    });
  }

  closeReplayWindow() {
    this.replayClosed.emit(true);
  }
}
