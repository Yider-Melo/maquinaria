import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineryDetail } from './detail';

describe('MachineryDetail', () => {
  let component: MachineryDetail;
  let fixture: ComponentFixture<MachineryDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MachineryDetail],
    }).compileComponents();

    fixture = TestBed.createComponent(MachineryDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
