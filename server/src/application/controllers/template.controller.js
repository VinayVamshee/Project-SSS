const Template = require('../../domain/models/Template');

exports.getTemplate = async (req, res) => {
  try {
    const { entityType } = req.params;
    const template = await Template.findOne({ entity: entityType, status: 'active' })
      .populate('fields.fieldId')
      .lean();

    if (!template) {
      return res.status(404).json({ message: `Active template not found for ${entityType}` });
    }

    res.status(200).json(template);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving template', error: error.message });
  }
};

exports.saveTemplate = async (req, res) => {
  try {
    const { entity, label, fields, key } = req.body;
    let template = await Template.findOne({ entity, status: 'active' });

    if (template) {
      template.label = label || template.label;
      template.fields = fields || template.fields;
      template.key = key || template.key;
      await template.save();
    } else {
      template = new Template({
        entity,
        label,
        key: key || `tpl_${entity}_${Date.now()}`,
        fields: fields || [],
        status: 'active'
      });
      await template.save();
    }

    res.status(201).json({ message: 'Template saved successfully', template });
  } catch (error) {
    res.status(500).json({ message: 'Error saving template', error: error.message });
  }
};
