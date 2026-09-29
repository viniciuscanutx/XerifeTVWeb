import { Component, input, model } from '@angular/core';
import { ProfileBadge as ProfileBadgeModel } from '../../../shared/models/profile.model';
import { ProfileBadge } from '../../../shared/components/profile-badge/profile-badge';

@Component({
  selector: 'app-profile-badges',
  imports: [ProfileBadge],
  templateUrl: './profile-badges.html',
  styleUrl: './profile-badges.css',
})
export class ProfileBadges {
  readonly badges = input<ProfileBadgeModel[]>([]);
  readonly selected = model<string | null>(null);
}
