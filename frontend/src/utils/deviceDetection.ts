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

export const isMiniApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check if running in a mini app environment (World App or other mini app containers)
  const userAgent = window.navigator.userAgent.toLowerCase();
  
  // Mini app identifiers
  const miniAppIdentifiers = [
    'worldapp',
    'world app', 
    'worldcoin',
    'miniapp',
    'mini-app'
  ];
  
  // Check for mini app context
  const hasMiniAppContext = miniAppIdentifiers.some(identifier => 
    userAgent.includes(identifier)
  );
  
  // Check for mobile environment (mini apps typically run on mobile)
  const isMobile = isMobileDevice();
  
  return hasMiniAppContext || (isMobile && window.location.hostname !== 'localhost');
};

export const shouldBlockBrowser = (): boolean => {
  // Only block desktop browsers, allow mini apps
  return !isMiniApp() && !isMobileDevice();
};