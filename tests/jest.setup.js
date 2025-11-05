const dotenv = require('dotenv');
const path = require('path');

// Load .env.test
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
