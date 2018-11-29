import { Injectable } from '@angular/core';

@Injectable()
export class Config {

  /**
   * App Config
   */
  public APP_TITLE = 'TrackerWeb';

  /**
   * ToolTip Position
   */
  public TOOLTIP_POS = 'above';

  /**
   * URL Configuration
   */
  public URL_MAIN = '/';
  public URL_HOME = '/home';
  public URL_TOKEN = '/token';
  public URL_SIGNUP = '/signup';
  public URL_FORGOT = '/forgot';
  public URL_RESET = '/reset';
  public URL_ACTIVATE = '/activate';
  public URL_LOGOUT = '/logout';

  /**
   * Misc Config
   */
  public SNACKBAR_TIMEOUT = 3000;
  public SNACKBAR_EVER = 9999999999;
  public OK = 'Ok';
  public EMPTY = '';
  public UNDEFINED = undefined;
  public ACCESS_TOKEN = 'access_token';
  public ACCESS_TOKEN_EXPIRES_IN = 'access_token_expires_in';
  public REFRESH_TOKEN = 'refresh_token';
  public REFRESH_TOKEN_EXPIRES_IN = 'refresh_token_expires_in';
  public AUTHORIZATION_CODE = 'authorization_code';

  public MASTER_SALT = 'cycle_la_illayam_kaathu_ernakulathula_illayam_vaathu';

  /**
   * Error messages
   */
  ERR_AUTH_INVALID_EMAIL = 'Please enter your email';
  ERR_AUTH_INVALID_NAME = 'Please enter your name';
  ERR_AUTH_INVALID_PASSWORD = 'Please enter your Password';
  ERR_AUTH_MIN_PASS_5CHAR = 'Password should be minimum of 5 char';
  ERR_AUTH_NOT_LOGGED_IN = 'You must be logged in to view that page!';
  ERR_AUTH_ACTIVATION_PENDING = 'You still haven\'t activated this account. Please check your mail!';
  ERR_SIGNUP_ALREADY_EXISTS = 'Username already exists!';
  ERR_SIGNUP_DATA_MISSING = 'One or more of the fields are empty.';
  ERR_SIGNUP_PASSWORD_MISMATCH = 'Your passwords do not match.';
  ERR_ACTIVATION_INVALID_KEY = 'Username mapped to activation key is invalid!';
  ERR_RESET_INVALID_DETAILS = 'One of the values entered is incorrect!';
  ERR_RESET_INVALID_USERNAME = 'Username not valid. Looks like you forgot your username as well!';
  ERR_TRANSPORT_ID_REQUIRED = 'Transport ID required';
  ERR_DATE_RANGE_REQUIRED = 'From and To date required';
}
