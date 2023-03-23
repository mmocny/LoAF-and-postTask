# Long Animation Frames (LoAF) and postTask api

Demo of tasks, task queues, and priority, and the interplay with Rendering and Input.

- Once a task starts running, at any priority, it will not get pre-empted.
  - So, the other part of the story is that every single task must yield() regularly.
- `isInputPending()` is a signal that can be used to decide if it is worth yielding()... however:
  - It is true only BEFORE an event gets dispatched
  - Inisde event handlers, and after events handlers, but before next rendering opporunity, it is false.
  - So, any library code that does:

```js
if (!isInputPending())
  do_expensive_work();
```
  - ... will actually block the main thread if called from event handlers, or rAF, or tasks that happen to get scheduled in the event->rendering gap.
  - Therefore, I suggest to just remove the *IF*, and always yield
  - Unless you specifically know there is a scheduling cost to doing so.

- Even better is so schedule the followup at background or requestIdleCallback priority -- which increases the likelihood that it comes after the next rendering task.


- If you want complete control of scheduling:
  - I would implement a `function markNeedsNextPaint()`.
  - ...and then call markNeedsNextPaint() in places that update important UI.
  - Then, your task scheduler can use that signal to decide to postpone work until after rendering
  - i.e. to requestPostAnimationFrame, or requestIdleCallback, or just decrease postTask priority

- Trusted discrete events *will increase* rendering priority automatically, as of chromium m109.
