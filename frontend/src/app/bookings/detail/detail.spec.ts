import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookingsDetail } from './detail';

describe('BookingsDetail', () => {
  let component: BookingsDetail;
  let fixture: ComponentFixture<BookingsDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [BookingsDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(BookingsDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
