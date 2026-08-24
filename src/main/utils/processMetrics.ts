import type {LynxProcessMetric, ProcessMetricsReport} from '@lynx_common/types/ipc';
import {app, webContents} from 'electron';

/**
 * Collects and formats detailed runtime metrics for all Electron processes (Main, GPU, Utility, Renderers).
 * Resolves human-readable labels for child windows and WebContentsViews.
 */
export function getProcessMetrics(): ProcessMetricsReport {
  const metrics = app.getAppMetrics();
  const allWebContents = webContents.getAllWebContents();

  // Map PIDs to WebContents labels
  const pidLabels = new Map<number, string>();

  for (const wc of allWebContents) {
    if (wc.isDestroyed()) continue;
    try {
      const pid = typeof wc.getOSProcessId === 'function' ? wc.getOSProcessId() : wc.getProcessId();
      const url = wc.getURL() || '';
      const title = wc.getTitle() || '';
      let label = 'Renderer Process';

      if (url.includes('bookmarkTooltip.html')) {
        label = 'BookmarkTooltip (Child View)';
      } else if (url.includes('contextMenu.html')) {
        label = 'ContextMenu (Child View)';
      } else if (url.includes('linkPreview.html')) {
        label = 'LinkPreview (Child View)';
      } else if (url.includes('quickWeb.html')) {
        label = 'QuickWeb Window';
      } else if (url.includes('shareScreen.html')) {
        label = 'ShareScreen Window';
      } else if (url.includes('loading.html')) {
        label = 'Loading Window';
      } else if (url.includes('toast.html')) {
        label = 'Toast Window';
      } else if (url.includes('index.html') || url === '') {
        label = title ? `Main Window (${title})` : 'Main Window (Home/App)';
      } else {
        label = `WebContents (${title || url})`;
      }

      pidLabels.set(pid, label);
    } catch {
      // Ignored if webContents destroyed or inaccessible
    }
  }

  let totalWorkingSetBytes = 0;

  const processes: LynxProcessMetric[] = metrics.map(m => {
    totalWorkingSetBytes += m.memory.workingSetSize || 0;

    let label = pidLabels.get(m.pid);
    if (!label) {
      if (m.type === 'Browser') {
        label = 'Main Process (Node.js backend)';
      } else if (m.type === 'GPU') {
        label = 'GPU Process (Hardware Acceleration)';
      } else if (m.type === 'Utility') {
        label = `Utility Process (${m.name || 'Network/Audio'})`;
      } else if (m.type === 'Tab') {
        label = 'Renderer Process (Child / View)';
      } else {
        label = `${m.type} Process`;
      }
    }

    return {
      pid: m.pid,
      type: m.type,
      name: m.name,
      label,
      memoryMB: Math.round(((m.memory.workingSetSize || 0) / 1024) * 100) / 100,
      peakMemoryMB: Math.round(((m.memory.peakWorkingSetSize || 0) / 1024) * 100) / 100,
      cpuPercent: m.cpu ? Math.round(m.cpu.percentCPUUsage * 100) / 100 : undefined,
      sandboxed: m.sandboxed,
    };
  });

  // Sort by memory usage descending
  processes.sort((a, b) => b.memoryMB - a.memoryMB);

  return {
    totalWorkingSetMB: Math.round((totalWorkingSetBytes / 1024) * 100) / 100,
    processCount: processes.length,
    processes,
  };
}

/**
 * Logs a formatted process metrics table to the Node console.
 */
export function logProcessMetrics(): ProcessMetricsReport {
  const report = getProcessMetrics();
  const summary = `[Metrics] LynxHub Processes: ${report.processCount} | Total RAM: ${report.totalWorkingSetMB} MB`;
  console.log(`\n${summary}`);
  console.table(
    report.processes.map(p => ({
      PID: p.pid,
      Type: p.type,
      Label: p.label,
      'RAM (MB)': p.memoryMB,
      'Peak (MB)': p.peakMemoryMB,
      'CPU (%)': p.cpuPercent ?? 0,
    })),
  );
  return report;
}
