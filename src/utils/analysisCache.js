let cachedResult = null;

export const setCachedResult = (result) => {
  cachedResult = result;
};

export const getCachedResult = () => {
  return cachedResult;
};