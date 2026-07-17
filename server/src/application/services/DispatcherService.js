const Template = require('../../domain/metadata/models/Template');
const StorageMapper = require('./StorageMapper');

// Import handlers
const GenericEntityHandler = require('../handlers/GenericEntityHandler');
const StudentHandler = require('../handlers/StudentHandler');
const PaymentHandler = require('../handlers/PaymentHandler');
const FeeStructureHandler = require('../handlers/FeeStructureHandler');
const AssessmentHandler = require('../handlers/AssessmentHandler');
const EmployeeHandler = require('../handlers/EmployeeHandler');
const PayrollHandler = require('../handlers/PayrollHandler');
const ExpenseHandler = require('../handlers/ExpenseHandler');

const handlers = {
  'Generic': GenericEntityHandler,
  'Student': StudentHandler,
  'Payment': PaymentHandler,
  'FeeStructure': FeeStructureHandler,
  'AssessmentHandler': AssessmentHandler,
  'Employee': EmployeeHandler,
  'Payroll': PayrollHandler,
  'Expense': ExpenseHandler
};

class DispatcherService {
  async dispatch(schoolId, templateId, payload) {
    // 1. Load Template & Entity
    const template = await Template.findById(templateId).populate('entity');
    if (!template) {
      throw new Error(`Template not found with ID ${templateId}`);
    }

    const entity = template.entity;
    if (!entity) {
      throw new Error(`Associated Entity registry not found for template ${templateId}`);
    }

    const handlerName = entity.handler || 'Generic';
    const handler = handlers[handlerName] || GenericEntityHandler;

    // 2. Generic Storage Mapper: Convert payload keys to mapped Mongoose models
    const mappedModels = await StorageMapper.map(payload, entity.storage || []);

    // 3. Invoke Business Handler with mapped model objects
    return await handler.handle(
      schoolId,
      mappedModels,
      payload,
      template,
      entity
    );
  }
}

module.exports = new DispatcherService();
