import { Component, OnInit } from '@angular/core';

declare var firebase: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  constructor() { }

  ngOnInit() {
    const config = {
      apiKey: 'AIzaSyDoatNDu3HIw8J1Lnvjf94pGrBF4DLe51o',
      authDomain: 'myassettracks.firebaseapp.com',
      databaseURL: 'https://myassettracks.firebaseio.com',
      projectId: 'myassettracks',
      storageBucket: 'myassettracks.appspot.com',
      messagingSenderId: '708478659569'
    };
    firebase.initializeApp(config);
  }
}
