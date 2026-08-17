import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { BookingsDetail } from './detail.component';
import { TEST_PROVIDERS } from '../../core/testing/mocks';

describe('BookingsDetail', () => {
  let component: BookingsDetail;
  let fixture: ComponentFixture<BookingsDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingsDetail],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        ...TEST_PROVIDERS,
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'x' } } } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
