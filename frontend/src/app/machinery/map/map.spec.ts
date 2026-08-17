import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MachineryMap } from './map.component';

describe('MachineryMap', () => {
  let component: MachineryMap;
  let fixture: ComponentFixture<MachineryMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MachineryMap],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(MachineryMap);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
