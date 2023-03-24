# Long Animation Frames (LoAF) and postTask api

Demo to showcase tasks, task queues, task priority, and the interplay with Rendering and Input.

- Once a task starts running, it will not get pre-empted (it will block main thread).
- After a task is done running, the next task in the queue will get scheduled.
- There are several task queues, with different priority levels.
- Tasks are scheduled in FIFO order, within the same priority level.
- "Rendering" has the same priority ("normal" aka "user-visible") as all other tasks, by default.
- Rendering may increase its priority after:
  - 100ms of being in its task queue
  - A discrete input event arrives (as of chromium m109)

In other words, tasks must yield() regularly in order to allow other tasks to run-- including high priority work like input and rendering.

However, if there other normal priority tasks already in the queue, rendering may still wait for its turn.

If you really want to force rendering-- you need to empty the "user-visible" priority task queue.  One way to do this is to force all queued tasks temporarily to "background" priority.

## Other notes

### isInputPending

- `isInputPending()` is a signal that can be used to decide if it is worth yield()ing...
- However:
  - It is true only BEFORE an event gets dispatched (before event handlers fire)
  - Inside event handlers and after events handlers (but still before next rendering opporunity), `isInputPending()` is false again.
- So, any library code that does:

```js
if (!isInputPending())
  do_expensive_work();
```
  - ... will actually block the main thread if called from event handlers, or rAF, or tasks that happen to get scheduled in the event->rendering gap.
  - Therefore, I suggest to just remove the check for `isInputPending()`, and just always yield.
  - If you know specifically that there is too much yielding and this is causing performance regressions due to too much scheduling overhead-- then you can switch something like `yieldIfNeeded()` and only actually yield every few ms.
  - You can still use `await yieldIfNeeded()` and return a resolved promise to run in microtask queue, or `if (yieldIsNeed())` if you don't want to do even that.

### Controlling the loop

- I would implement a `function markNeedsNextPaint()`.
- ...and then call `markNeedsNextPaint()` in places that update important UI.
- Then, your task scheduler can use that signal to decide to postpone work until after rendering, i.e.:
  - wait for requestPostAnimationFrame
  - or, decrease postTask priority to background until next rAF