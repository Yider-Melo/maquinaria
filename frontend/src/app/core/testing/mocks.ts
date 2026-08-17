import { of, EMPTY, Subject } from 'rxjs';
import { Auth } from '../services/auth.service';
import { Api } from '../services/api.service';
import { SocketService } from '../services/socket.service';
import { NotificationState } from '../services/notification-state.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';

// Sustituye el template de un componente por uno vacío para que los smoke
// tests "should create" no dependan de módulos de Material ni directivas.
export function overrideTemplateWithEmpty(component: Type<unknown>): void {
  TestBed.overrideComponent(component, { set: { template: '' } });
}

// Los métodos de API usan EMPTY (no emiten nada) para que los smoke tests
// "should create" no procesen respuestas vacías dentro de ngOnInit.
export function createAuthMock(partial: Partial<Auth> = {}): Auth {
  return {
    isLoggedIn: () => false,
    getToken: () => null,
    getUser: () => null,
    logout: () => {},
    refreshAccessToken: () => of(false),
    esTipo: () => false,
    authState$: new Subject<boolean>(),
    ...partial,
  } as unknown as Auth;
}

export function createApiMock(partial: Partial<Api> = {}): Api {
  return {
    get: () => EMPTY,
    post: () => EMPTY,
    put: () => EMPTY,
    patch: () => EMPTY,
    delete: () => EMPTY,
    ...partial,
  } as unknown as Api;
}

export function createSocketMock(partial: Partial<SocketService> = {}): SocketService {
  return {
    connect: () => {},
    disconnect: () => {},
    onNotification: () => EMPTY,
    onRefresh: () => EMPTY,
    ...partial,
  } as unknown as SocketService;
}

export function createSnackBarMock(partial: Partial<MatSnackBar> = {}): MatSnackBar {
  return {
    open: () => null as never,
    ...partial,
  } as unknown as MatSnackBar;
}

export function createDialogMock(partial: Partial<MatDialog> = {}): MatDialog {
  return {
    open: () => null as never,
    ...partial,
  } as unknown as MatDialog;
}

export const dialogRefMock = { close: () => {} } as MatDialogRef<unknown>;
export const dialogDataMock = {};

export const notificationStateMock = { refresh: new Subject<void>(), notifyChanged: () => {}, refresh$: EMPTY } as unknown as NotificationState;

export const TEST_PROVIDERS = [
  { provide: Auth, useValue: createAuthMock() },
  { provide: Api, useValue: createApiMock() },
  { provide: SocketService, useValue: createSocketMock() },
  { provide: MatSnackBar, useValue: createSnackBarMock() },
  { provide: MatDialog, useValue: createDialogMock() },
  { provide: NotificationState, useValue: notificationStateMock },
];
