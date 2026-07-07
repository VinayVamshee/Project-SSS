const tenantStorage = require('../../core/utils/tenantContext');
const School = require('../../domain/shared/models/School');

const tenantResolver = async (req, res, next) => {
  const host = req.headers.host || '';
  let slug = '';

  try {
    if (host.includes('.localhost') || host.includes('.schooltechnosolution.com')) {
      slug = host.split('.')[0];
    } else {
      let school = await School.findOne({ customDomain: host });
      if (!school) {
        const tenantHeader = req.headers['x-tenant-slug'];
        if (tenantHeader && tenantHeader.includes('.')) {
          school = await School.findOne({ customDomain: tenantHeader });
        }
      }

      if (school) {
        req.schoolId = school._id.toString();
        req.school = school;
        return tenantStorage.run({ schoolId: school._id.toString(), school }, () => {
          next();
        });
      }
      
      const tenantHeader = req.headers['x-tenant-slug'];
      if (tenantHeader) {
        slug = tenantHeader;
      }
    }

    let school = null;
    if (slug && slug !== 'www' && slug !== 'localhost') {
      school = await School.findOne({
        $or: [
          { slug },
          { slug: new RegExp('^' + slug + '-', 'i') }
        ]
      });
    }

    if (!school) {
      school = await School.findOne();
    }

    if (!school) {
      return res.status(404).json({ message: 'No school profile found in the database. Please run migrations.' });
    }

    req.schoolId = school._id.toString();
    req.school = school;

    tenantStorage.run({ schoolId: school._id.toString(), school }, () => {
      next();
    });
  } catch (err) {
    return res.status(500).json({ message: 'Tenant resolution failed', error: err.message });
  }
};

module.exports = tenantResolver;
