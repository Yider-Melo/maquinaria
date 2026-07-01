import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationsList } from './list';

describe('NotificationsList', () => {
  let component: NotificationsList;
  let fixture: ComponentFixture<NotificationsList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [NotificationsList],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
