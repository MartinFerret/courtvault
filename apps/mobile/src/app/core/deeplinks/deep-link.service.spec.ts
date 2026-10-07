import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, beforeEach } from 'vitest';
import { DeepLinkService } from './deep-link.service';

describe('DeepLinkService', () => {
  let service: DeepLinkService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    service = TestBed.inject(DeepLinkService);
  });

  it('maps scheme and website urls to app routes', () => {
    expect(service.toRoute('hoopfolio://cards/2025-26-topps-chrome-3-cooper-flagg')).toBe('/cards/2025-26-topps-chrome-3-cooper-flagg');
    expect(service.toRoute('http://localhost:3000/players/cooper-flagg')).toBe('/players/cooper-flagg');
    expect(service.toRoute('http://localhost:3000/rankings/rookies')).toBe('/tabs/sets');
    expect(service.toRoute('hoopfolio://last-night')).toBe('/tabs/last-night');
  });

  it('ignores foreign and malformed urls', () => {
    expect(service.toRoute('https://evil.example/cards/x')).toBeNull();
    expect(service.toRoute('not a url')).toBeNull();
    expect(service.toRoute('http://localhost:3000/admin')).toBeNull();
  });
});
