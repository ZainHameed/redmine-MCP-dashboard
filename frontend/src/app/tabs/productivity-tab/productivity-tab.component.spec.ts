import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProductivityTabComponent } from './productivity-tab.component';

describe('ProductivityTabComponent', () => {
  let component: ProductivityTabComponent;
  let fixture: ComponentFixture<ProductivityTabComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProductivityTabComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductivityTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
