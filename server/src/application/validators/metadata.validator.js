exports.validateEntityInput = (req, res, next) => {
    const {
        key,
        label,
        collection,
        model
    } = req.body;

    if (!key || typeof key !== "string" || key.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Entity key is required."
        });
    }

    if (!label || typeof label !== "string" || label.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Entity label is required."
        });
    }

    if (!collection || typeof collection !== "string" || collection.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Collection name is required."
        });
    }

    if (!model || typeof model !== "string" || model.trim() === "") {
        return res.status(400).json({
            success: false,
            message: "Model name is required."
        });
    }

    next();
};

exports.validateFieldInput = (req, res, next) => {
  const { key, label, type } = req.body;
  if (!key || typeof key !== 'string' || key.trim() === '') {
    return res.status(400).json({ success: false, message: 'Field key is required.' });
  }
  if (!label || typeof label !== 'string' || label.trim() === '') {
    return res.status(400).json({ success: false, message: 'Field label is required.' });
  }
  if (!type || typeof type !== 'string' || type.trim() === '') {
    return res.status(400).json({ success: false, message: 'Field type is required.' });
  }
  next();
};

exports.validateTemplateInput = (req, res, next) => {
  const { key, label, entity, fields } = req.body;
  if (!key || typeof key !== 'string' || key.trim() === '') {
    return res.status(400).json({ success: false, message: 'Template key is required.' });
  }
  if (!label || typeof label !== 'string' || label.trim() === '') {
    return res.status(400).json({ success: false, message: 'Template label is required.' });
  }
  if (!entity || typeof entity !== 'string' || entity.trim() === '') {
    return res.status(400).json({ success: false, message: 'Template entity is required.' });
  }
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({ success: false, message: 'Template fields must be a non-empty array.' });
  }
  next();
};
