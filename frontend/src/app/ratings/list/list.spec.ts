import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { RatingsList } from './list.component';
import { TEST_PROVIDERS } from '../../core/testing/mocks';

describe('RatingsList', () => {
  let component: RatingsList;
  let fixture: ComponentFixture<RatingsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RatingsList],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        ...TEST_PROVIDERS,
        { provide: ChangeDetectorRef, useValue: { markForCheck: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RatingsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
