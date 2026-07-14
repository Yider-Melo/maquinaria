import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Auth } from '../services/auth.service';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: Auth, useValue: { isLoggedIn: () => true } },
        { provide: Router, useValue: { navigate: () => {} } }
      ]
    });
    guard = TestBed.inject(AuthGuard);
  });

  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});
