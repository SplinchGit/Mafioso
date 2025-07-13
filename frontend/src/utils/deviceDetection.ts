export const isWorldApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // Check for World App specific user agent strings
  const worldAppIdentifiers = [
    'worldapp',
    'world app',
    'worldcoin'
  ];
  
  return worldAppIdentifiers.some(identifier => 
    userAgent.includes(identifier)
  );
};

export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
};

export const shouldBlockBrowser = (): boolean => {
  // Block if not in World App
  return !isWorldApp();
};