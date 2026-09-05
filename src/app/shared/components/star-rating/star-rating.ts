import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.css',
})
export class StarRating {
  readonly value = input.required<number>();
  readonly editable = input(false);
  readonly disabled = input(false);
  readonly valueChange = output<number>();
  readonly stars = [1, 2, 3, 4, 5];
  readonly hovered = signal<number | null>(null);
}
