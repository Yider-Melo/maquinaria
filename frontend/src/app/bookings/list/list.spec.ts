import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { BookingsList } from './list.component';
import { TEST_PROVIDERS, overrideTemplateWithEmpty } from '../../core/testing/mocks';

describe('BookingsList', () => {
  let component: BookingsList;
  let fixture: ComponentFixture<BookingsList>;

  beforeEach(async () => {
    overrideTemplateWithEmpty(BookingsList);
    
    await TestBed.configureTestingModule({
      declarations: [BookingsList],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        ...TEST_PROVIDERS,
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
