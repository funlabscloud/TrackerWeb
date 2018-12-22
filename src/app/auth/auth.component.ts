import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material';
import { Router } from '@angular/router';

import { User } from '../model/User';
import { Config } from '../utility/config';

declare var firebase: any;

@Component({
  selector: 'app-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit {
  private page = 'login';

  constructor(public snackBar: MatSnackBar,
    private config: Config,
    private router: Router,
    private user: User
  ) { }

  ngOnInit() {
    const self = this;
    this.onAuthStateChanged(self);
  }

  setSignInLayout() {
    this.page = 'login';
  }

  setRegisterLayout() {
    this.page = 'register';
  }

  setForgotPasswordLayout() {
    this.page = 'forgot';
  }

  doRegister() {
    const self = this;

    self.snackBar.open('Creating account for you', self.config.OK, { duration: self.config.SNACKBAR_EVER });

    if (this.user.userName === this.config.EMPTY || this.user.userName === undefined) {
      this.snackBar.open(this.config.ERR_AUTH_INVALID_NAME, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    } else if (this.user.email === this.config.EMPTY || this.user.email === undefined) {
      this.snackBar.open(this.config.ERR_AUTH_INVALID_EMAIL, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    } else if (this.user.password === this.config.EMPTY || this.user.password === undefined) {
      this.snackBar.open(this.config.ERR_AUTH_INVALID_PASSWORD, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    }

    firebase.auth().createUserWithEmailAndPassword(this.user.email, this.user.password)
      .then(function (res) {
        self.snackBar.dismiss();

        // Update user info
        const currentUser = firebase.auth().currentUser;
        currentUser.updateProfile({
          displayName: self.user.userName
        });

        // Write to DB
        self.createUserCollection(self.user.email, self.user.userName);

        // Setting user to local storage
        self.user.uId = currentUser.uid;
        localStorage.setItem('user', JSON.stringify(self.user));
      })
      .catch(function (error) {
        self.snackBar.open(error.message, self.config.OK, { duration: self.config.SNACKBAR_TIMEOUT });
      });
  }

  doSignIn() {
    const self = this;

    self.snackBar.open('Verifying your authentication', self.config.OK, { duration: self.config.SNACKBAR_EVER });

    if (this.user.email === this.config.EMPTY || this.user.email === undefined) {
      this.snackBar.open(this.config.ERR_AUTH_INVALID_EMAIL, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    } else if (this.user.password === this.config.EMPTY || this.user.password === undefined) {
      this.snackBar.open(this.config.ERR_AUTH_INVALID_PASSWORD, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    }

    firebase.auth().signInWithEmailAndPassword(this.user.email, this.user.password)
      .then(function (res) {
        self.snackBar.dismiss();
        if (res.user.emailVerified) {
          self.user.uId = res.user.uid;
          self.user.email = res.user.email;
          self.user.userName = res.user.displayName;
          self.user.password = '';
          localStorage.setItem('user', JSON.stringify(self.user));
          self.router.navigate([self.config.URL_HOME]);
        } else {
          self.page = 'verify';
        }
      })
      .catch(function (error) {
        self.snackBar.open(error.message, self.config.OK, { duration: self.config.SNACKBAR_TIMEOUT });
      });
  }

  doForgotPassword() {
    const self = this;
    if (this.user.email === this.config.EMPTY || this.user.email === undefined) {
      this.snackBar.open(this.config.ERR_AUTH_INVALID_EMAIL, this.config.OK, { duration: this.config.SNACKBAR_TIMEOUT });
      return;
    }
    this.snackBar.open('Getting your password', self.config.OK, { duration: self.config.SNACKBAR_EVER });
    const auth = firebase.auth();
    auth.sendPasswordResetEmail(this.user.email).then(function () {
      self.page = 'mailforgot';
      self.snackBar.dismiss();
    }).catch(function (error) {
      self.snackBar.open(error.message, self.config.OK, { duration: self.config.SNACKBAR_TIMEOUT });
    });
  }

  createUserCollection(email, userName) {
    firebase.database().ref('users/' + firebase.auth().currentUser.uid).set({
      username: userName,
      email: email
    });
  }

  onAuthStateChanged(self) {
    firebase.auth().onAuthStateChanged(function (authUser) {
      if (authUser) {
        if (authUser.emailVerified) {
          self.router.navigate([self.config.URL_HOME]);
        } else {
          self.user.email = authUser.email;
          authUser.sendEmailVerification().then(function () {
            self.page = 'verify';
          }).catch(function (error) {
            self.snackBar.open(error.message, self.config.OK, { duration: self.config.SNACKBAR_TIMEOUT });
          });
        }
      } else {
        self.localStorage.clear().subscribe(() => { });
      }
    });
  }
}
