# Implementation Plan: Compton Scattering Redesign

## Goal
Redesign the Compton Scattering interaction page to achieve a "premium", "dynamic", and "wow" effect, as requested by the user.

## Proposed Changes

### 1. HTML (`pages/early-era/light-track/compton-scattering.html`)
- **Structure**: Keep the 2-column layout but refine the containers for better visual hierarchy.
- **Controls**: Restyle sliders and buttons to look more modern (custom CSS).
- **Typography**: Ensure headers and labels use the upgraded font stack.

### 2. CSS (Embedded in HTML or new file)
*Since the user prefers Vanilla CSS, I will add a `<style>` block with enhanced styles or update `page.css` if global changes are needed. I will stick to page-specific styles to avoid breaking other pages.*
- **Glassmorphism**: Enhance the `.demo-panel`, `.control-panel`, and `.result-panel` with stronger blur, subtle borders, and gradients.
- **Inputs**: Custom styling for `input[type=range]` to look like glowing bars.
- **Buttons**: Neumorphic or high-contrast modern buttons with hover effects.
- **Animations**: Add subtle entry animations for elements.

### 3. JavaScript (`js/simulations/early-era/compton-scattering.js`)
- **Visuals Upgrade**:
    - **Photon**: Represent as a "wave packet" (sine wave oscillating inside a moving envelope) instead of a simple dot. This visually reinforces the wave-particle duality.
    - **Electron**: A pulsing core with a diffuse cloud.
    - **Collision**: A more dramatic energy transfer effect (shockwave/flash).
    - **Trails**: Add fading trails to particles.
- **Graph Upgrade**:
    - Make the wavelength shift graph look more professional.
    - Use gradient fills for the area under the curve.
    - Highlight the specific "current" state dynamically on the curve.
- **Interactivity**:
    - Smooth transitions between states.
    - Real-time updates when dragging sliders (already exists, but can be smoother).

## Visualization Details
- **Incoming Photon**: High frequency (blue/violet), tight wave packet.
- **Scattered Photon**: Lower frequency (red shift), longer wavelength, wider wave packet.
- **Recoil Electron**: Fast moving particle with a "kinetic" trail.

## Verification Plan
- **Visual Check**: Open the page and verify the look and feel.
- **Animation Check**: Ensure smooth 60fps animations.
- **Physics Check**: Verify the Compton shift formula $\Delta \lambda = \lambda_c (1 - \cos \theta)$ is accurately represented in the graph and values.
