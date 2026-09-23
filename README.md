# eDNA WorkBench

eDNA WorkBench is a local-first desktop application for environmental DNA
(eDNA) analysis and visualization. It combines an Electron desktop shell, a
React/Vite interface, two local Express APIs, and a Docker-based bioinformatics
pipeline.

The application is designed to keep user-selected input data and generated
results on the local computer. Both backend services bind to `127.0.0.1` only.

## Features

- Paired-end FASTQ upload and analysis workflow
- Quality, read-length, identity, and copy-number configuration
- Docker-based BLAST, MAFFT, FLASH, and Python processing pipeline
- Live pipeline progress and result management
- Sequence alignment and phylogenetic tree tools
- Haplotype network preparation and visualization
- Cross-platform Electron packaging for macOS, Windows, and Linux

## Architecture

```text
Electron desktop shell
├── React + Vite frontend
├── backend-toolkit (analysis, files, Docker, and pipeline API)
├── backend-viz (sequence and visualization API)
└── Docker analysis image (Python and bioinformatics tools)
```

During development the services use these fixed loopback ports:

- Frontend: `http://127.0.0.1:5173`
- Analysis API: `http://127.0.0.1:3001`
- Visualization API: `http://127.0.0.1:3000`

Packaged builds do not run a frontend web server. Electron loads the compiled
frontend from disk, selects available backend ports automatically, and passes
the selected ports to the frontend through a preload IPC bridge.

See [docs/project-overview.md](docs/project-overview.md) for a more detailed
project map and pipeline description.

## Requirements

- Node.js `22.22.2` (Node `>=22.12.0 <23` is supported for development)
- npm `10` or later
- Docker Desktop or Docker Engine, running before an analysis is started
- Git

The repository includes a `.node-version` file. With `fnm` installed:

```bash
fnm use
```

## Installation

```bash
git clone https://github.com/BICLab-NKUST/eDNA-Workbench.git
cd eDNA-Workbench
fnm use
npm install
```

The root `postinstall` script installs dependencies for the frontend and both
backend services. A single root-level `npm install` is sufficient. No `.env`
file is required; Electron passes runtime values such as dynamically selected
backend ports directly to the child processes.

## Development

Start the full desktop development environment in one terminal:

```bash
npm run electron:dev
```

This starts the frontend, both backend services, waits for their ports, and
then opens Electron. Closing one of the coordinated processes stops the others.

For separate logs or debugging, use four terminals from the repository root:

```bash
npm run frontend:dev
npm run backend-toolkit:dev
npm run backend-viz:dev
npm run electron
```

Development ports are intentionally fixed. If `5173`, `3001`, or `3000` is
already occupied, stop the conflicting process before starting the full stack.
Packaged builds select backend ports dynamically.

## Docker analysis image

The analysis backend expects the image
`uiskskkekekk/edna-workbench:latest`. To build it locally on Apple Silicon or
another non-x86 host, retain the `linux/amd64` platform because FLASH is not
available as a `linux-aarch64` conda package:

```bash
docker build --platform linux/amd64 \
  -t uiskskkekekk/edna-workbench:latest .
```

The application can also pull the expected image through its Docker setup UI.

## Build and packaging

Build the frontend only:

```bash
npm run frontend:build
```

Create an Electron installer for the current platform:

```bash
npm run dist
```

Attempt all configured platform targets:

```bash
npm run dist:all
```

Cross-platform packaging may require platform-specific tools. Release artifacts
should be built and smoke-tested on each target operating system before they
are published. Generated installers are written to `dist/` and are ignored by
Git.

The current desktop builds are unsigned. macOS Gatekeeper and Windows
SmartScreen may therefore warn users until code signing and notarization are
configured.

## Useful scripts

- `npm install` — install root and all subproject dependencies
- `npm run electron:dev` — start the complete development environment
- `npm run frontend:build` — produce the Vite production bundle
- `npm run backend:install` — install both backend dependency trees
- `npm run build` — prepare runtimes, build the frontend, and install backends
- `npm run dist` — clean and package the Electron application
- `npm run clean` — remove generated release artifacts

## Test data

`test-data/` contains small fixtures used for manual testing. Maintainers must
confirm that each fixture is synthetic, public, or otherwise approved for
redistribution before publishing a release.

## Security and privacy

- Both Express services bind only to the IPv4 loopback interface
  (`127.0.0.1`).
- Packaged Electron builds choose available backend ports and communicate the
  selected values to the frontend through IPC.
- Local environment overrides and generated analysis data are excluded from
  version control and Docker build contexts.
- Docker image downloads and dependency installation require network access;
  user analysis files are processed through local services and containers.

Please report security issues privately to the project maintainers instead of
including sensitive details in a public issue.

## License

Copyright (C) 2025-2026 eDNA WorkBench contributors.

This project is free software: you can redistribute it and/or modify it under
the terms of the GNU General Public License as published by the Free Software
Foundation, either version 3 of the License, or (at your option) any later
version.

See [LICENSE](LICENSE) for the complete license text.
