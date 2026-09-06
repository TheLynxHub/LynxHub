1<div align="center">

<br/>

<img height="120" alt="LynxHub Icon" src="src/renderer/shared/public/LynxHub.png">

# LynxHub

**Cross-platform, extensible terminal and browser for AI management.**

[![GitHub Metrics](https://assets.lynxhub.app/statics/row1-metrics.svg?v3)](https://github.com/TheLynxHub/LynxHub/releases)

[![Website](https://assets.lynxhub.app/statics/link-website.svg?v3)](https://lynxhub.app)
[![Docs](https://assets.lynxhub.app/statics/link-docs.svg?v3)](https://docs.lynxhub.app)

[![Discord](https://assets.lynxhub.app/statics/button-discord.svg?v3)](https://discord.gg/e8rBzhtcnK)
[![Patreon](https://assets.lynxhub.app/statics/button-patreon.svg?v3)](https://www.patreon.com/LynxHub)

![LynxHub Dashboard](/readme/lynxhub_screenshot.png)

_An open-source, highly modular environment built for AI power users to configure, manage, and run local AI interfaces._

</div>

## 🗂️ Table of Contents

- [✨ Feature Overview](#-feature-overview)
- [📦 Installation](#-installation)
- [🧩 Ecosystem (Extensions & Modules)](#-ecosystem)
- [💻 Development & Architecture](#-development--architecture)
- [🤝 Contributing](#-contributing)
- [❤️‍🔥 Support & Sponsors](#%EF%B8%8F%E2%80%8D-support--sponsors)

---

## ✨ Feature Overview

LynxHub consolidates your AI workflow into a single, unified workspace.

### Core Capabilities

🧩 **Extensible & Modular:** Build and expand LynxHub to fit your needs.

- **[Extensible Architecture:](https://docs.lynxhub.app/plugins/extensions/quick-start)** Add to LynxHub's core
  functionality.
- **[Modular Design:](https://docs.lynxhub.app/plugins/modules/quick-start)** Developers can create and share modules that
  add new AI WebUIs, complete with pre-set arguments, extensions, commands, etc.

🚀 **Manage Your AI Interfaces:** Handle your AI WebUIs easily from one place.

- **Install, Locate & Configure:** Set up new AI interfaces with options for specific branches, clone depth, and quick
  updates.
- **Advanced Git Control:** Switch branches, reset your repository, unshallow, view commit details, and stash changes
  directly from the interface card.
- **Extension Management:** Find, install, enable/disable, and batch-update AI extensions. Set auto-update preferences
  and update check frequency.

🔧 **Full Customization & Control:** Shape your AI environment to your exact needs.

- **Argument Manager:** Visually add, edit, and organize arguments (dropdowns, checkboxes, text, file/folder paths).
  Search and save presets for quick setup.
- **Custom Run Commands:** Define exactly how your AI interfaces launch.
- **Pre-Launch Automation:** Run terminal commands or open files/folders automatically before an AI interface starts.

🌐 **Integrated Workspace:** Work smarter with built-in tools.

- **Tabs for Multitasking:** Open multiple AI instances, terminals, or browsers at the same time, each in its own tab.
- **Built-in Terminal & Browser:** Switch quickly between terminal, browsing, and managing your AI. You can also open
  standalone terminal or browser windows.
- **Smart Detection:** Automatically finds and launches WebUIs URLs.
- **Markdown Viewer:** Read documentation and notes directly inside LynxHub.

💻 **Cross-Platform & Portable**

- Available for **X64**, **ARM64** (Windows, Linux, macOS) and as a **Portable** (Windows & Linux) letting you use
  LynxHub where you need it.

---

## 📦 Installation

### 1. Prerequisites

- **Git:** [Download](https://git-scm.com/downloads)
- **Powershell 7+:** [Download](https://github.com/PowerShell/PowerShell/releases/latest) _(Windows Only)_

### 2. Download LynxHub

| Channel          | Version                                                         | Release Date |
| ---------------- | --------------------------------------------------------------- | ------------ |
| **Insider**      | [V3.6.1](https://www.patreon.com/collection/1557749)            | 2026-09-06   |
| **Early Access** | [V3.6.1](https://www.patreon.com/collection/714004)             | 2026-09-06   |
| **Public**       | [V3.5.8](https://github.com/TheLynxHub/LynxHub/releases/latest) | 2026-08-06   |

> [!TIP]  
> 💡 Support development and get early access to LynxHub Core updates, premium extensions, and exclusive modules by joining our [**Patreon**](#%EF%B8%8F%E2%80%8D-support--sponsors).

### 3. Launching on macOS

> [!NOTE]  
> LynxHub is currently an unsigned macOS application. To bypass the initial security warning:
>
> 1. **Right-click** (or Control-click) the app and select **Open**.
> 2. Click **Open** in the prompt (or bypass via _System Settings → Privacy & Security → Open Anyway_).
> 3. _This is only required on the first launch._

---

## 🧩 Ecosystem

LynxHub's true power lies in its community-driven ecosystem. Integrate these into your build:

### Featured Extensions

- 🐍 [**Python Toolkit:**](https://github.com/TheLynxHub/Python-Toolkit) Streamline Python virtual environments (venv) and package management.
- 📊 [**Hardware Monitor:**](https://github.com/TheLynxHub/Hardware-Monitor) Real-time CPU, GPU, and RAM telemetry injected directly into the status bar.
- ⚡ [**Custom Actions:**](https://github.com/TheLynxHub/Custom-Actions) Create personalized workflow shortcuts and macro cards.
- 📖 [**Skills Manager:**](https://github.com/TheLynxHub/Skills-Toolkit) An interactive, feature-rich GUI management extension for AI Coding Agent Skills.
- 📰 [**AI News:**](https://github.com/TheLynxHub/AI-News) Get the latest AI news, articles, papers, and YouTube videos in one place.

### Featured Modules

- 🧠 [**Local AI Collection:**](https://github.com/TheLynxHub/Local-AI-Collection) A curated suite of local AI tools featuring full argument, config, and extension support.

---

## 💻 Development & Architecture

LynxHub is built on a modern desktop stack using **Electron, React, TypeScript, Redux Toolkit, and Vite**.

### Architecture Brief

- **[`src/main`](./src/main/README.md):** Electron backend. Handles OS native integrations, PTY terminals, Git ops, secure local storage (`lowdb`), IPC routing, and plugin lifecycle orchestration.
- **[`src/renderer`](./src/renderer/README.md):** React frontend. Uses Module Federation for dynamic runtime injection of extensions (UI elements, reducers) and modules. Employs independent child windows for lightweight auxiliary tasks (toasts, link previews).

### Quick Start

Ensure you have [Node.js LTS](https://nodejs.org/en/download) and [Git](https://git-scm.com/downloads) installed.

```bash
# Clone the repository
git clone https://github.com/TheLynxHub/LynxHub && cd LynxHub

# Install dependencies and start in dev mode
npm i --legacy-peer-deps
npm run dev
```

- **Hotkeys:** `F12` for DevTools, `Ctrl+R` to refresh the renderer.

### Build

Native modules compile automatically during installation.

```bash
npm run build
```

---

## 🤝 Contributing

As a solo maintainer, community contributions are the lifeblood of this project. Whether it's fixing a bug or building a new module, your help is deeply appreciated.

- **Core Code:** Submit PRs for bug fixes, UI improvements, or IPC optimizations.
- **Ecosystem:** Develop and share your own custom Extensions or Modules.
- **Feedback:** Open issues for feature requests tagged as `enhancement`.

---

## ❤️‍🔥 Support & Sponsors

Sustainable development relies on community backing. Support ongoing maintenance and future features while unlocking exclusive perks:

[![Patreon](https://assets.lynxhub.app/statics/patreon-badge.svg)](https://www.patreon.com/LynxHub)

**[Join the LynxHub Patreon!](https://www.patreon.com/LynxHub)**  
_(For one-time donations, check out the [Patreon Shop](https://www.Patreon.com/LynxHub/Shop))_

### Supporter Benefits

- 🚀 **Insider and Early Access Builds:** Immediate access to new features, extensions, and modules.
- 🎬 **Behind-the-Scenes:** Development roadmaps and priority input on upcoming features.
- ⭐ **Recognition:** Your name immortalized in the GitHub README and in-app credits.
- 🛠️ **Priority Support:** Direct assistance and an exclusive Discord role.

### 🏆 Gold Sponsors

Massive thanks to my Gold Sponsors:

| ![Resolita][resolita]                           |
| ----------------------------------------------- |
| [**Resolita**](https://www.patreon.com/LynxHub) |

---

<div align="center">

[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:kindofbrazy@gmail.com)
[![X](https://img.shields.io/badge/X-%23000000.svg?style=for-the-badge&logo=X&logoColor=white)](https://x.com/LynxHubAI)

**© 2026 LynxHub.**

</div>

[resolita]: https://wsrv.nl/?url=https://c10.patreonusercontent.com/4/patreon-media/p/user/215565457/f96f7d12b2284a189e4490daabb17891/eyJ3IjoyMDB9/2.jpg?token-hash=u4ebFSw-hnpdOD8fu0ME1mlH--jNPPMJPG-0icor0no%3D&h=90&w=90&fit=cover&mask=circle
