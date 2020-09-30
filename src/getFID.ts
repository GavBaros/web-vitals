/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {bindReporter} from './lib/bindReporter.js';
import {getFirstHidden} from './lib/getFirstHidden.js';
import {initMetric} from './lib/initMetric.js';
import {observe, PerformanceEntryHandler} from './lib/observe.js';
import {onBFCacheRestore} from './lib/onBFCacheRestore.js';
import {onHidden} from './lib/onHidden.js';
import {PerformanceEventTiming, ReportHandler} from './types.js';
import {firstInputPolyfill, resetFirstInputPolyfill} from './lib/polyfills/firstInputPolyfill.js';


export const getFID = (onReport: ReportHandler) => {
  const firstHidden = getFirstHidden();
  let metric = initMetric('FID');
  let report: ReturnType<typeof bindReporter>;

  const entryHandler = (entry: PerformanceEventTiming) => {
    // Only report if the page wasn't hidden prior to the first input.
    if (entry.startTime < firstHidden.timeStamp) {
      metric.value = entry.processingStart - entry.startTime;
      metric.entries.push(entry);
      metric.isFinal = true;
      report();
    }
  };

  const po = observe('first-input', entryHandler as PerformanceEntryHandler);
  report = bindReporter(onReport, metric, po);

  if (po) {
    onHidden(() => {
      po.takeRecords().map(entryHandler as PerformanceEntryHandler);
    }, true);
  }

  if (self.__WEB_VITALS_EXTERNAL_POLYFILL__) {
    // Prefer the native implementation if available,
    if (!po) {
      window.webVitals.firstInputPolyfill(entryHandler)
    }
    onBFCacheRestore(() => {
      metric = initMetric('FID');
      report = bindReporter(onReport, metric, po);
      window.webVitals.resetFirstInputPolyfill();
      window.webVitals.firstInputPolyfill(entryHandler);
    });
  } else {
    onBFCacheRestore(() => {
      metric = initMetric('FID');
      report = bindReporter(onReport, metric, po);
      resetFirstInputPolyfill();
      firstInputPolyfill((entry) => {
        entryHandler(entry)
      });
    });
  }
};
