import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingsList } from './list';

describe('BookingsList', () => {
  let component: BookingsList;
  let fixture: ComponentFixture<BookingsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingsList],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
