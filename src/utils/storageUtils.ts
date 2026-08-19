export function clearAppStorage() {
  // Clear localStorage keys starting with 'jeeos_'
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('jeeos_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));

  // Also clear any other known keys that might not have the prefix
  sessionStorage.removeItem('onboarding_dismissed');
}
