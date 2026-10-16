// Vite `?raw` imports (prompts stay plain files; no filesystem on Workers).
declare module "*?raw" {
  const text: string;
  export default text;
}
