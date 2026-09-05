import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { GiphyGif, GiphyService } from '../../services/giphy.service';

@Component({
  selector: 'app-profile-avatar',
  template: `
    @if (safeUrl(); as url) {
      @if (failedUrl() !== url) {
        <picture>
          <img
            [src]="url"
            [alt]="name()"
            [title]="giphyId() ? 'GIF via GIPHY' : name()"
            referrerpolicy="no-referrer"
            (error)="failedUrl.set(url)"
          />
        </picture>
      } @else {
        <span role="img" [attr.aria-label]="name()">{{ initial() }}</span>
      }
    } @else {
      <span role="img" [attr.aria-label]="name()">{{ initial() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      width: 100%;
      height: 100%;
      flex-shrink: 0;
      border-radius: inherit;
      overflow: hidden;
      background: #292039;
      color: #d6bbff;
      align-items: center;
      justify-content: center;
    }
    picture {
      display: block;
      width: 100%;
      height: 100%;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    span {
      font-weight: 700;
    }
  `,
})
export class ProfileAvatar {
  readonly url = input<string | null | undefined>(null);
  readonly name = input('Perfil');
  readonly giphyId = input<string | null | undefined>(null);
  readonly resolvedGif = signal<GiphyGif | null>(null);
  private readonly giphy = inject(GiphyService);
  readonly failedUrl = signal<string | null>(null);
  readonly initial = computed(() => this.name().trim().charAt(0).toUpperCase() || 'P');
  readonly safeUrl = computed(() => {
    try {
      const value = this.giphyId() ? this.resolvedGif()?.url : this.url();
      const url = new URL(value ?? '');
      return ['http:', 'https:'].includes(url.protocol) ? value : null;
    } catch {
      return null;
    }
  });

  constructor() {
    effect((onCleanup) => {
      const id = this.giphyId();
      this.resolvedGif.set(null);
      this.failedUrl.set(null);
      if (!id) return;
      const request = this.giphy.getGif(id).subscribe((gif) => this.resolvedGif.set(gif));
      onCleanup(() => request.unsubscribe());
    });
  }
}
