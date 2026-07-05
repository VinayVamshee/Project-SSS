require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./connectDB');
const mongoose = require('mongoose');
const tenantStorage = require('./utils/tenantContext');

// Register global Mongoose multi-tenant plugin before compiling schemas
mongoose.plugin((schema) => {
  const isSchoolSchema = schema.paths.slug && schema.paths.customDomain;
  // Global registries (e.g. PersonalInformationList) opt-out via isGlobalRegistry sentinel
  const isGlobalRegistry = !!schema.paths.isGlobalRegistry;

  if (isSchoolSchema || isGlobalRegistry) {
    return;
  }

  // 1. Inject schoolId path if not already defined
  if (!schema.paths.schoolId) {
    schema.add({
      schoolId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'School',
        required: true,
        index: true
      }
    });
  }

  // 2. Register multi-tenant scoping hooks
  const applyTenantFilter = function(next) {
    const store = tenantStorage.getStore();
    if (store && store.schoolId && !this.getOptions().bypassTenant) {
      this.where({ schoolId: store.schoolId });
    }
    next();
  };

  schema.pre('find', applyTenantFilter);
  schema.pre('findOne', applyTenantFilter);
  schema.pre('findOneAndUpdate', applyTenantFilter);
  schema.pre('updateMany', applyTenantFilter);
  schema.pre('countDocuments', applyTenantFilter);

  schema.pre('validate', function(next) {
    const store = tenantStorage.getStore();
    if (store && store.schoolId && !this.schoolId) {
      this.schoolId = store.schoolId;
    }
    next();
  });

  schema.pre('save', function(next) {
    const store = tenantStorage.getStore();
    if (store && store.schoolId && !this.schoolId) {
      this.schoolId = store.schoolId;
    }
    next();
  });
});


const allowedOrigins = [
  'https://sss-school-scholastic-system.vercel.app'
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    try {
      const url = new URL(origin);
      // Allow local development domains
      if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
        if (url.port === '3000' || !url.port) {
          return callback(null, true);
        }
      }
      // Allow production domain and all associated subdomains
      if (url.hostname === 'schooltechnosolution.com' || url.hostname.endsWith('.schooltechnosolution.com')) {
        return callback(null, true);
      }
    } catch (e) {
      // Invalid URL format
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json());

// Resolve tenant subdomain context globally
const tenantResolver = require('./middleware/tenantResolver');
app.use(tenantResolver);

// Routes Registration
app.use('/', require('./routers/auth.routes'));
app.use('/', require('./routers/student.routes'));
app.use('/', require('./routers/class.routes'));
app.use('/', require('./routers/payment.routes'));
app.use('/', require('./routers/question.routes'));
app.use('/', require('./routers/school.routes'));

const PORT = process.env.PORT || 3001;

const start = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`🚀 SSS V2 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("❌ Database connection failed:", error);
    }
};

start();