import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SubtitleCue, decodeSubtitleText, parseSubtitleCues } from '../data/subtitle-parser';

@Injectable({ providedIn: 'root' })
export class SubtitleService {
  private readonly http = inject(HttpClient);

  // Baixa a legenda (VTT ou SRT, de qualquer host com CORS) e devolve as falas
  load(url: string): Observable<SubtitleCue[]> {
    return this.http
      .get(url, { responseType: 'arraybuffer' })
      .pipe(map((buffer) => parseSubtitleCues(decodeSubtitleText(buffer))));
  }
}
