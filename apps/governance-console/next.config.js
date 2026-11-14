/** @type {import('next').NextConfig} */
const path = require('path');
module.exports = {
  outputFileTracingRoot: path.join(__dirname, '../..'),
  output: 'export',
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  images: { unoptimized: true },
};
