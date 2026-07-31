import { Component, input } from '@angular/core';

export interface MediaItem {
  id: number;
  title: string;
  type: 'movie' | 'series';
  year: number;
  rating: number;
  poster: string;
  backdrop?: string;
  overview: string;
  genres: string[];
}

@Component({
  selector: 'app-media-card',
  imports: [],
  templateUrl: './media-card.html',
  styleUrl: './media-card.css',
})
export class MediaCard {
  readonly item = input.required<MediaItem>();
}
