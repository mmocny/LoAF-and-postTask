  // Trusted discrete events *will increase* rendering priority automatically, as of chromium m109.

  // Once a task starts running, at any priority, it will not get pre-empted.
  // So the other part of the story is that every single task must yield() regularly.
  
  // isInputPending() is a signal that can be used to decide if it is worth yielding()... however:
  // - It is true only BEFORE an event gets dispatched
  // - Inisde event handlers, and after events handlers but before next rendering opporunity, it is false.
  // - So any library code that does:
  //   if (!isInputPending()) do_expensive_work();
  // ... will block the main thread if called from event handlers or rAF or tasks that happen to get scheduled in the event->rendering gap.
  // Therefore, I suggest to just remove the *IF*, and always yield, unless you specifically know there is a scheduling cost to doing so.
  // Even better is so schedule the followup at background or requestIdleCallback priority -- which increases the likelihood that it comes after the next rendering task.
  
  // If you want complete control-- I would set global state from markNeedsNextPaint(), and then call markNeedsNextPaint() in places that update important UI.
  // Then, you task scheduler can use the signal to decide to postpone work until after rendering, for example:

  // Note: sadly, simulated events don't trick the scheduler
  // const evt = new Event('click', { bubbles: true });
  // document.dispatchEvent(evt);


