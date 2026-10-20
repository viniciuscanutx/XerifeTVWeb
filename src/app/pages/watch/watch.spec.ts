import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { EMPTY, Subject, of } from 'rxjs';
import { ContentApiService } from '../../shared/data/content-api.service';
import { WatchProgressService } from '../../shared/services/watch-progress.service';
import { Watch, WatchItem } from './watch';

describe('Watch episode loading', () => {
  let fixture: ComponentFixture<Watch>;
  let component: Watch;
  let getEpisodes: ReturnType<typeof vi.fn>;

  const series: WatchItem = {
    id: 'series-1',
    title: 'Série',
    type: 'series',
    year: 2026,
    rating: 8,
    poster: '',
    overview: '',
    genres: [],
    totalSeasons: 3,
  };

  beforeEach(async () => {
    getEpisodes = vi.fn();

    await TestBed.configureTestingModule({
      imports: [Watch],
      providers: [
        { provide: ContentApiService, useValue: { getEpisodes } },
        {
          provide: WatchProgressService,
          useValue: { getItemProgress: vi.fn(() => null) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: EMPTY,
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    })
      .overrideComponent(Watch, {
        set: { template: '', imports: [], styles: [], styleUrls: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Watch);
    component = fixture.componentInstance;
    component.item.set(series);
  });

  it('cancels the previous season request and keeps the latest selection', () => {
    const firstSeason = new Subject<unknown[]>();
    const secondSeason = new Subject<unknown[]>();
    getEpisodes.mockReturnValueOnce(firstSeason).mockReturnValueOnce(secondSeason);

    component.selectSeason(1);
    component.selectSeason(2);

    expect(firstSeason.observed).toBe(false);
    expect(component.selectedSeason()).toBe(2);
    expect(component.loadingEpisodes()).toBe(true);

    secondSeason.next([{ id: 'season-2-episode-1', title: 'Segundo começo' }]);
    firstSeason.next([{ id: 'season-1-episode-1', title: 'Primeiro começo' }]);

    expect(component.episodes()).toEqual([
      expect.objectContaining({ id: 'season-2-episode-1', season: 2 }),
    ]);
    expect(component.loadingEpisodes()).toBe(false);
    expect(component.episodesError()).toBeNull();
  });

  it('distinguishes a failed request from an empty season and clears the error on retry', () => {
    const failedRequest = new Subject<unknown[]>();
    const retryRequest = new Subject<unknown[]>();
    getEpisodes.mockReturnValueOnce(failedRequest).mockReturnValueOnce(retryRequest);

    component.selectSeason(2);
    failedRequest.error(new Error('Unavailable'));

    expect(component.episodesError()).toBeTruthy();
    expect(component.loadingEpisodes()).toBe(false);
    expect(component.episodes()).toEqual([]);

    component.selectSeason(component.selectedSeason());

    expect(component.episodesError()).toBeNull();
    expect(component.loadingEpisodes()).toBe(true);
    expect(getEpisodes).toHaveBeenLastCalledWith(series.id, 2);

    retryRequest.next([]);

    expect(component.episodesError()).toBeNull();
    expect(component.loadingEpisodes()).toBe(false);
    expect(component.episodes()).toEqual([]);
  });

  it('cancels an in-flight episode request when the page is destroyed', () => {
    const request = new Subject<unknown[]>();
    getEpisodes.mockReturnValue(request);

    component.selectSeason(1);
    fixture.destroy();
    request.next([{ id: 'late-episode' }]);

    expect(request.observed).toBe(false);
    expect(component.episodes()).toEqual([]);
  });

  it('loads the next season and starts its first episode', () => {
    const nextSeason = new Subject<unknown[]>();
    getEpisodes.mockReturnValue(nextSeason);
    const playEpisode = vi.spyOn(component, 'playEpisode').mockImplementation(() => {});
    const lastEpisode = { id: 'season-1-last', title: 'Final', season: 1, number: 10 };
    component.activeEpisode.set(lastEpisode);
    component.episodes.set([lastEpisode]);

    component.playNextEpisode();

    expect(component.selectedSeason()).toBe(2);
    expect(component.loadingEpisodes()).toBe(true);
    expect(getEpisodes).toHaveBeenCalledWith(series.id, 2);
    expect(playEpisode).not.toHaveBeenCalled();

    nextSeason.next([{ id: 'season-2-first', title: 'Começo', number: 1 }]);

    expect(playEpisode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'season-2-first', season: 2, number: 1 }),
    );
  });

  it('preserves the requested autoplay episode when its season loads', () => {
    const request = new Subject<unknown[]>();
    getEpisodes.mockReturnValue(request);
    const playEpisode = vi.spyOn(component, 'playEpisode').mockImplementation(() => {});
    component.autoPlayRequested.set(true);
    component.targetEpisodeId.set('requested-episode');

    component.selectSeason(3);
    request.next([
      { id: 'first-episode', number: 1 },
      { id: 'requested-episode', number: 2 },
    ]);

    expect(playEpisode).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'requested-episode', season: 3, number: 2 }),
    );
    expect(component.autoPlayRequested()).toBe(false);
  });
});

describe('Watch episode interactions', () => {
  let fixture: ComponentFixture<Watch>;
  let component: Watch;
  let getEpisodes: ReturnType<typeof vi.fn>;
  let page: HTMLElement;

  beforeEach(async () => {
    vi.stubGlobal('IntersectionObserver', class {
      observe(): void {}
      disconnect(): void {}
    });
    vi.stubGlobal('ResizeObserver', class {
      observe(): void {}
      disconnect(): void {}
    });
    getEpisodes = vi.fn();

    await TestBed.configureTestingModule({
      imports: [Watch],
      providers: [
        { provide: ContentApiService, useValue: { getEpisodes } },
        {
          provide: WatchProgressService,
          useValue: { getItemProgress: vi.fn(() => null) },
        },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: EMPTY,
            queryParamMap: of(convertToParamMap({})),
          },
        },
      ],
    })
      .overrideComponent(Watch, {
        set: { imports: [], schemas: [NO_ERRORS_SCHEMA], styles: [], styleUrls: [] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Watch);
    component = fixture.componentInstance;
    page = fixture.nativeElement;
    component.item.set({
      id: 'series-1',
      title: 'Série',
      type: 'series',
      year: 2026,
      rating: 8,
      poster: '',
      overview: '',
      genres: [],
      totalSeasons: 3,
    });
    component.loading.set(false);
  });

  afterEach(() => {
    fixture.destroy();
    vi.unstubAllGlobals();
  });

  it('shows a failed season separately from empty results and retries from the rendered button', async () => {
    const failedRequest = new Subject<unknown[]>();
    const retryRequest = new Subject<unknown[]>();
    getEpisodes.mockReturnValueOnce(failedRequest).mockReturnValueOnce(retryRequest);

    component.selectSeason(2);
    failedRequest.error(new Error('Unavailable'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(page.textContent).toContain('Não foi possível carregar os episódios.');
    expect(page.textContent).not.toContain('Nenhum episódio disponível nesta temporada.');
    const retryButton = page.querySelector<HTMLButtonElement>('button.episodes-retry');
    expect(retryButton).not.toBeNull();

    retryButton?.click();
    fixture.detectChanges();

    expect(getEpisodes).toHaveBeenLastCalledWith('series-1', 2);
    expect(page.textContent).toContain('Carregando episódios da temporada 2...');
    expect(page.querySelector('#episodes-list')?.getAttribute('aria-busy')).toBe('true');
    expect(page.querySelector('button.episodes-retry')).toBeNull();

    retryRequest.next([{ id: 'season-2-episode-1', title: 'De volta' }]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(page.querySelector('button.episode-card__action')?.getAttribute('aria-label'))
      .toBe('Reproduzir T2E1: De volta');
    expect(page.querySelector('#episodes-list')?.getAttribute('aria-busy')).toBe('false');
    expect(page.textContent).not.toContain('Não foi possível carregar os episódios.');
  });

  it('plays the episode represented by the activated native button', async () => {
    const episodes = [
      { id: 'episode-1', title: 'O começo', season: 1, number: 1 },
      { id: 'episode-2', title: 'A escolha', season: 1, number: 2 },
    ];
    component.episodes.set(episodes);
    const playEpisode = vi.spyOn(component, 'playEpisode').mockImplementation(() => {});
    fixture.detectChanges();
    await fixture.whenStable();

    const episodeButton = page.querySelector<HTMLButtonElement>(
      'button.episode-card__action[aria-label="Reproduzir T1E2: A escolha"]',
    );
    expect(episodeButton).not.toBeNull();

    episodeButton?.click();

    expect(playEpisode).toHaveBeenCalledExactlyOnceWith(episodes[1]);
  });
});
