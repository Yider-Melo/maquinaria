import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { MachineryDetail } from './detail.component';
import { TEST_PROVIDERS, overrideTemplateWithEmpty } from '../../core/testing/mocks';

describe('MachineryDetail', () => {
  let component: MachineryDetail;
  let fixture: ComponentFixture<MachineryDetail>;

  beforeEach(async () => {
    overrideTemplateWithEmpty(MachineryDetail);
    
    await TestBed.configureTestingModule({
      declarations: [MachineryDetail],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        ...TEST_PROVIDERS,
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'x' } } } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: ChangeDetectorRef, useValue: { markForCheck: () => {} } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MachineryDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
