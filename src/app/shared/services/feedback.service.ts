import { Injectable, signal } from '@angular/core';

interface SuccessMessage {
  title: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly currentMessage = signal<SuccessMessage | null>(null);
  readonly message = this.currentMessage.asReadonly();

  success(title: string, description: string): void {
    this.currentMessage.set({ title, description });
  }

  dismiss(): void {
    this.currentMessage.set(null);
  }
}
