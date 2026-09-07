import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SiteProfile } from '../../../shared/models/profile.model';
import { ProfileBadge } from '../../../shared/components/profile-badge/profile-badge';
import { ProfileService, profileError } from '../../../shared/services/profile.service';
import { FeedbackService } from '../../../shared/services/feedback.service';

@Component({
  selector: 'app-profile-badges',
  imports: [ProfileBadge],
  templateUrl: './profile-badges.html',
  styleUrl: './profile-badges.css',
})
export class ProfileBadges {
  readonly profile = input.required<SiteProfile>();
  readonly changed = output<SiteProfile>();
  readonly selected = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal('');
  private readonly api = inject(ProfileService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => this.selected.set(this.profile().selectedBadge?.id ?? null));
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    this.api.selectBadge(this.selected()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: profile => {
        this.saving.set(false);
        this.changed.emit(profile);
        this.feedback.success('Badge atualizado', 'Sua escolha foi salva no perfil.');
      },
      error: error => {
        this.saving.set(false);
        this.error.set(profileError(error));
      },
    });
  }
}
