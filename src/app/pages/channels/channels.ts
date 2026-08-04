import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { ContentApiService } from '../../shared/data/content-api.service';
import type { ChannelCategoryGroup, ChannelResponse } from '../../shared/data/content-api.types';
import { VideoPlayerModal } from '../../shared/components/video-player-modal/video-player-modal';
import { capitalizeFirstLetter } from '../../utils/utils';

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [FormsModule, VideoPlayerModal],
  templateUrl: './channels.html',
  styleUrl: './channels.css',
})
export class ChannelsPage implements OnInit {
  readonly capitalizeFirstLetter = capitalizeFirstLetter;

  private readonly api = inject(ContentApiService);

  readonly groups = signal<ChannelCategoryGroup[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly searchTerm = signal<string>('');
  readonly selectedCategory = signal<string>('todos');

  readonly activeChannel = signal<ChannelResponse | null>(null);
  readonly playerOpen = signal<boolean>(false);
  readonly streamUrl = signal<string | null>(null);
  readonly streamFormat = signal<string>('hls');
  readonly resolvingStream = signal<boolean>(false);

  readonly categoriesList = computed<string[]>(() => {
    const set = new Set<string>();
    for (const group of this.groups()) {
      if (group.category) {
        set.add(group.category);
      }
      if (group.items) {
        for (const ch of group.items) {
          if (Array.isArray(ch.categories)) {
            ch.categories.forEach((c) => set.add(c));
          }
        }
      }
    }
    return ['todos', ...Array.from(set)];
  });

  readonly filteredGroups = computed<ChannelCategoryGroup[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const cat = this.selectedCategory().toLowerCase();

    return this.groups()
      .map((group) => {
        const matchesCategoryGroup = cat === 'todos' || group.category?.toLowerCase() === cat;

        const items = (group.items || []).filter((ch) => {
          const matchesTerm = !term || ch.title?.toLowerCase().includes(term);
          const matchesItemCat =
            cat === 'todos' ||
            matchesCategoryGroup ||
            (Array.isArray(ch.categories) && ch.categories.some((c) => c.toLowerCase() === cat));
          return matchesTerm && matchesItemCat;
        });

        return {
          category: group.category,
          items,
        };
      })
      .filter((group) => group.items.length > 0);
  });

  readonly totalChannelsCount = computed<number>(() => {
    return this.filteredGroups().reduce((acc, g) => acc + g.items.length, 0);
  });

  ngOnInit(): void {
    this.loadChannels();
  }

  loadChannels(): void {
    this.loading.set(true);
    this.error.set(null);

    this.api
      .getChannels(200)
      .pipe(
        catchError((err) => {
          console.error('Erro ao carregar canais:', err);
          this.error.set('Não foi possível carregar a lista de canais.');
          return of(null);
        }),
      )
      .subscribe((data) => {
        this.loading.set(false);
        const normalized = this.normalizeChannelsResponse(data);
        this.groups.set(normalized);
      });
  }

  private normalizeChannelsResponse(res: any): ChannelCategoryGroup[] {
    if (!res) return [];

    let rawList: any[] = [];
    if (Array.isArray(res)) {
      rawList = res;
    } else if (Array.isArray(res?.items)) {
      rawList = res.items;
    } else if (Array.isArray(res?.channels)) {
      rawList = res.channels;
    } else if (Array.isArray(res?.data)) {
      rawList = res.data;
    }

    if (rawList.length === 0) return [];

    const isGrouped = rawList.some((item) => Array.isArray(item.items) || Array.isArray(item.channels));

    if (isGrouped) {
      return rawList.map((g) => ({
        category: g.category || g.categoryName || g.name || 'Geral',
        items: (g.items || g.channels || []).map((ch: any) => this.mapChannelItem(ch)),
      }));
    }

    const groupsMap = new Map<string, ChannelResponse[]>();
    for (const item of rawList) {
      const channel = this.mapChannelItem(item);
      const cat = Array.isArray(channel.categories) && channel.categories.length > 0 ? channel.categories[0] : 'Geral';
      if (!groupsMap.has(cat)) {
        groupsMap.set(cat, []);
      }
      groupsMap.get(cat)!.push(channel);
    }

    return Array.from(groupsMap.entries()).map(([category, items]) => ({
      category,
      items,
    }));
  }

  private mapChannelItem(ch: any): ChannelResponse {
    return {
      id: ch.id || ch.channelId || String(Math.random()),
      title: ch.title || ch.name || ch.channelTitle || 'Canal',
      categories: Array.isArray(ch.categories) ? ch.categories : (ch.category ? [ch.category] : ['Geral']),
      logoUrl: ch.logoUrl || ch.logoURL || ch.posterURL || ch.bannerURL || ch.iconUrl,
      video: ch.video || { url: ch.videoUrl || ch.url },
      urlResolverPath: ch.urlResolverPath || ch.videoResolverURL || ch.resolverPath,
      videoResolverURL: ch.videoResolverURL || ch.urlResolverPath,
    };
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  playChannel(channel: ChannelResponse): void {
    this.activeChannel.set(channel);
    this.resolvingStream.set(true);

    const directUrl = channel.video?.url;
    const resolverPath = channel.urlResolverPath || channel.videoResolverURL;

    if (resolverPath) {
      this.api
        .resolveVideoUrl(resolverPath)
        .pipe(catchError(() => of(null)))
        .subscribe((res) => {
          this.resolvingStream.set(false);
          const finalUrl = res?.url || directUrl || resolverPath;
          const fmt = res?.streamFormat || (finalUrl.includes('.m3u8') ? 'hls' : 'mp4');
          this.streamUrl.set(finalUrl);
          this.streamFormat.set(fmt);
          this.playerOpen.set(true);
        });
    } else if (directUrl) {
      this.resolvingStream.set(false);
      this.streamUrl.set(directUrl);
      this.streamFormat.set(directUrl.includes('.m3u8') ? 'hls' : 'mp4');
      this.playerOpen.set(true);
    } else {
      this.resolvingStream.set(false);
      alert('Transmissão não disponível no momento para este canal.');
    }
  }

  closePlayer(): void {
    this.playerOpen.set(false);
    this.streamUrl.set(null);
    this.activeChannel.set(null);
  }
}
