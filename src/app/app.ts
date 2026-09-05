import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './shared/components/navbar/navbar';
import { FeedbackDialog } from './shared/components/feedback-dialog/feedback-dialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, FeedbackDialog],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('Xel If Tv');
}

