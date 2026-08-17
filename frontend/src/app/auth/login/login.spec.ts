import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { Login } from './login.component';
import { TEST_PROVIDERS, overrideTemplateWithEmpty } from '../../core/testing/mocks';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    overrideTemplateWithEmpty(Login);
    
    await TestBed.configureTestingModule({
      declarations: [Login],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        ...TEST_PROVIDERS,
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
