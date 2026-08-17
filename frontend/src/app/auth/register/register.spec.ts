import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { Register } from './register.component';
import { TEST_PROVIDERS, overrideTemplateWithEmpty } from '../../core/testing/mocks';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;

  beforeEach(async () => {
    overrideTemplateWithEmpty(Register);
    
    await TestBed.configureTestingModule({
      declarations: [Register],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        ...TEST_PROVIDERS,
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
