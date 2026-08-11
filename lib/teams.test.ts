import { describe, it, expect } from 'vitest'
import { teamLogoUrl } from './teams'

describe('teamLogoUrl', () => {
  it('builds a lowercase ESPN CDN url from an uppercase team code', () => {
    expect(teamLogoUrl('NE')).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/ne.png')
  })

  it('handles a code that is already lowercase', () => {
    expect(teamLogoUrl('sea')).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/sea.png')
  })

  it('handles a multi-letter code', () => {
    expect(teamLogoUrl('WAS')).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/was.png')
  })
})
