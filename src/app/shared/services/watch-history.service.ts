import { Injectable, signal } from '@angular/core';

export interface WatchHistoryItem {
  contentId: string;
  type: 'movie' | 'series';
  title: string;
  poster: string;
  backdrop?: string;
  season?: number;
  episodeId?: string;
  episodeNumber?: number;
  episodeTitle?: string;
  currentTime: number;
  duration: number;
  progressPercentage: number;
  updatedAt: number;
}

const STORAGE_KEY = 'xerife_watch_history_v1';

@Injectable({ providedIn: 'root' })
export class WatchHistoryService {
  readonly history = signal<WatchHistoryItem[]>(this.loadFromStorage());

  private loadFromStorage(): WatchHistoryItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      }
    } catch (e) {
      console.error('Erro ao ler histórico de reprodução do localStorage', e);
    }
    return [];
  }

  private saveToStorage(items: WatchHistoryItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      this.history.set(items);
    } catch (e) {
      console.error('Erro ao salvar histórico de reprodução no localStorage', e);
    }
  }

  getHistory(): WatchHistoryItem[] {
    return this.history();
  }

  getItemHistory(contentId: string): WatchHistoryItem | null {
    const list = this.history();
    return list.find((i) => i.contentId === contentId) || null;
  }

  saveProgress(item: Omit<WatchHistoryItem, 'updatedAt' | 'progressPercentage'>): void {
    if (!item.contentId || !item.duration || item.duration <= 0) return;

    const progressPercentage = Math.min(100, Math.round((item.currentTime / item.duration) * 100));
    const now = Date.now();

    const newItem: WatchHistoryItem = {
      ...item,
      progressPercentage,
      updatedAt: now,
    };

    const currentList = [...this.loadFromStorage()];
    const index = currentList.findIndex((i) => i.contentId === item.contentId);

    if (index >= 0) {
      currentList[index] = newItem;
    } else {
      currentList.unshift(newItem);
    }

    currentList.sort((a, b) => b.updatedAt - a.updatedAt);

    const trimmed = currentList.slice(0, 50);
    this.saveToStorage(trimmed);
  }

  removeProgress(contentId: string): void {
    const filtered = this.loadFromStorage().filter((i) => i.contentId !== contentId);
    this.saveToStorage(filtered);
  }

  clearHistory(): void {
    this.saveToStorage([]);
  }
}
