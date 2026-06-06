import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WeatherConditionIcon, weatherIconKind } from './weatherIcon';

describe('weatherIconKind', () => {
  it.each([
    ['Fair', 'clear'],
    ['Sunny', 'clear'],
    ['Partly Cloudy', 'cloud'],
    ['Passing Clouds', 'cloud'],
    ['Showers', 'rain'],
    ['Moderate Rain', 'rain'],
    ['Thundery Showers', 'thunder'],
    ['Heavy Thundery Showers with Gusty Wind', 'thunder'],
    ['Windy', 'wind'],
    ['Hazy', 'haze'],
    ['Mist', 'haze'],
    ['Fair (Night)', 'night'],
    ['Not refreshed', 'unknown'],
    [null, 'unknown'],
    [undefined, 'unknown'],
  ] as const)('maps %s to %s', (condition, expected) => {
    expect(weatherIconKind(condition)).toBe(expected);
  });

  it('renders decorative weather icons without exposing duplicate text', () => {
    const markup = renderToStaticMarkup(
      createElement(WeatherConditionIcon, {
        condition: 'Thundery Showers',
        className: 'test-icon',
      }),
    );

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('test-icon');
  });
});
