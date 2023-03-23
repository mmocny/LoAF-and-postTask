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
 * Create a bunch of "small" tasks.  Each of which will:
 * - yield to run loop
 * - attempt to modify DOM (invalidation -> needsBeginFrames)
 *
 * However, they are all queued up-front, rather than waterfall
 */
function createTasks(cb) {
  const count = DEMO_LENGTH / DELAY_PER_TASK;

  for (let i = 0; i < count; i++) {
    scheduler.postTask(
      () => {
        block(DELAY_PER_TASK);
        cb();
      },
      { signal: controller.signal }
    );
  }
}

/*
 * Start a rAF loop
 */
function startRunLoop(cb) {
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
  if (
    !PerformanceObserver.supportedEntryTypes.includes('long-animation-frame')
  ) {
    return console.warn(
      'LoAF Entry type not supported.  Type launching Canary with --enable-blink-featutres=LongAnimationFrameTiming'
    );
  }

  const observer = new PerformanceObserver((list) => {
    for (let entry of list.getEntries()) {
      // console.log(entry);
      performance.measure('LoAF', {
        start: entry.startTime,
        duration: entry.duration,
      });
    }
  });
  observer.observe({ type: 'long-animation-frame', buffered: true });
}

function stopTheDemoEventually(stopRunLoop) {
  // Like setTimeout but higher priority
  scheduler.postTask(
    () => {
      stopRunLoop();
      controller.abort();
    },
    { priority: 'user-blocking', signal: controller.signal, delay: DEMO_LENGTH }
  );
}

/*
 * Lets get going!
 */
function main() {
  startMarkingLoAF();

  createTasks(() => {
    timer.innerHTML = performance.now().toFixed(0);

    // If you "need a next paint" quickly...
    markNeedsNextPaint();
  });
  // Every raf, create a new set of Tasks, which try update the DOM
  // We *should* have a DOM update every 10ms and a raf every opportunity... but we dont!
  const stopRunLoop = startRunLoop(() => {
    markDoneNextPaint();
  });

  stopTheDemoEventually(stopRunLoop);
}

setTimeout(() => {
  main();
}, 1000);














