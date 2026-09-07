import { Component, computed, input } from '@angular/core';
import { ProfileBadge as Badge } from '../../models/profile.model';

@Component({
  selector: 'app-profile-badge',
  template: `<span [style.background-color]="color() + '26'" [style.color]="color()">{{ badge().name }}</span>`,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      line-height: 1;
    }
    span {
      display: inline-flex;
      align-items: center;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      line-height: 16px;
      overflow-wrap: anywhere;
    }
  `,
})
export class ProfileBadge {
  readonly badge = input.required<Badge>();
  readonly color = computed(() => /^#[0-9a-f]{6}$/i.test(this.badge().color) ? this.badge().color : '#9b68ff');
}
