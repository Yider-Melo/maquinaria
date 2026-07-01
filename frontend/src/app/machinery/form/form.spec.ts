import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MachineryForm } from './form';

describe('MachineryForm', () => {
  let component: MachineryForm;
  let fixture: ComponentFixture<MachineryForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MachineryForm],
    }).compileComponents();

    fixture = TestBed.createComponent(MachineryForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
