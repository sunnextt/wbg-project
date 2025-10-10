import React from 'react'
import { Hand, HandMetal } from 'lucide-react'

const defaultSize = 30

export const OpenHand = ({ color = '#ffffff', size = defaultSize }) => (
  <Hand color={color} size={size} strokeWidth={1.5} />
)

export const PointerHand = ({ color = '#ffffff', size = defaultSize }) => (
  <HandMetal color={color} size={size} strokeWidth={1.5} />
)

export const GrabHand = ({ color = '#ffffff', size = defaultSize }) => (
  <HandMetal color={color} size={size} strokeWidth={1.5} />
)

export default {
  OpenHand,
  PointerHand,
  GrabHand
}
