import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineryMap } from './map';

describe('MachineryMap', () => {
  let component: MachineryMap;
  let fixture: ComponentFixture<MachineryMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MachineryMap],
    }).compileComponents();

    fixture = TestBed.createComponent(MachineryMap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
