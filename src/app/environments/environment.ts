const isProduction = false;

export const environment = {
  production: isProduction,
  apiUrl: isProduction
    ? 'https://chelifetv.onrender.com/'
    : 'http://localhost:5003/',
};