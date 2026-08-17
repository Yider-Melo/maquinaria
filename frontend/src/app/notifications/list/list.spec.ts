import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { NotificationsList } from './list.component';
import { TEST_PROVIDERS } from '../../core/testing/mocks';

describe('NotificationsList', () => {
  let component: NotificationsList;
  let fixture: ComponentFixture<NotificationsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NotificationsList],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        ...TEST_PROVIDERS,
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
