const mongoose = require('mongoose');

class GenericEntityHandler {
  async handle(schoolId, mappedModels, payload, template, entity) {
    const results = {};

    for (const [modelName, modelData] of Object.entries(mappedModels)) {
      const Model = mongoose.model(modelName);
      const dataToSave = { ...modelData, schoolId };

      let doc;
      if (payload._id) {
        doc = await Model.findByIdAndUpdate(payload._id, dataToSave, { new: true, runValidators: true });
        if (!doc) {
          doc = new Model(dataToSave);
          await doc.save();
        }
      } else {
        doc = new Model(dataToSave);
        await doc.save();
      }

      results[modelName] = doc;
    }

    return results;
  }
}

module.exports = new GenericEntityHandler();
