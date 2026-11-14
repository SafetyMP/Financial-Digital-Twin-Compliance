const path = require('path');
/** @type {import('next').NextConfig} */
module.exports = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  images: { unoptimized: true },
};
