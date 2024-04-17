//@ts-ignore: chart.js types are broken
import {CrosshairPlugin} from 'chartjs-plugin-crosshair';
import { Chart } from 'chart.js';

// So the crosshair plugin author thought that all the graphs
// have an x-axis. Which is bull****. So I had to fix it.
export function registerCrosshairPlugin() {
  const CustomCrosshairPlugin = function (plugin: any) {
    const originalAfterDraw = plugin.afterDraw;
    plugin.afterDraw = function(chart: any) {
        if (chart && chart.crosshair) {
          originalAfterDraw.call(this, chart);
        }
    };

    const originalAfterDestroy = plugin.afterDestroy;
    plugin.afterDestroy = function(chart: any, event: any) {
      if (chart && chart.crosshair) {
        originalAfterDestroy.call(this, chart, event)
      }
    }

    const originalAfterEvent = plugin.afterEvent;
    plugin.afterEvent = function(chart: any, event: any) {
      if (chart && chart.crosshair) {
        originalAfterEvent.call(this, chart, event)
      }
    }

    const originalHandleSyncEvent = plugin.handleSyncEvent;
    plugin.handleSyncEvent = function(chart: any, event: any) {
      if (chart && chart.crosshair) {
        originalHandleSyncEvent.call(this, chart, event)
      }
    }

    const originalBeforeTooltipDraw = plugin.beforeTooltipDraw;
    plugin.beforeTooltipDraw = function(chart: any) {
      if (chart && chart.crosshair) {
        originalBeforeTooltipDraw.call(this, chart)
      }
    }

    return plugin;
  };

  Chart.register(CustomCrosshairPlugin(CrosshairPlugin));
}
