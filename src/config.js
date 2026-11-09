export const config = {
  // Use process.env.PORT if it exists, otherwise default to 3000
  port: parseInt(process.env.PORT || '3000', 10),
  // The absolute path to the public folder
  publicDir: new URL('../public/', import.meta.url).pathname
};