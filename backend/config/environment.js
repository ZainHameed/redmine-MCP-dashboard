/**
 * Environment Configuration and Validation
 * Validates required environment variables on startup
 */

require('dotenv').config();

const REDMINE_HOST = process.env.REDMINE_HOST;
const REDMINE_API_KEY = process.env.REDMINE_API_KEY;
const PORT = process.env.PORT || 3000;
const APP_VERSION = process.env.APP_VERSION || '1.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Validates that all required environment variables are set
 * Exits the process if any required variables are missing
 */
const validateEnvironment = () => {
  const missingVars = [];
  
  if (!REDMINE_HOST) {
    missingVars.push('REDMINE_HOST');
  }
  
  if (!REDMINE_API_KEY) {
    missingVars.push('REDMINE_API_KEY');
  }
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n📝 Please set these variables in your .env file');
    console.error('💡 Copy .env.template to .env and update with your values');
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated successfully');
};

module.exports = {
  REDMINE_HOST,
  REDMINE_API_KEY,
  PORT,
  APP_VERSION,
  NODE_ENV,
  validateEnvironment
};

