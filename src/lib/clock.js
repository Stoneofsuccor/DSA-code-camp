export const clock = {
  now: () => Date.now(),
  
  // Used ONLY by tests to control time
  setNow: (timestamp) => {
    const originalNow = clock.now;
    clock.now = () => timestamp;
    return () => { clock.now = originalNow; }; // Return a restore function
  }
};
