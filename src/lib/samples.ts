export const generateSampleCode = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `LAB-${year}-${random}`;
};
