<div align="center">

<br/>

<img height="120" alt="LynxHub Icon" src="src/renderer/shared/public/LynxHub.png">

# LynxHub

**Cross-platform, extensible terminal and browser for AI management.**

[![GitHub Release][github-release-shield]](https://github.com/KindaBrazy/LynxHub/releases)
[![GitHub Release Date][github-release-date-shield]](https://github.com/KindaBrazy/LynxHub/releases)

[![Website][website-shield]](https://lynxhub.app)
[![Docs][docs-shield]](https://docs.lynxhub.app)

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

> [!IMPORTANT]
> **Not a One-Click Installer**  
> LynxHub is an advanced manager and environment wrapper, not a one-click magic installer. While it offers robust installation support, it assumes you have a basic understanding of your preferred AI WebUIs. You can clone and configure new interfaces or seamlessly connect existing ones on your drive.

### Core Capabilities

🧩 **Extensible & Modular:** Build and expand LynxHub to fit your needs.

- **[Extensible Architecture:](https://github.com/KindaBrazy/LynxHub-Extension-Guide)** Add to LynxHub's core
  functionality.
- **[Modular Design:](https://github.com/KindaBrazy/LynxHub-Module-Guide)** Developers can create and share modules that
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
| ---------------- |-----------------------------------------------------------------|--------------|
| **Insider**      | [V3.5.6](https://www.patreon.com/collection/1557749)            | 2026-07-13   |
| **Early Access** | [V3.5.6](https://www.patreon.com/collection/714004)             | 2026-07-13   |
| **Public**       | [V3.5.5](https://github.com/KindaBrazy/LynxHub/releases/latest) | 2026-07-18   |

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

- 🐍 [**Python Toolkit:**](https://github.com/KindaBrazy/LynxHub-Python-Toolkit) Streamline Python virtual environments (venv) and package management.
- 📊 [**Hardware Monitor:**](https://github.com/KindaBrazy/LynxHub-Hardware-Monitor) Real-time CPU, GPU, and RAM telemetry injected directly into the status bar.
- ⚡ [**Custom Actions:**](https://github.com/KindaBrazy/LynxHub-Custom-Actions) Create personalized workflow shortcuts and macro cards.
- 📖 [**Skills Manager:**](https://github.com/KindaBrazy/LynxHub-Skills-Toolkit) An interactive, feature-rich GUI management extension for AI Coding Agent Skills.

### Featured Modules

- 🧠 [**Local AI Collection:**](https://github.com/KindaBrazy/LynxHub-Module-Offline-Container) A curated suite of local AI tools featuring full argument, config, and extension support.

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
git clone https://github.com/KindaBrazy/LynxHub && cd LynxHub

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

[![Patreon](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Fshieldsio-patreon.vercel.app%2Fapi%3Fusername%3DLynxHub%26type%3Dpatrons&style=for-the-badge)](https://www.patreon.com/LynxHub)

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

[![X](https://img.shields.io/badge/X-%23000000.svg?style=for-the-badge&logo=X&logoColor=white)](https://x.com/LynxHubAI)
[![YouTube](https://img.shields.io/badge/YouTube-%23FF0000.svg?style=for-the-badge&logo=YouTube&logoColor=white)](https://www.youtube.com/@LynxHubAI)
[![Reddit](https://img.shields.io/badge/Reddit-FF4500?style=for-the-badge&logo=reddit&logoColor=white)](https://www.reddit.com/r/LynxHubAI)
[![Gmail](https://img.shields.io/badge/Gmail-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:kindofbrazy@gmail.com)
[![Patreon](https://img.shields.io/badge/Patreon-F96854?style=for-the-badge&logo=patreon&logoColor=white)](https://www.patreon.com/LynxHub)

[![LynxHub Discord](http://invidget.switchblade.xyz/e8rBzhtcnK)](https://discord.gg/e8rBzhtcnK)

**© 2026 LynxHub.**

</div>

[github-release-shield]: https://img.shields.io/github/v/release/KindaBrazy/LynxHub?include_prereleases&style=flat&labelColor=%23212121&color=%2300A9FF&label=Version&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9IndoaXRlIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xNCAyMmgtNGMtMy43NzEgMC01LjY1NyAwLTYuODI4LTEuMTcyQzIgMTkuNjU3IDIgMTcuNzcxIDIgMTR2LTRjMC0zLjc3MSAwLTUuNjU3IDEuMTcyLTYuODI4QzQuMzQzIDIgNi4yMzkgMiAxMC4wMyAyYy42MDYgMCAxLjA5MSAwIDEuNS4wMTdjLS4wMTMuMDgtLjAyLjE2MS0uMDIuMjQ0bC0uMDEgMi44MzRjMCAxLjA5NyAwIDIuMDY3LjEwNSAyLjg0OGMuMTE0Ljg0Ny4zNzUgMS42OTQgMS4wNjcgMi4zODZjLjY5LjY5IDEuNTM4Ljk1MiAyLjM4NSAxLjA2NmMuNzgxLjEwNSAxLjc1MS4xMDUgMi44NDguMTA1aDQuMDUyYy4wNDMuNTM0LjA0MyAxLjE5LjA0MyAyLjA2M1YxNGMwIDMuNzcxIDAgNS42NTctMS4xNzIgNi44MjhDMTkuNjU3IDIyIDE3Ljc3MSAyMiAxNCAyMiIgY2xpcC1ydWxlPSJldmVub2RkIiBvcGFjaXR5PSIwLjUiLz48cGF0aCBmaWxsPSJ3aGl0ZSIgZD0iTTEwLjU2IDE1LjQ5OGEuNzUuNzUgMCAxIDAtMS4xMi0uOTk2bC0yLjEwNyAyLjM3bC0uNzcyLS44N2EuNzUuNzUgMCAwIDAtMS4xMjIuOTk2bDEuMzM0IDEuNWEuNzUuNzUgMCAwIDAgMS4xMiAwem0uOTUtMTMuMjM4bC0uMDEgMi44MzVjMCAxLjA5NyAwIDIuMDY2LjEwNSAyLjg0OGMuMTE0Ljg0Ny4zNzUgMS42OTQgMS4wNjcgMi4zODVjLjY5LjY5MSAxLjUzOC45NTMgMi4zODUgMS4wNjdjLjc4MS4xMDUgMS43NTEuMTA1IDIuODQ4LjEwNWg0LjA1MmMuMDEzLjE1NS4wMjIuMzIxLjAyOC41SDIyYzAtLjI2OCAwLS40MDItLjAxLS41NmE1LjMyMiA1LjMyMiAwIDAgMC0uOTU4LTIuNjQxYy0uMDk0LS4xMjgtLjE1OC0uMjA0LS4yODUtLjM1N0MxOS45NTQgNy40OTQgMTguOTEgNi4zMTIgMTggNS41Yy0uODEtLjcyNC0xLjkyMS0xLjUxNS0yLjg5LTIuMTYxYy0uODMyLS41NTYtMS4yNDgtLjgzNC0xLjgxOS0xLjA0YTUuNDg4IDUuNDg4IDAgMCAwLS41MDYtLjE1NGMtLjM4NC0uMDk1LS43NTgtLjEyOC0xLjI4NS0uMTR6Ii8+PC9zdmc+
[github-release-date-shield]: https://img.shields.io/github/release-date-pre/KindaBrazy/LynxHub?style=flat&labelColor=%23212121&color=%2300A9FF&label=Date&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJNNi45NiAyYy40MTggMCAuNzU2LjMxLjc1Ni42OTJWNC4wOWMuNjctLjAxMiAxLjQyMi0uMDEyIDIuMjY4LS4wMTJoNC4wMzJjLjg0NiAwIDEuNTk3IDAgMi4yNjguMDEyVjIuNjkyYzAtLjM4Mi4zMzgtLjY5Mi43NTYtLjY5MnMuNzU2LjMxLjc1Ni42OTJWNC4xNWMxLjQ1LjEwNiAyLjQwMy4zNjggMy4xMDMgMS4wMDhjLjcuNjQxLjk4NSAxLjUxMyAxLjEwMSAyLjg0MnYxSDJWOGMuMTE2LTEuMzI5LjQwMS0yLjIgMS4xMDEtMi44NDJjLjctLjY0IDEuNjUyLS45MDIgMy4xMDMtMS4wMDhWMi42OTJjMC0uMzgyLjMzOS0uNjkyLjc1Ni0uNjkyIi8+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0yMiAxNHYtMmMwLS44MzktLjAxMy0yLjMzNS0uMDI2LTNIMi4wMDZjLS4wMTMuNjY1IDAgMi4xNjEgMCAzdjJjMCAzLjc3MSAwIDUuNjU3IDEuMTcgNi44MjhDNC4zNDkgMjIgNi4yMzQgMjIgMTAuMDA0IDIyaDRjMy43NyAwIDUuNjU0IDAgNi44MjYtMS4xNzJDMjIgMTkuNjU3IDIyIDE3Ljc3MSAyMiAxNCIgb3BhY2l0eT0iMC41Ii8+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xOCAxNi41YTEuNSAxLjUgMCAxIDEtMyAwYTEuNSAxLjUgMCAwIDEgMyAwIi8+PC9zdmc+
[github-downloads-shield]: https://img.shields.io/github/downloads/KindaBrazy/LynxHub/total?labelColor=%23212121&color=%2300A9FF&label=Downloads&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPjxwYXRoIGZpbGw9IndoaXRlIiBkPSJNMjIgMTZ2LTFjMC0yLjgyOCAwLTQuMjQyLS44NzktNS4xMkMyMC4yNDIgOSAxOC44MjggOSAxNiA5SDhjLTIuODI5IDAtNC4yNDMgMC01LjEyMi44OEMyIDEwLjc1NyAyIDEyLjE3IDIgMTQuOTk3VjE2YzAgMi44MjkgMCA0LjI0My44NzkgNS4xMjJDMy43NTcgMjIgNS4xNzIgMjIgOCAyMmg4YzIuODI4IDAgNC4yNDMgMCA1LjEyMS0uODc4QzIyIDIwLjI0MiAyMiAxOC44MjkgMjIgMTYiIG9wYWNpdHk9IjAuNSIvPjxwYXRoIGZpbGw9IndoaXRlIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik0xMiAxLjI1YS43NS43NSAwIDAgMC0uNzUuNzV2MTAuOTczbC0xLjY4LTEuOTYxYS43NS43NSAwIDEgMC0xLjE0Ljk3NmwzIDMuNWEuNzUuNzUgMCAwIDAgMS4xNCAwbDMtMy41YS43NS43NSAwIDEgMC0xLjE0LS45NzZsLTEuNjggMS45NlYyYS43NS43NSAwIDAgMC0uNzUtLjc1IiBjbGlwLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=
[website-shield]: https://img.shields.io/badge/Website-LynxHub.app-00A9FF?style=flat&labelColor=%23212121&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgY29sb3I9IiMwZjQxNTkiIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCI+PGNpcmNsZSBvcGFjaXR5PSIwLjUiIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0id2hpdGUiPjwvY2lyY2xlPjxwYXRoIGQ9Ik0gOC41NzUxNiA5LjQ0NzM3IEMgOC4zODc5IDcuMzYzMTYgNi43ODA2IDUuNDIxMDUgNi4wMDAzNSA0LjcxMDUzIEwgNS41NjkzNCA0LjM0MTg5IEMgNy4zMDc5MiAyLjg4MDM3IDkuNTUxMzMgMiAxMi4wMDA0IDIgQyAxNC4yMTM3IDIgMTYuMjU5MiAyLjcxOTEgMTcuOTE1OCAzLjkzNjQyIEMgMTguMTQ5OCA0LjY0Njk1IDE3LjcwNCA2LjEzMTU4IDE3LjIzNTkgNi44NDIxMSBDIDE3LjA2NjMgNy4wOTk0NyAxNi42ODE4IDcuNDE4OTggMTYuMjYwMiA3LjcyMTg2IEMgMTUuMzA5NyA4LjQwNDc3IDE0LjExMDIgOC43NDI1NCAxMy41MDA0IDEwIEMgMTMuMzI2IDEwLjM1OTUgMTMuMzMzNSAxMC43MTA4IDEzLjQxNzMgMTEuMDE2MyBDIDEzLjQ3NzYgMTEuMjM1OCAxMy41MTYxIDExLjQ3NDUgMTMuNTE2NyAxMS43MDggQyAxMy41MTg3IDEyLjQ2MjkgMTIuNzU1MiAxMy4wMDgyIDEyLjAwMDQgMTMgQyAxMC4wMzYxIDEyLjk3ODYgOC43NTAyIDExLjM5NTUgOC41NzUxNiA5LjQ0NzM3IFoiIGZpbGw9IndoaXRlIj48L3BhdGg+PHBhdGggZD0iTSAxMy40MzY1IDE4LjI3NjEgQyAxNC40MjQ2IDE2LjQxNCAxNy43MTgyIDE2LjQxNCAxNy43MTgyIDE2LjQxNCBDIDIxLjE1MDIgMTYuMzc4MiAyMS42MTM4IDE0LjI5NDQgMjEuOTIzNyAxMy4yNDEyIEMgMjEuMzY5IDE3LjcyMjYgMTcuODQ5NCAyMS4yODQ5IDEzLjM4ODUgMjEuOTA0NiBDIDEzLjA2NTkgMjEuMjI1NiAxMi42ODM3IDE5LjY5NDYgMTMuNDM2NSAxOC4yNzYxIFoiIGZpbGw9IndoaXRlIj48L3BhdGg+PC9zdmc+
[docs-shield]: https://img.shields.io/badge/Docs-docs.LynxHub.app-00A9FF?style=flat&labelColor=%23212121&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxZW0iIGhlaWdodD0iMWVtIiB2aWV3Qm94PSIwIDAgMjQgMjQiPgoJPHBhdGggZD0iTTAgMGgyNHYyNEgweiIgZmlsbD0ibm9uZSIgLz4KCTxwYXRoIGZpbGw9IiNmZmYiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZD0iTTIgMTYuMTQ0VjQuOTk4YzAtMS4wOTguODg2LTEuOTkgMS45ODItMS45MjNjLjk3Ny4wNiAyLjEzMS4xNzkgMy4wMTguNDEzYzEuMDUuMjc2IDIuMjk2Ljg2NiAzLjI4MiAxLjM4OEEzLjUgMy41IDAgMCAwIDEyIDUuMjc1djE1LjJhMy40NiAzLjQ2IDAgMCAxLTEuNjI4LS40MDZjLTEtLjUzMi0yLjI5LTEuMTUtMy4zNzItMS40MzVjLS44NzctLjIzMi0yLjAxNi0uMzUtMi45ODUtLjQxMUMyLjkwNiAxOC4xNTMgMiAxNy4yNTUgMiAxNi4xNDMiIGNsaXAtcnVsZT0iZXZlbm9kZCIgb3BhY2l0eT0iLjUiIC8+Cgk8cGF0aCBmaWxsPSIjZmZmIiBkPSJNMjIgMTYuMTQ0VjQuOTM0YzAtMS4wNzMtLjg0Ni0xLjk1My0xLjkxOC0xLjkxNmMtMS4xMjkuMDQtMi41MzUuMTU2LTMuNTgyLjQ3Yy0uOTA4LjI3MS0xLjk2NS44MTYtMi44MjYgMS4zMTVBMy41IDMuNSAwIDAgMSAxMiA1LjI3NXYxNS4yYy41NiAwIDEuMTIxLS4xMzYgMS42MjgtLjQwNmMxLS41MzIgMi4yOS0xLjE1IDMuMzcyLTEuNDM1Yy44NzctLjIzMiAyLjAxNi0uMzUgMi45ODUtLjQxMWMxLjEwOS0uMDcgMi4wMTUtLjk2OCAyLjAxNS0yLjA4IiAvPgo8L3N2Zz4K
[resolita]: https://wsrv.nl/?url=https://c10.patreonusercontent.com/4/patreon-media/p/user/215565457/f96f7d12b2284a189e4490daabb17891/eyJ3IjoyMDB9/2.jpg?token-hash=u4ebFSw-hnpdOD8fu0ME1mlH--jNPPMJPG-0icor0no%3D&h=90&w=90&fit=cover&mask=circle
