import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { Toast } from './Toast'

afterEach(cleanup)

describe('Toast', () => {
  it('renders nothing when message is null', () => {
    const { container } = render(<Toast message={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the message text when provided', () => {
    const { getByText } = render(<Toast message="Picks aren't open for this game yet" />)
    expect(getByText("Picks aren't open for this game yet")).toBeTruthy()
  })
})
