// const DELAY_PER_FRAME = 200; // ms.  Using 100 because that is the deadline for NORMAL priority rendering in Chrome.
const DELAY_PER_TASK = 10; // ms.
const DEMO_LENGTH = 10_000; // ms.
const PRIORITY = ['user-blocking', 'user-visible', 'background'][1];

const controller = new TaskController({ priority: PRIORITY });

function markNeedsNextPaint() {
  // We cannot programatically *increase* the priority of Rendering...
  // but we can decrease the priority of all the tasks we control
  if (location.search.length > 0) {
    controller.setPriority('background');
  }
}

function markDoneNextPaint() {
  controller.setPriority(PRIORITY);
}

/*
 * Block the main thread for `ms`
 */
function block(ms) {
  const target = performance.now() + ms;
  while (performance.now() < target);
}

/*
 * Schedule `numTasks` to run on main thread
 * Rather than a "waterfall" of tasks, such as:
 * setTimeout(() => setTimeout...)
 * These are all scheduled up front, in FIFO order
 */
function createTasks(numTasks, cb) {
  for (let i = 0; i < numTasks; i++) {
    scheduler.postTask(cb, {
        signal: controller.signal,
      }
    ).catch((ex) => { });
  }
}

/*
 * Start a rAF loop
 */
function startRAFLoop(cb) {
  let rafid = 0;
  function raf() {
    rafid = requestAnimationFrame(() => {
      cb();
      raf();
    });
  }
  raf();
  return () => cancelAnimationFrame(rafid);
}

/*
 * New experimental feature, better than traditional Long Tasks
 *
 * open -a /Applications/Google\ Chrome\ Canary.app/Contents/MacOS/Google\ Chrome\ Canary --args --force-enable-metrics-reporting --enable-blink-featutres=LongAnimationFrameTiming
 */
function startMarkingLoAF() {
  if (!PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')) {
    return console.warn(
      'LoAF Entry type not supported.  Type launching Canary with --enable-blink-featutres=LongAnimationFrameTiming'
    );
  }

  const observer = new PerformanceObserver((list) => {
    for (let entry of list.getEntries()) {
      console.log(entry);
      performance.measure('LoAF', {
        start: entry.startTime,
        duration: entry.duration,
      });
    }
  });
  observer.observe({ type: 'long-animation-frame', buffered: true });
}



/*
 * Lets get going!
 */
function main() {
  startMarkingLoAF();

  const start = performance.now();

  createTasks(1000, () => {
    // Update the DOM
    const now = performance.now()
    timer.innerHTML = now.toFixed(0);

    // Add a bit of work to the task
    block(10);

    // If you "need a next paint" quickly...
    markNeedsNextPaint();
  });

  const stopRAFLoop = startRAFLoop(() => {
    markDoneNextPaint();
  });

  stopButton.addEventListener('click', () => {
    stopRAFLoop();
    controller.abort();
  });

  scheduler.postTask(() => stopTheDemo(stopRunLoop),{
    priority: 'user-blocking',
    delay: DEMO_LENGTH,
  }
);
}

setTimeout(() => {
  main();
}, 1000);














