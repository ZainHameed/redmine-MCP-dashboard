import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeLogTabComponent } from './time-log-tab.component';

describe('TimeLogTabComponent', () => {
  let component: TimeLogTabComponent;
  let fixture: ComponentFixture<TimeLogTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TimeLogTabComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeLogTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
