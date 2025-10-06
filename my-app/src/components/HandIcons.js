import React from 'react'

const defaultSize = 64

// Small helper to build width/height attrs
const sizeAttr = (size) => ({ width: size || defaultSize, height: size || defaultSize })

/**
 * OpenHand - elegant open palm with natural fingers and realistic details
 */
export const OpenHand = ({ color = '#ffffff', size = defaultSize }) => (
  <svg {...sizeAttr(size)} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <defs>
      <linearGradient id="gOpen" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity="1" />
        <stop offset="100%" stopColor={color} stopOpacity="0.7" />
      </linearGradient>
      <linearGradient id="gOpenPalm" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity="0.95" />
        <stop offset="100%" stopColor={color} stopOpacity="0.6" />
      </linearGradient>
      <filter id="shadowOpen" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.3" />
        <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.2" />
      </filter>
      <radialGradient id="knuckleLightOpen" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="100%" stopColor={color} stopOpacity="0.1" />
      </radialGradient>
    </defs>

    <g filter="url(#shadowOpen)">
      {/* Palm */}
      <path
        d="M20 40C20 30 24 24 34 24c4 0 6 2 6 6v8c0 3 2 6 5 6h5c3 0 5-3 5-6v-8c0-4 2-6 6-6 8 0 8 8 8 16 0 10-8 16-16 16H36c-10 0-16-8-16-16z"
        fill="url(#gOpenPalm)"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Thumb */}
      <path
        d="M30 22c0-5 3-9 7-9s7 4 7 9c0 2-1 4-3 5"
        fill="url(#gOpen)"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Finger details */}
      <path
        d="M42 28v10M47 28v10M52 28v10M57 28v10"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      
      {/* Knuckle highlights */}
      <circle cx="42" cy="26" r="1.5" fill="url(#knuckleLightOpen)" />
      <circle cx="47" cy="26" r="1.5" fill="url(#knuckleLightOpen)" />
      <circle cx="52" cy="26" r="1.5" fill="url(#knuckleLightOpen)" />
      <circle cx="57" cy="26" r="1.5" fill="url(#knuckleLightOpen)" />
      
      {/* Palm lines */}
      <path
        d="M34 36c2 0 4 2 4 4M30 38c2 0 4 2 4 4"
        stroke="rgba(0,0,0,0.1)"
        strokeWidth="0.6"
        strokeLinecap="round"
      />
    </g>
    
    {/* Subtle highlight */}
    <path
      d="M24 34c0-2 2-4 4-4"
      stroke="rgba(255,255,255,0.8)"
      strokeWidth="1"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

/**
 * PointerHand - elegant pointing hand with extended index finger and realistic details
 */
export const PointerHand = ({ color = '#ffffff', size = defaultSize }) => (
  <svg {...sizeAttr(size)} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <defs>
      <linearGradient id="gPoint" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity="1" />
        <stop offset="100%" stopColor={color} stopOpacity="0.7" />
      </linearGradient>
      <linearGradient id="gPointPalm" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity="0.9" />
        <stop offset="100%" stopColor={color} stopOpacity="0.6" />
      </linearGradient>
      <filter id="shadowPoint" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.35" />
        <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000000" floodOpacity="0.25" />
      </filter>
      <radialGradient id="fingerTipPoint" cx="30%" cy="30%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
        <stop offset="100%" stopColor={color} stopOpacity="0.3" />
      </radialGradient>
    </defs>

    <g filter="url(#shadowPoint)">
      {/* Main hand with pointing finger */}
      <path
        d="M26 40C26 30 30 24 40 24c3 0 4 1 4 4v6c0 3 2 5 4 5h6c2 0 4-2 4-4v-8c0-3 2-4 4-4 8 0 8 6 8 14 0 8-6 14-14 14H38c-8 0-12-6-12-14z"
        fill="url(#gPointPalm)"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Extended index finger */}
      <path
        d="M40 16c0-5 3-9 7-9s7 4 7 9c0 3-1 5-3 6v5"
        fill="url(#gPoint)"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Finger tip highlight */}
      <circle cx="44" cy="12" r="2" fill="url(#fingerTipPoint)" />
      
      {/* Curled fingers */}
      <path
        d="M48 28v10M52 28v10M56 28v10"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      
      {/* Thumb */}
      <path
        d="M32 26c-2 0-4-2-4-4s2-4 4-4 4 2 4 4-2 4-4 4z"
        fill="url(#gPoint)"
        stroke="rgba(0,0,0,0.1)"
        strokeWidth="0.6"
      />
      
      {/* Knuckle highlights */}
      <circle cx="48" cy="26" r="1.5" fill="url(#fingerTipPoint)" />
      <circle cx="52" cy="26" r="1.5" fill="url(#fingerTipPoint)" />
      <circle cx="56" cy="26" r="1.5" fill="url(#fingerTipPoint)" />
    </g>
    
    {/* Direction line */}
    <path
      d="M44 10L44 6M40 8L48 8"
      stroke="rgba(255,255,255,0.9)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

/**
 * GrabHand - elegant closed fist with natural grip and realistic details
 */
export const GrabHand = ({ color = '#ffffff', size = defaultSize }) => (
  <svg {...sizeAttr(size)} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <defs>
      <linearGradient id="gGrab" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity="1" />
        <stop offset="100%" stopColor={color} stopOpacity="0.8" />
      </linearGradient>
      <linearGradient id="gGrabDark" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={color} stopOpacity="0.9" />
        <stop offset="100%" stopColor={color} stopOpacity="0.5" />
      </linearGradient>
      <filter id="shadowGrab" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="2" dy="4" stdDeviation="5" floodColor="#000000" floodOpacity="0.4" />
        <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.3" />
      </filter>
      <radialGradient id="knuckleLightGrab" cx="50%" cy="50%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
        <stop offset="100%" stopColor={color} stopOpacity="0.1" />
      </radialGradient>
    </defs>

    <g filter="url(#shadowGrab)">
      {/* Main fist shape */}
      <path
        d="M28 38C28 28 32 24 42 24c4 0 6 2 6 6v4c0 2 2 4 4 4h4c2 0 4-2 4-4v-6c0-4 2-6 6-6 8 0 8 6 8 12 0 6-4 12-10 12H42c-8 0-14-6-14-12z"
        fill="url(#gGrabDark)"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Thumb wrapping over fingers */}
      <path
        d="M32 28c0-5 3-9 7-9s7 4 7 9c0 2-1 4-3 5"
        fill="url(#gGrab)"
        stroke="rgba(0,0,0,0.15)"
        strokeWidth="0.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      
      {/* Knuckle highlights */}
      <circle cx="46" cy="30" r="1.5" fill="url(#knuckleLightGrab)" />
      <circle cx="50" cy="28" r="1.5" fill="url(#knuckleLightGrab)" />
      <circle cx="54" cy="26" r="1.5" fill="url(#knuckleLightGrab)" />
      
      {/* Grip pressure points */}
      <circle cx="38" cy= "36" r="1" fill="rgba(255,255,255,0.6)" />
      <circle cx="42" cy="38" r="1" fill="rgba(255,255,255,0.6)" />
      <circle cx="48" cy="36" r="1" fill="rgba(255,255,255,0.6)" />
    </g>
    
    {/* Strength indication lines */}
    <path
      d="M36 34L40 32M44 32L48 30M50 30L54 28"
      stroke="rgba(0,0,0,0.15)"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    
    {/* Highlight on top */}
    <path
      d="M34 26c2-1 4-1 6 0"
      stroke="rgba(255,255,255,0.7)"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
)

export default {
  OpenHand,
  PointerHand,
  GrabHand
}