import SettingsSection from '@lynx/components/SettingsSection';
import {SpeedometerMiddleIcon} from '@solar-icons/react/bold-duotone';

import HWAcc from '../general/HWAcc';
import Autoplay from './Autoplay';
import ColorProfile from './ColorProfile';
import DiskCache from './DiskCache';
import FrameRate from './FrameRate';
import GpuBlacklist from './GpuBlacklist';
import GpuRasterization from './GpuRasterization';
import GpuSelection from './GpuSelection';
import HighDpi from './HighDpi';
import JsMemory from './JsMemory';
import ParallelDownloading from './ParallelDownloading';
import SkiaGraphite from './SkiaGraphite';
import VideoDecoding from './VideoDecoding';
import Vsync from './Vsync';
import Wasm from './Wasm';
import ZeroCopy from './ZeroCopy';

export const SettingsPerformanceId = 'settings_performance_elem';

/**
 * Settings section containing performance-related configurations.
 * Allows users to tweak GPU usage, rendering modes, cache sizes, and memory limits.
 */
export default function SettingsPerformance() {
  return (
    <SettingsSection title="Performance" id={SettingsPerformanceId} icon={<SpeedometerMiddleIcon className="size-5" />}>
      <HWAcc />
      <HighDpi />
      <VideoDecoding />
      <GpuRasterization />
      <ZeroCopy />
      <Wasm />
      <ParallelDownloading />
      <SkiaGraphite />
      <JsMemory />
      <DiskCache />
      <ColorProfile />
      <Autoplay />
      <GpuSelection />
      <GpuBlacklist />
      <Vsync />
      <FrameRate />
    </SettingsSection>
  );
}
