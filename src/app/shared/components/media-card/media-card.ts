import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface MediaItem {
  id: string;
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
  imports: [RouterLink],
  templateUrl: './media-card.html',
  styleUrl: './media-card.css',
})
export class MediaCard {
  readonly item = input.required<MediaItem>();
}
