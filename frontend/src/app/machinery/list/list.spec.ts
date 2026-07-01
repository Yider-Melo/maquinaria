import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineryList } from './list';

describe('MachineryList', () => {
  let component: MachineryList;
  let fixture: ComponentFixture<MachineryList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MachineryList],
    }).compileComponents();

    fixture = TestBed.createComponent(MachineryList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
