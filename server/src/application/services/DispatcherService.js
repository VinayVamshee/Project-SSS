const Template = require('../../domain/metadata/models/Template');
const EntityRegistry = require('../../domain/metadata/models/EntityRegistry');
const StorageMapper = require('./StorageMapper');

// Import handlers
const GenericEntityHandler = require('../handlers/GenericEntityHandler');
const StudentHandler = require('../handlers/StudentHandler');
const PaymentHandler = require('../handlers/PaymentHandler');
const FeeStructureHandler = require('../handlers/FeeStructureHandler');

const handlers = {
  'Generic': GenericEntityHandler,
  'Student': StudentHandler,
  'Payment': PaymentHandler,
  'FeeStructure': FeeStructureHandler
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

    console.log(`[Dispatcher] Mapping payload for ${entity.key}...`);

    // 2. Generic Storage Mapper: Convert payload keys to mapped Mongoose models
    const mappedModels = await StorageMapper.map(payload, entity.storage || []);

    console.log(`[Dispatcher] Invoking Business Handler: ${handlerName}`);

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
