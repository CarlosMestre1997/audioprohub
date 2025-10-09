# SamplX - Audio Sample Slicer

A web-based audio sample slicer and player built with React and the Web Audio API.

## Features

- Load audio files and visualize waveforms
- Create up to 10 slices by clicking on the waveform
- Play slices with keyboard shortcuts (1-0 keys)
- Apply effects to each slice:
  - Transpose (pitch shifting)
  - Tempo adjustment
  - Low-pass filtering
  - Flanger effect
  - Reverb
- Zoom and pan the waveform
- Export all slices as a single WAV file

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to `http://localhost:3000`

## Usage

1. Click "Load Sample" to upload an audio file
2. Click on the waveform to create slice start points
3. Click again to set the slice end point
4. Use keyboard keys 1-0 to play slices
5. Adjust effects using the sliders in each slice panel
6. Use the zoom controls to navigate the waveform
7. Export your sliced audio when done

## Keyboard Shortcuts

- **1-0**: Play slice 1-10
- **Space**: Stop all audio

## Technologies Used

- React 18
- Web Audio API
- Tailwind CSS
- Lucide React (icons)
- Vite (build tool)
