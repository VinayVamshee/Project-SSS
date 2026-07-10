import React, { useState, useEffect } from 'react';
import {
  getEntities, createEntity, archiveEntity, activateEntity, deleteEntity,
  getFieldDefinitions, addFieldDefinition, updateFieldDefinition, deleteFieldDefinition, archiveFieldDefinition, activateFieldDefinition,
  getTemplates, getTemplateForm, createTemplate, updateTemplate, publishTemplate, archiveTemplate, restoreTemplate, deleteTemplate, submitTemplateForm,
  getAllMasters, createMaster, deleteMaster, setMasterInUse,
  devGetUsers, devCreateUser, devUpdateUser, login
} from '../../API';
import DynamicForm from '../Shared/DynamicForm';
import Notification from '../Shared/Notification';
import LoadingIndicator from '../Shared/LoadingIndicator';
import ConfirmModal from '../Shared/ConfirmModal';
import './Developer.css';

export default function Developer() {
  const [activeTab, setActiveTab] = useState('entity_registry');
  const [notification, setNotification] = useState({ message: '', type: 'success' });
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Saving...');
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, type: 'primary' });

  const showNotification = (msg, type = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => {
      setNotification({ message: '', type: 'success' });
    }, 4000);
  };



  // 1. Entity Registry States
  const [entities, setEntities] = useState([]);
  const [newEntity, setNewEntity] = useState({
    key: '',
    label: '',
    description: '',
    collection: '',
    model: '',
    category: 'General',
    icon: '',
    color: '#6366f1',
    handler: 'Generic',
    storageRaw: '[]',
    allowTemplates: true,
    allowLookup: true,
    visibleInMenu: true,
    system: false,
    status: 'active'
  });
  const [selectedEntityForView, setSelectedEntityForView] = useState(null);

  // 2. Field Registry States
  const [fields, setFields] = useState([]);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [expandedFieldIds, setExpandedFieldIds] = useState({});
  const [newField, setNewField] = useState({
    key: '',
    label: '',
    description: '',
    category: 'General',
    type: 'text',
    options: [],
    lookup: {
      entity: '',
      displayField: {
        field: 'name',
        source: 'core',
        path: ''
      },
      valueField: '_id',
      multiple: false,
      searchable: true
    }
  });
  const [optionLabel, setOptionLabel] = useState('');
  const [optionValue, setOptionValue] = useState('');

  // 3. Templates States
  const [templates, setTemplates] = useState([]);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    key: '',
    label: '',
    description: '',
    entity: '',
    purpose: '',
    scope: 'global',
    schools: [],
    fields: []
  });
  const [editingTemplateFieldId, setEditingTemplateFieldId] = useState(null);
  const [fieldFilterText, setFieldFilterText] = useState('');

  // 4. Form Preview States
  const [previewTemplateId, setPreviewTemplateId] = useState('');
  const [previewForm, setPreviewForm] = useState(null);
  const [formSubmittedData, setFormSubmittedData] = useState(null);
  const [submitToBackend, setSubmitToBackend] = useState(false);
  const [backendResponse, setBackendResponse] = useState(null);

  // 5. School Tenants States (Empty inputs initial state)
  const [schools, setSchools] = useState([]);
  const [newSchool, setNewSchool] = useState({
    name: '',
    slug: '',
    customDomain: '',
    logoUrl: '',
    motto: '',
    backgroundImage: '',
    address: '',
    phoneNo: '',
    email: '',
    themeName: 'light',
    plan: 'basic',
    subscriptionStatus: 'active',
    questionPaperModule: true
  });

  // 6. User accounts states (Empty inputs)
  const [users, setUsers] = useState([]);
  const [selectedSchoolForUsers, setSelectedSchoolForUsers] = useState('');
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'viewer' });
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [editingUserId, setEditingUserId] = useState(null);
  const [editUserData, setEditUserData] = useState({ password: '', role: '' });

  // Loaders
  const loadEntities = async () => {
    try {
      const res = await getEntities();
      setEntities(res.data.data || []);
    } catch (e) {
      showNotification('Failed to load entities.', 'error');
    }
  };

  const loadFields = async () => {
    try {
      const res = await getFieldDefinitions();
      setFields(res.data.data || []);
    } catch (e) {
      showNotification('Failed to load fields.', 'error');
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await getTemplates();
      setTemplates(res.data.data || []);
    } catch (e) {
      showNotification('Failed to load templates.', 'error');
    }
  };

  const loadSchools = async () => {
    try {
      const res = await getAllMasters();
      setSchools(res.data || []);
      const currentActiveSlug = localStorage.getItem('schoolSlug');
      const activeSchool = res.data?.find(s => s.slug === currentActiveSlug);
      if (activeSchool) {
        setSelectedSchoolForUsers(activeSchool._id);
      } else if (res.data && res.data.length > 0 && !selectedSchoolForUsers) {
        setSelectedSchoolForUsers(res.data[0]._id);
      }
    } catch (e) {
      showNotification('Failed to load schools.', 'error');
    }
  };

  const loadUsers = async () => {
    if (!selectedSchoolForUsers) return;
    try {
      const res = await devGetUsers(selectedSchoolForUsers);
      setUsers(res.data || []);
    } catch (e) {
      showNotification('Failed to load users.', 'error');
    }
  };

  useEffect(() => {
    if (activeTab === 'entity_registry') loadEntities();
    if (activeTab === 'fields') loadFields();
    if (activeTab === 'templates') {
      loadTemplates();
      loadEntities();
      loadFields();
      loadSchools();
    }
    if (activeTab === 'preview') {
      loadTemplates();
    }
    if (activeTab === 'schools') loadSchools();
    if (activeTab === 'users') {
      loadSchools();
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedSchoolForUsers]);

  // Entity Handlers
  const handleCreateEntity = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage('Creating entity...');
    try {
      let parsedStorage = [];
      try {
        parsedStorage = JSON.parse(newEntity.storageRaw || '[]');
      } catch (jsonErr) {
        showNotification('Invalid JSON in Storage Configuration', 'error');
        setLoading(false);
        return;
      }

      await createEntity({
        ...newEntity,
        storage: parsedStorage
      });
      showNotification('Entity registered successfully!');
      setNewEntity({
        key: '',
        label: '',
        description: '',
        collection: '',
        model: '',
        category: 'General',
        icon: '',
        color: '#6366f1',
        handler: 'Generic',
        storageRaw: '[]',
        allowTemplates: true,
        allowLookup: true,
        visibleInMenu: true,
        system: false,
        status: 'active'
      });
      loadEntities();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to create entity', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveEntity = async (id) => {
    setLoading(true);
    setLoadingMessage('Archiving entity...');
    try {
      await archiveEntity(id);
      showNotification('Entity archived.');
      loadEntities();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to archive entity', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateEntity = async (id) => {
    setLoading(true);
    setLoadingMessage('Activating entity...');
    try {
      await activateEntity(id);
      showNotification('Entity activated.');
      loadEntities();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to activate entity', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntity = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Entity',
      message: 'Are you sure you want to delete this entity? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        setLoadingMessage('Deleting entity...');
        try {
          await deleteEntity(id);
          showNotification('Entity deleted.');
          loadEntities();
        } catch (err) {
          showNotification(err.response?.data?.message || 'Failed to delete entity', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Field Handlers
  const handleCreateField = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage(editingFieldId ? 'Updating field...' : 'Creating field...');
    try {
      const payload = {
        ...newField,
        fieldKey: newField.key,
        fieldName: newField.label,
        fieldType: newField.type,
        lookup: newField.type === 'lookup' ? newField.lookup : undefined
      };

      if (editingFieldId) {
        await updateFieldDefinition(editingFieldId, payload);
        showNotification('Field updated successfully!');
        setEditingFieldId(null);
      } else {
        await addFieldDefinition(payload);
        showNotification('Field created successfully!');
      }

      setNewField({
        key: '',
        label: '',
        description: '',
        category: 'General',
        type: 'text',
        options: [],
        lookup: {
          entity: '',
          displayField: {
            field: 'name',
            source: 'core',
            path: ''
          },
          valueField: '_id',
          multiple: false,
          searchable: true
        }
      });
      setOptionLabel('');
      setOptionValue('');
      loadFields();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save field', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditingField = (field) => {
    setEditingFieldId(field._id);

    let displayFieldObj = { field: 'name', source: 'core', path: '' };
    if (field.lookup?.displayField) {
      if (typeof field.lookup.displayField === 'string') {
        displayFieldObj.field = field.lookup.displayField;
      } else {
        displayFieldObj = {
          field: field.lookup.displayField.field || 'name',
          source: field.lookup.displayField.source || 'core',
          path: field.lookup.displayField.path || ''
        };
      }
    }

    setNewField({
      key: field.key || field.fieldKey || '',
      label: field.label || field.fieldName || '',
      description: field.description || '',
      category: field.category || 'General',
      type: field.type || field.fieldType || 'text',
      options: field.options || [],
      lookup: {
        entity: field.lookup?.entity?._id || field.lookup?.entity || '',
        displayField: displayFieldObj,
        valueField: field.lookup?.valueField || '_id',
        multiple: field.lookup?.multiple || false,
        searchable: field.lookup?.searchable !== undefined ? field.lookup.searchable : true
      }
    });
  };

  const handleAddFieldOption = () => {
    if (!optionLabel || !optionValue) return;
    setNewField({
      ...newField,
      options: [...newField.options, { label: optionLabel, value: optionValue }]
    });
    setOptionLabel('');
    setOptionValue('');
  };

  const handleRemoveFieldOption = (idx) => {
    setNewField({
      ...newField,
      options: newField.options.filter((_, i) => i !== idx)
    });
  };

  const handleArchiveField = async (id) => {
    setLoading(true);
    setLoadingMessage('Archiving field...');
    try {
      await archiveFieldDefinition(id);
      showNotification('Field archived.');
      loadFields();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to archive field', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateField = async (id) => {
    setLoading(true);
    setLoadingMessage('Activating field...');
    try {
      await activateFieldDefinition(id);
      showNotification('Field activated.');
      loadFields();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to activate field', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraftField = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Draft Field',
      message: 'Are you sure you want to delete this draft field? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        setLoadingMessage('Deleting field...');
        try {
          await deleteFieldDefinition(id);
          showNotification('Draft field deleted.');
          loadFields();
        } catch (err) {
          showNotification(err.response?.data?.message || 'Failed to delete field', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Template Handlers
  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage(editingTemplateId ? 'Updating template...' : 'Creating template...');
    try {
      if (editingTemplateId) {
        await updateTemplate(editingTemplateId, newTemplate);
        showNotification('Template updated successfully!');
        setEditingTemplateId(null);
      } else {
        await createTemplate(newTemplate);
        showNotification('Template created!');
      }

      setNewTemplate({
        key: '',
        label: '',
        description: '',
        entity: '',
        purpose: '',
        scope: 'global',
        schools: [],
        fields: []
      });
      loadTemplates();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to save template', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditingTemplate = (tpl) => {
    setEditingTemplateId(tpl._id);
    setNewTemplate({
      key: tpl.key || '',
      label: tpl.label || '',
      description: tpl.description || '',
      entity: tpl.entity?._id || tpl.entity || '',
      purpose: tpl.purpose || '',
      scope: tpl.scope || 'global',
      schools: tpl.schools || [],
      fields: (tpl.fields || []).map(tf => ({
        fieldId: tf.fieldId?._id || tf.fieldId || '',
        order: tf.order || 0,
        required: tf.required || false,
        unique: tf.unique || false,
        readOnly: tf.readOnly || tf.readonly || false,
        readonly: tf.readOnly || tf.readonly || false,
        hidden: tf.hidden || false,
        width: tf.width || 12,
        placeholder: tf.placeholder || '',
        helperText: tf.helperText || '',
        defaultValue: tf.defaultValue || '',
        validation: tf.validation || {
          min: undefined,
          max: undefined,
          minLength: undefined,
          maxLength: undefined,
          pattern: '',
          message: ''
        }
      }))
    });
  };

  const handlePublishTemplate = async (id) => {
    setLoading(true);
    setLoadingMessage('Publishing template...');
    try {
      await publishTemplate(id);
      showNotification('Template published!');
      loadTemplates();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to publish template', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveTemplate = async (id) => {
    setLoading(true);
    setLoadingMessage('Archiving template...');
    try {
      await archiveTemplate(id);
      showNotification('Template archived.');
      loadTemplates();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to archive template', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreTemplate = async (id) => {
    setLoading(true);
    setLoadingMessage('Restoring template...');
    try {
      await restoreTemplate(id);
      showNotification('Template restored to draft.');
      loadTemplates();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to restore template', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Template',
      message: 'Are you sure you want to delete this template? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        setLoadingMessage('Deleting template...');
        try {
          await deleteTemplate(id);
          showNotification('Template deleted.');
          loadTemplates();
        } catch (err) {
          showNotification(err.response?.data?.message || 'Failed to delete template', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // Preview Layout Form
  const handleLoadPreviewForm = async () => {
    if (!previewTemplateId) return;
    setLoading(true);
    setLoadingMessage('Rendering layout form...');
    try {
      const res = await getTemplateForm(previewTemplateId);
      setPreviewForm(res.data.data);
      setFormSubmittedData(null);
    } catch (err) {
      showNotification('Failed to load form blueprint', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewSubmit = async (formData) => {
    setFormSubmittedData(formData);
    if (submitToBackend) {
      setLoading(true);
      setLoadingMessage('Submitting to backend dispatcher...');
      try {
        const res = await submitTemplateForm(previewTemplateId, formData);
        setBackendResponse(res.data);
        showNotification('Form submitted to dispatcher successfully!');
      } catch (err) {
        showNotification(err.response?.data?.message || 'Failed to submit form', 'error');
        setBackendResponse(err.response?.data || { error: err.message });
      } finally {
        setLoading(false);
      }
    } else {
      setBackendResponse(null);
    }
  };


  // School Tenants Handlers
  const handleCreateSchool = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage('Provisioning school tenant...');
    try {
      const payload = {
        name: newSchool.name,
        slug: newSchool.slug,
        customDomain: newSchool.customDomain || undefined,
        logoUrl: newSchool.logoUrl || undefined,
        motto: newSchool.motto || undefined,
        backgroundImage: newSchool.backgroundImage || undefined,
        address: newSchool.address || undefined,
        phoneNo: newSchool.phoneNo,
        email: newSchool.email,
        theme: {
          themeName: newSchool.themeName
        },
        subscription: {
          plan: newSchool.plan,
          status: newSchool.subscriptionStatus
        },
        features: {
          questionPaperModule: newSchool.questionPaperModule
        }
      };

      await createMaster(payload);
      showNotification('School tenant provisioned successfully!');
      setNewSchool({
        name: '',
        slug: '',
        customDomain: '',
        logoUrl: '',
        motto: '',
        backgroundImage: '',
        address: '',
        phoneNo: '',
        email: '',
        themeName: 'light',
        plan: 'basic',
        subscriptionStatus: 'active',
        questionPaperModule: true
      });
      loadSchools();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to create school tenant.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveSchool = async (school) => {
    setLoading(true);
    setLoadingMessage('Switching school context...');
    try {
      await setMasterInUse(school._id);
      localStorage.setItem('schoolSlug', school.slug);
      showNotification(`Context switched to ${school.name} active view!`);
      loadSchools();
      window.location.reload();
    } catch (err) {
      showNotification('Failed to switch school context.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchool = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete School Tenant',
      message: 'Are you sure you want to delete this school tenant permanently? This action cannot be undone and deletes all associated configurations.',
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        setLoadingMessage('Deleting school tenant...');
        try {
          await deleteMaster(id);
          showNotification('School tenant deleted.');
          loadSchools();
        } catch (err) {
          showNotification('Failed to delete school tenant.', 'error');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // User accounts
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoadingMessage('Creating user account...');
    try {
      await devCreateUser({ ...newUser, schoolId: selectedSchoolForUsers });
      showNotification('User account created!');
      setNewUser({ username: '', password: '', role: 'viewer' });
      loadUsers();
    } catch (err) {
      showNotification(err.response?.data?.message || 'Failed to create user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditingUser = (user) => {
    setEditingUserId(user._id);
    setEditUserData({ password: user.password, role: user.role });
  };

  const handleSaveUserEdit = async (user) => {
    setLoading(true);
    setLoadingMessage('Updating user details...');
    try {
      await devUpdateUser(user._id, {
        username: user.username,
        password: editUserData.password,
        role: editUserData.role,
        schoolId: selectedSchoolForUsers
      });
      showNotification('User details updated successfully!');
      setEditingUserId(null);
      loadUsers();
    } catch (err) {
      showNotification('Failed to update user details.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleImpersonateUser = async (user) => {
    try {
      const res = await login({ username: user.username, password: user.password });
      const { token } = res.data;

      localStorage.setItem("originalIsDev", localStorage.getItem("isDev") || "true");
      localStorage.setItem("originalUserRole", localStorage.getItem("userRole") || "");
      localStorage.setItem("originalUserType", localStorage.getItem("userType") || "");

      localStorage.setItem("token", token);
      localStorage.setItem("isDev", "false");
      localStorage.setItem("userRole", user.role);
      localStorage.setItem("userType", user.role);
      localStorage.setItem("isImpersonating", "true");
      localStorage.setItem("impersonatedUsername", user.username);
      localStorage.setItem("impersonatedRole", user.role);

      alert(`Success! Logged in as ${user.username} (${user.role}). Redirecting...`);
      window.location.href = "/";
    } catch (err) {
      showNotification('Failed to impersonate user: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  return (
    <div className="developer-container" style={{ backgroundColor: 'var(--background-color)', color: 'var(--text-color)' }}>
      <Notification message={notification.message} type={notification.type} />

      {/* Tabs */}
      {/* Tabs */}
      <div className="tab-list-container overflow-auto">
        {[
          { key: 'entity_registry', label: 'Entity Registry', icon: 'fa-solid fa-list' },
          { key: 'fields', label: 'Field Registry', icon: 'fa-solid fa-database' },
          { key: 'templates', label: 'Templates', icon: 'fa-solid fa-file-invoice' },
          { key: 'preview', label: 'Form Preview', icon: 'fa-solid fa-eye' },
          { key: 'schools', label: 'School Tenants', icon: 'fa-solid fa-school' },
          { key: 'users', label: 'User Accounts', icon: 'fa-solid fa-users' }
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`tab-trigger ${activeTab === t.key ? 'active' : ''}`}
          >
            <i className={t.icon + ' me-2'}></i>{t.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Entity Registry */}
      {activeTab === 'entity_registry' && (
        <div>
          <h4 className="fw-bold mb-4"><i className="fa-solid fa-list me-2" style={{ color: 'var(--button-color)' }}></i>Entity Registry</h4>

          <div className="row g-4">
            {/* Left Side: Creation Form */}
            <div className="col-lg-4">
              <form onSubmit={handleCreateEntity} className="premium-card row g-3">
                <div className="col-12">
                  <label className="premium-label">Entity Key * (lowercase, e.g. student)</label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    placeholder="student"
                    value={newEntity.key}
                    onChange={e => setNewEntity({ ...newEntity, key: e.target.value.toLowerCase() })}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="premium-label">Friendly Label *</label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    placeholder="Student"
                    value={newEntity.label}
                    onChange={e => setNewEntity({ ...newEntity, label: e.target.value })}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="premium-label">Mongo Collection Name *</label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    placeholder="students"
                    value={newEntity.collection}
                    onChange={e => setNewEntity({ ...newEntity, collection: e.target.value })}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="premium-label">Mongoose Model Name *</label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    placeholder="Student"
                    value={newEntity.model}
                    onChange={e => setNewEntity({ ...newEntity, model: e.target.value })}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="premium-label">Description</label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    placeholder="Description of the entity's purpose"
                    value={newEntity.description}
                    onChange={e => setNewEntity({ ...newEntity, description: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="premium-label">Sidebar Grouping (Category)</label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    value={newEntity.category}
                    onChange={e => setNewEntity({ ...newEntity, category: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="premium-label">Backend Handler *</label>
                  <select
                    className="form-select premium-input"
                    value={newEntity.handler}
                    onChange={e => setNewEntity({ ...newEntity, handler: e.target.value })}
                    required
                  >
                    <option value="Generic">Generic</option>
                    <option value="Student">Student</option>
                    <option value="Employee">Employee</option>
                    <option value="Payment">Payment</option>
                    <option value="FeeStructure">FeeStructure</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="premium-label">Storage Mapping Configuration (JSON Array)</label>
                  <textarea
                    className="form-control premium-input font-monospace"
                    rows="5"
                    placeholder={`[
  {
    "model": "StudentEnrollment",
    "fields": {
      "class": "classId",
      "roll_number": "rollNumber"
    },
    "dynamicFieldContainer": "dynamicFields"
  }
]`}
                    value={newEntity.storageRaw}
                    onChange={e => setNewEntity({ ...newEntity, storageRaw: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="premium-label">UI Icon & Color</label>
                  <div className="d-flex gap-2">
                    <input
                      type="text"
                      className="form-control premium-input"
                      placeholder="fa-user"
                      value={newEntity.icon}
                      onChange={e => setNewEntity({ ...newEntity, icon: e.target.value })}
                    />
                    <input
                      type="color"
                      className="form-control form-control-color premium-input"
                      style={{ width: '60px' }}
                      value={newEntity.color}
                      onChange={e => setNewEntity({ ...newEntity, color: e.target.value })}
                    />
                  </div>
                </div>

                <div className="col-12">
                  <div className="form-check form-switch pt-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={newEntity.allowTemplates}
                      onChange={e => setNewEntity({ ...newEntity, allowTemplates: e.target.checked })}
                    />
                    <span className="small text-muted fw-semibold ms-1">Allow Templates</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="form-check form-switch">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={newEntity.allowLookup}
                      onChange={e => setNewEntity({ ...newEntity, allowLookup: e.target.checked })}
                    />
                    <span className="small text-muted fw-semibold ms-1">Allow Lookup</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="form-check form-switch">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={newEntity.visibleInMenu}
                      onChange={e => setNewEntity({ ...newEntity, visibleInMenu: e.target.checked })}
                    />
                    <span className="small text-muted fw-semibold ms-1">Visible In Menu</span>
                  </div>
                </div>
                <div className="col-12">
                  <div className="form-check form-switch">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={newEntity.system}
                      onChange={e => setNewEntity({ ...newEntity, system: e.target.checked })}
                    />
                    <span className="small text-muted fw-semibold ms-1 text-danger">System Core</span>
                  </div>
                </div>

                <div className="col-12 d-flex justify-content-end pt-2">
                  <button type="submit" className="btn px-5 py-2 fw-bold text-white w-100" style={{ backgroundColor: 'var(--button-color)', border: 'none' }}><i className="fa-solid fa-plus me-1"></i>Add Entity</button>
                </div>
              </form>
            </div>

            {/* Right Side: Registered Entities Catalog */}
            <div className="col-lg-8">
              <div className="premium-card">
                <h5 className="fw-bold mb-3"><i className="fa-solid fa-list-check me-2"></i>Registered Entities Catalog</h5>
                <div className="table-responsive">
                  <table className="table align-middle table-hover">
                    <thead>
                      <tr className="table-light">
                        <th>Key / Model</th>
                        <th>Friendly Label</th>
                        <th>Collection</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entities.map(ent => (
                        <tr key={ent._id}>
                          <td>
                            <div className="d-flex align-items-center">
                              <span className="badge p-2 rounded-circle me-2" style={{ backgroundColor: ent.color || 'var(--button-color)', color: '#fff' }}>
                                <i className={`fa-solid ${ent.icon || 'fa-cubes'}`}></i>
                              </span>
                              <div>
                                <strong className="d-block">{ent.key}</strong>
                                <span className="text-muted small">{ent.model}</span>
                              </div>
                            </div>
                          </td>
                          <td>{ent.label}</td>
                          <td><code>{ent.collection}</code></td>
                          <td><span className="status-pill draft">{ent.category}</span></td>
                          <td>
                            <span className={`status-pill ${ent.status || 'active'}`}>
                              {ent.status}
                            </span>
                          </td>
                          <td className="text-end">
                            <button onClick={() => setSelectedEntityForView(ent)} className="btn-action-edit me-2"><i className="fa-solid fa-eye me-1"></i>View</button>
                            {ent.status === 'active' ? (
                              <button onClick={() => handleArchiveEntity(ent._id)} className="btn-action-warning me-2"><i className="fa-solid fa-box-archive me-1"></i>Archive</button>
                            ) : (
                              <button onClick={() => handleActivateEntity(ent._id)} className="btn-action-success me-2"><i className="fa-solid fa-circle-check me-1"></i>Activate</button>
                            )}
                            <button onClick={() => handleDeleteEntity(ent._id)} className="btn-action-delete"><i className="fa-solid fa-trash me-1"></i>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Field Registry */}
      {activeTab === 'fields' && (
        <div>

          <div className="row g-4">
            {/* Left Side: Form */}
            <div className="col-lg-4">
              <form onSubmit={handleCreateField} className="premium-card row g-3">
                <div className="col-12">
                  <label className="premium-label">Machine Key Name *</label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    placeholder="mother_name"
                    value={newField.key}
                    onChange={e => setNewField({ ...newField, key: e.target.value })}
                    required
                    disabled={!!editingFieldId}
                  />
                </div>
                <div className="col-12">
                  <label className="premium-label">Label Name *</label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    placeholder="Mother Name"
                    value={newField.label}
                    onChange={e => setNewField({ ...newField, label: e.target.value })}
                    required
                  />
                </div>
                <div className="col-12">
                  <label className="premium-label">Input UI Type *</label>
                  <select
                    className="form-select premium-input"
                    value={newField.type}
                    onChange={e => setNewField({ ...newField, type: e.target.value })}
                    required
                  >
                    {["text", "textarea", "number", "currency", "date", "datetime", "time", "email", "phone", "password", "checkbox", "switch", "radio", "select", "multiselect", "lookup", "file", "image"].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="premium-label">Category</label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    value={newField.category}
                    onChange={e => setNewField({ ...newField, category: e.target.value })}
                  />
                </div>
                <div className="col-12">
                  <label className="premium-label">Description</label>
                  <input
                    type="text"
                    className="form-control premium-input"
                    value={newField.description}
                    onChange={e => setNewField({ ...newField, description: e.target.value })}
                  />
                </div>
                {/* Lookup Configuration */}
                {newField.type === 'lookup' && (
                  <div className="col-12 border-top pt-2">
                    <h6 className="small fw-bold text-muted mb-2">Lookup Configuration</h6>
                    <div className="row g-2">
                      <div className="col-12">
                        <label className="premium-label">Target Entity *</label>
                        <select
                          className="form-select premium-input"
                          value={newField.lookup?.entity || ''}
                          onChange={e => setNewField({ ...newField, lookup: { ...newField.lookup, entity: e.target.value } })}
                          required
                        >
                          <option value="">-- Choose Target --</option>
                          {entities.map(ent => (
                            <option key={ent._id} value={ent._id}>{ent.label || ent.key}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-12">
                        <label className="premium-label">Display Field Key *</label>
                        <input
                          type="text"
                          className="form-control premium-input"
                          value={newField.lookup?.displayField?.field || ''}
                          onChange={e => setNewField({
                            ...newField,
                            lookup: {
                              ...newField.lookup,
                              displayField: {
                                ...(newField.lookup?.displayField || {}),
                                field: e.target.value
                              }
                            }
                          })}
                          required
                        />
                      </div>
                      <div className="col-6">
                        <label className="premium-label">Display Source *</label>
                        <select
                          className="form-select premium-input"
                          value={newField.lookup?.displayField?.source || 'core'}
                          onChange={e => setNewField({
                            ...newField,
                            lookup: {
                              ...newField.lookup,
                              displayField: {
                                ...(newField.lookup?.displayField || {}),
                                source: e.target.value
                              }
                            }
                          })}
                          required
                        >
                          <option value="core">Core Property</option>
                          <option value="dynamic">Dynamic Field</option>
                          <option value="nested">Nested Path</option>
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="premium-label">Path (if Nested)</label>
                        <input
                          type="text"
                          className="form-control premium-input"
                          placeholder="e.g. academic.section"
                          value={newField.lookup?.displayField?.path || ''}
                          onChange={e => setNewField({
                            ...newField,
                            lookup: {
                              ...newField.lookup,
                              displayField: {
                                ...(newField.lookup?.displayField || {}),
                                path: e.target.value
                              }
                            }
                          })}
                        />
                      </div>
                      <div className="col-12">
                        <label className="premium-label">Value Field *</label>
                        <input
                          type="text"
                          className="form-control premium-input"
                          value={newField.lookup?.valueField || '_id'}
                          onChange={e => setNewField({ ...newField, lookup: { ...newField.lookup, valueField: e.target.value } })}
                          required
                        />
                      </div>
                      <div className="col-6">
                        <div className="form-check pt-1">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={!!newField.lookup?.multiple}
                            onChange={e => setNewField({ ...newField, lookup: { ...newField.lookup, multiple: e.target.checked } })}
                          />
                          <span className="small text-muted ms-1">Allow Multiple</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="form-check pt-1">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={newField.lookup?.searchable !== false}
                            onChange={e => setNewField({ ...newField, lookup: { ...newField.lookup, searchable: e.target.checked } })}
                          />
                          <span className="small text-muted ms-1">Searchable</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Picklist Option Manager */}
                {['select', 'multiselect', 'radio'].includes(newField.type) && (
                  <div className="col-12 border-top pt-2">
                    <h6 className="small fw-bold text-muted mb-2">Picklist Options</h6>
                    <div className="row g-1 align-items-end mb-2">
                      <div className="col-6">
                        <input
                          type="text"
                          placeholder="Label (e.g. Yes)"
                          className="form-control form-control-sm premium-input"
                          value={optionLabel}
                          onChange={e => setOptionLabel(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <input
                          type="text"
                          placeholder="Value (e.g. Y)"
                          className="form-control form-control-sm premium-input"
                          value={optionValue}
                          onChange={e => setOptionValue(e.target.value)}
                        />
                      </div>
                    </div>
                    <button type="button" onClick={handleAddFieldOption} className="btn btn-sm btn-outline-secondary w-100 py-1 mb-2"><i className="fa-solid fa-plus me-1"></i>Add Option</button>
                    <div className="d-flex flex-wrap gap-1">
                      {newField.options.map((opt, idx) => (
                        <span key={idx} className="badge bg-light text-dark border p-1 d-flex align-items-center gap-1 small">
                          {opt.label} ({opt.value})
                          <i onClick={() => handleRemoveFieldOption(idx)} className="fa-solid fa-xmark text-danger cursor-pointer ms-1"></i>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="col-12 d-flex justify-content-end gap-2 pt-2 border-top">
                  {editingFieldId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFieldId(null);
                        setNewField({
                          key: '',
                          label: '',
                          description: '',
                          category: 'General',
                          type: 'text',
                          placeholder: '',
                          helperText: '',
                          required: false,
                          unique: false,
                          min: '',
                          max: '',
                          minLength: '',
                          maxLength: '',
                          validationPattern: '',
                          validationMessage: '',
                          defaultValue: '',
                          options: [],
                          lookup: {
                            entity: '',
                            displayField: 'name',
                            valueField: '_id',
                            multiple: false,
                            searchable: true
                          },
                          ui: {
                            icon: '',
                            color: '',
                            width: 12
                          }
                        });
                      }}
                      className="btn btn-outline-secondary px-3 py-2 fw-semibold"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="btn px-4 py-2 fw-bold text-white w-100"
                    style={{ backgroundColor: 'var(--button-color)', border: 'none' }}
                  >
                    {editingFieldId ? 'Save Changes' : 'Create Field'}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Side: Fields Catalog */}
            <div className="col-lg-8">
              <div className="premium-card">
                <h5 className="fw-bold mb-3"><i className="fa-solid fa-list-check me-2"></i>Global Inputs Catalog</h5>

                <div className="table-responsive">
                  <table className="table align-middle table-hover">
                    <thead>
                      <tr className="table-light">
                        <th style={{ width: '40px' }}></th>
                        <th>Key</th>
                        <th>Label</th>
                        <th>Type</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map(f => {
                        const isExpanded = !!expandedFieldIds[f._id];
                        return (
                          <React.Fragment key={f._id}>
                            <tr>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => setExpandedFieldIds(prev => ({ ...prev, [f._id]: !prev[f._id] }))}
                                  className="btn btn-xs btn-light border py-1 px-2"
                                >
                                  <i className={`fa-solid ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'}`}></i>
                                </button>
                              </td>
                              <td className="fw-bold">{f.key}</td>
                              <td>{f.label}</td>
                              <td><span className="badge bg-light text-dark border">{f.type}</span></td>
                              <td>{f.category || 'General'}</td>
                              <td><span className={`status-pill ${f.status}`}>{f.status}</span></td>
                              <td className="text-end">
                                <button onClick={() => handleStartEditingField(f)} className="btn-action-edit me-2"><i className="fa-solid fa-pen me-1"></i>Edit</button>
                                {f.status === 'draft' && (
                                  <>
                                    <button onClick={() => handleActivateField(f._id)} className="btn-action-success me-2"><i className="fa-solid fa-check me-1"></i>Publish</button>
                                    <button onClick={() => handleDeleteDraftField(f._id)} className="btn-action-delete"><i className="fa-solid fa-trash me-1"></i>Delete</button>
                                  </>
                                )}
                                {f.status === 'active' && (
                                  <button onClick={() => handleArchiveField(f._id)} className="btn-action-warning"><i className="fa-solid fa-box-archive me-1"></i>Archive</button>
                                )}
                                {f.status === 'archived' && (
                                  <button onClick={() => handleActivateField(f._id)} className="btn-action-success"><i className="fa-solid fa-box-open me-1"></i>Activate</button>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-light">
                                <td colSpan="7" className="p-3">
                                  <div className="card p-3 shadow-sm border-0" style={{ backgroundColor: '#fafafa', borderRadius: '6px' }}>
                                    <h6 className="fw-bold mb-3 text-muted"><i className="fa-solid fa-circle-info me-2 text-primary"></i>Advanced Field Definition Details</h6>
                                    <div className="row g-3 small text-dark">
                                      <div className="col-md-4">
                                        <strong>Category:</strong> <span className="text-muted d-block">{f.category || 'General'}</span>
                                      </div>
                                      <div className="col-md-8">
                                        <strong>Description:</strong> <span className="text-muted d-block">{f.description || 'No description provided.'}</span>
                                      </div>
                                      {f.lookup && (f.lookup.entity || f.lookup.displayField) && (
                                        <div className="col-md-12 border-top pt-2">
                                          <strong>Lookup Configuration:</strong>
                                          <div className="pt-1 small text-muted">
                                            Entity ID: <code>{f.lookup.entity?._id || f.lookup.entity}</code>
                                            {f.lookup.entity?.label && <span> ({f.lookup.entity.label})</span>}
                                            <br />
                                            Display Field: <code>{typeof f.lookup.displayField === 'object' ? f.lookup.displayField?.field : f.lookup.displayField}</code> (Source: <code>{f.lookup.displayField?.source || 'core'}</code> {f.lookup.displayField?.path && <span>, Path: <code>{f.lookup.displayField.path}</code></span>})
                                            <br />
                                            Value Field: <code>{f.lookup.valueField}</code>
                                            <br />
                                            Flags: Multiple ({f.lookup.multiple ? 'Yes' : 'No'}) | Searchable ({f.lookup.searchable ? 'Yes' : 'No'})
                                          </div>
                                        </div>
                                      )}
                                      {f.options && f.options.length > 0 && (
                                        <div className="col-12 border-top pt-2">
                                          <strong>Picklist Configured Options:</strong>
                                          <div className="d-flex flex-wrap gap-1 pt-1">
                                            {f.options.map((o, idx) => (
                                              <span key={idx} className="badge bg-white text-dark border">
                                                {o.label} (<code>{o.value}</code>)
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Templates */}
      {activeTab === 'templates' && (
        <div className="">
          <form onSubmit={handleCreateTemplate} className="premium-card row g-3 mb-5">
            <h5 className="fw-bold text-muted mb-2">{editingTemplateId ? 'Edit Layout Template' : 'Build Layout Template'}</h5>
            <div className="col-md-3 ">
              <label className="premium-label">Template Unique Key *</label>
              <input
                type="text"
                className="form-control premium-input"
                placeholder="tpl_student_admission"
                value={newTemplate.key}
                onChange={e => setNewTemplate({ ...newTemplate, key: e.target.value })}
                required
                disabled={!!editingTemplateId}
              />
            </div>
            <div className="col-md-3">
              <label className="premium-label">Friendly Title *</label>
              <input
                type="text"
                className="form-control premium-input"
                placeholder="Student Admission Form"
                value={newTemplate.label}
                onChange={e => setNewTemplate({ ...newTemplate, label: e.target.value })}
                required
              />
            </div>
            <div className="col-md-3">
              <label className="premium-label">Target Module Entity *</label>
              <select
                className="form-select premium-input"
                value={newTemplate.entity}
                onChange={e => setNewTemplate({ ...newTemplate, entity: e.target.value })}
                required
              >
                <option value="">-- Choose Target Entity --</option>
                {entities.map(ent => (
                  <option key={ent._id} value={ent._id}>{ent.label || ent.key}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="premium-label">Template Purpose *</label>
              <select
                className="form-select premium-input"
                value={newTemplate.purpose}
                onChange={e => setNewTemplate({ ...newTemplate, purpose: e.target.value })}
                required
              >
                <option value="">-- Choose Purpose --</option>
                <option value="student_registration">Student Registration</option>
                <option value="student_promotion">Student Promotion</option>
                <option value="student_transfer">Student Transfer</option>
                <option value="student_tc">Student TC</option>
                <option value="student_import">Student Import</option>
                <option value="fee_structure">Fee Structure</option>
                <option value="student_fee_payment">Student Fee Payment</option>
                <option value="employee_registration">Employee Registration</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="premium-label">Scope Scope</label>
              <select
                className="form-select premium-input"
                value={newTemplate.scope}
                onChange={e => setNewTemplate({ ...newTemplate, scope: e.target.value, schools: e.target.value === 'global' ? [] : newTemplate.schools })}
              >
                <option value="global">Global (All Tenants)</option>
                <option value="selectedSchools">Selected Schools Only</option>
              </select>
            </div>
            <div className="col-md-12">
              <label className="premium-label">Description</label>
              <input
                type="text"
                className="form-control premium-input"
                placeholder="Brief description of the template"
                value={newTemplate.description}
                onChange={e => setNewTemplate({ ...newTemplate, description: e.target.value })}
              />
            </div>

            {newTemplate.scope === 'selectedSchools' && (
              <div className="col-12 bg-white p-3 rounded border">
                <label className="premium-label">Choose Schools</label>
                <div className="row g-2">
                  {schools.map(s => {
                    const isChecked = newTemplate.schools.includes(s._id);
                    return (
                      <div key={s._id} className="col-md-4">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isChecked}
                            onChange={e => {
                              if (e.target.checked) {
                                setNewTemplate({ ...newTemplate, schools: [...newTemplate.schools, s._id] });
                              } else {
                                setNewTemplate({ ...newTemplate, schools: newTemplate.schools.filter(id => id !== s._id) });
                              }
                            }}
                          />
                          <label className="form-check-label small ms-1">{s.name}</label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="col-12 border-top pt-4">
              <label className="premium-label fs-5 mb-3"><i className="fa-solid fa-gears me-2 text-primary"></i>Layout Fields Canvas & Configuration Workspace</label>

              <div className="row g-4">
                {/* Left Side: Available Fields Library */}
                <div className="col-lg-4">
                  <div className="card shadow-sm border p-3 bg-light" style={{ borderRadius: '8px' }}>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <h6 className="fw-bold mb-0 text-muted"><i className="fa-solid fa-folder-open me-2"></i>Inputs Library</h6>
                      <span className="badge bg-secondary">{fields.length} available</span>
                    </div>
                    <input
                      type="text"
                      className="form-control form-control-sm mb-3"
                      placeholder="Search inputs library by name or key..."
                      value={fieldFilterText}
                      onChange={e => setFieldFilterText(e.target.value)}
                    />

                    <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                      {fields.filter(f =>
                        f.label.toLowerCase().includes(fieldFilterText.toLowerCase()) ||
                        f.key.toLowerCase().includes(fieldFilterText.toLowerCase())
                      ).map(f => {
                        const isSelected = newTemplate.fields.some(tf => tf.fieldId === f._id);
                        return (
                          <div key={f._id} className="d-flex align-items-center justify-content-between p-2 mb-2 bg-white rounded border border-light shadow-xs hover-bg-light transition-02">
                            <div className="overflow-hidden me-2">
                              <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.85rem' }}>{f.label}</div>
                              <div className="text-muted text-truncate" style={{ fontSize: '0.72rem', fontFamily: 'monospace' }}>{f.key}</div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <span className="badge bg-light text-dark border small" style={{ fontSize: '10px' }}>{f.type}</span>
                              {isSelected ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewTemplate({
                                      ...newTemplate,
                                      fields: newTemplate.fields.filter(tf => tf.fieldId !== f._id)
                                    });
                                  }}
                                  className="btn btn-xs btn-outline-danger py-1 px-2"
                                  title="Remove from layout"
                                  style={{ fontSize: '10px' }}
                                >
                                  <i className="fa-solid fa-minus"></i>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextOrder = newTemplate.fields.length + 1;
                                    setNewTemplate({
                                      ...newTemplate,
                                      fields: [...newTemplate.fields, {
                                        fieldId: f._id,
                                        order: nextOrder,
                                        required: false,
                                        unique: false,
                                        readOnly: false,
                                        hidden: false,
                                        width: 12,
                                        placeholder: '',
                                        helperText: '',
                                        defaultValue: '',
                                        validation: {
                                          min: undefined,
                                          max: undefined,
                                          minLength: undefined,
                                          maxLength: undefined,
                                          pattern: '',
                                          message: ''
                                        }
                                      }]
                                    });
                                  }}
                                  className="btn btn-xs btn-outline-primary py-1 px-2"
                                  title="Add to layout"
                                  style={{ fontSize: '10px' }}
                                >
                                  <i className="fa-solid fa-plus"></i>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Side: Configured Layout Canvas */}
                <div className="col-lg-8">
                  <div className="card shadow-sm border p-3 bg-white" style={{ borderRadius: '8px', minHeight: '400px' }}>
                    <h6 className="fw-bold text-muted mb-3"><i className="fa-solid fa-list-check me-2"></i>Active Form Layout Canvas ({newTemplate.fields.length} elements selected)</h6>

                    {newTemplate.fields.length === 0 ? (
                      <div className="d-flex flex-column align-items-center justify-content-center text-muted" style={{ height: '300px' }}>
                        <i className="fa-solid fa-arrows-to-dot fa-3x mb-3 text-secondary"></i>
                        <p className="fw-semibold">No elements selected yet</p>
                        <p className="small text-center px-4" style={{ maxWidth: '300px' }}>Click the <span className="text-primary fw-bold">[+] Add</span> buttons in the library on the left to add fields to this form blueprint.</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table align-middle table-sm" style={{ fontSize: '12px' }}>
                          <thead>
                            <tr className="table-light">
                              <th style={{ width: '80px' }}>Order</th>
                              <th>Field Label</th>
                              <th>Input Type</th>
                              <th className="text-center" style={{ width: '85px' }}>Width</th>
                              <th className="text-center" style={{ width: '70px' }}>Req</th>
                              <th className="text-center" style={{ width: '70px' }}>Hide</th>
                              <th className="text-center" style={{ width: '70px' }}>Read</th>
                              <th className="text-end" style={{ width: '120px' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {newTemplate.fields
                              .map(tf => {
                                const fObj = fields.find(f => f._id === tf.fieldId);
                                return { ...tf, fObj };
                              })
                              .filter(item => !!item.fObj)
                              .sort((a, b) => a.order - b.order)
                              .map((tf, index, arr) => {
                                return (
                                  <React.Fragment key={tf.fieldId}>
                                    <tr>
                                      <td>
                                        <input
                                          type="number"
                                          className="form-control form-control-sm text-center py-0 px-1"
                                          value={tf.order}
                                          style={{ height: '24px', fontSize: '11px' }}
                                          onChange={e => {
                                            const val = parseInt(e.target.value) || 0;
                                            const updated = newTemplate.fields.map(item =>
                                              item.fieldId === tf.fieldId ? { ...item, order: val } : item
                                            );
                                            setNewTemplate({ ...newTemplate, fields: updated });
                                          }}
                                        />
                                      </td>
                                      <td>
                                        <span className="fw-bold text-dark">{tf.fObj.label}</span>
                                        <span className="text-muted d-block font-monospace" style={{ fontSize: '9px' }}>{tf.fObj.key}</span>
                                      </td>
                                      <td>
                                        <span className="badge bg-light text-dark border">{tf.fObj.type}</span>
                                      </td>
                                      <td>
                                        <select
                                          className="form-select form-select-sm py-0 px-1 text-center"
                                          value={tf.width || 12}
                                          style={{ height: '24px', fontSize: '11px', minWidth: '75px' }}
                                          onChange={e => {
                                            const val = parseInt(e.target.value) || 12;
                                            const updated = newTemplate.fields.map(item =>
                                              item.fieldId === tf.fieldId ? { ...item, width: val } : item
                                            );
                                            setNewTemplate({ ...newTemplate, fields: updated });
                                          }}
                                        >
                                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(w => (
                                            <option key={w} value={w}>Col-{w}</option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="text-center">
                                        <input
                                          type="checkbox"
                                          className="form-check-input"
                                          checked={tf.required || false}
                                          onChange={e => {
                                            const updated = newTemplate.fields.map(item =>
                                              item.fieldId === tf.fieldId ? { ...item, required: e.target.checked } : item
                                            );
                                            setNewTemplate({ ...newTemplate, fields: updated });
                                          }}
                                        />
                                      </td>
                                      <td className="text-center">
                                        <input
                                          type="checkbox"
                                          className="form-check-input"
                                          checked={tf.hidden || false}
                                          onChange={e => {
                                            const updated = newTemplate.fields.map(item =>
                                              item.fieldId === tf.fieldId ? { ...item, hidden: e.target.checked } : item
                                            );
                                            setNewTemplate({ ...newTemplate, fields: updated });
                                          }}
                                        />
                                      </td>
                                      <td className="text-center">
                                        <input
                                          type="checkbox"
                                          className="form-check-input"
                                          checked={tf.readOnly || tf.readonly || false}
                                          onChange={e => {
                                            const updated = newTemplate.fields.map(item =>
                                              item.fieldId === tf.fieldId ? { ...item, readOnly: e.target.checked, readonly: e.target.checked } : item
                                            );
                                            setNewTemplate({ ...newTemplate, fields: updated });
                                          }}
                                        />
                                      </td>
                                      <td className="text-end">
                                        <div className="btn-group btn-group-sm">
                                          <button
                                            type="button"
                                            onClick={() => setEditingTemplateFieldId(editingTemplateFieldId === tf.fieldId ? null : tf.fieldId)}
                                            className={`btn btn-xs ${editingTemplateFieldId === tf.fieldId ? 'btn-primary text-white' : 'btn-outline-primary'} py-0 px-2`}
                                            title="Configure Properties"
                                          >
                                            <i className="fa-solid fa-cog"></i>
                                          </button>
                                          <button
                                            type="button"
                                            disabled={index === 0}
                                            onClick={() => {
                                              const prevItem = arr[index - 1];
                                              const updated = newTemplate.fields.map(item => {
                                                if (item.fieldId === tf.fieldId) return { ...item, order: prevItem.order };
                                                if (item.fieldId === prevItem.fieldId) return { ...item, order: tf.order };
                                                return item;
                                              });
                                              setNewTemplate({ ...newTemplate, fields: updated });
                                            }}
                                            className="btn btn-xs btn-outline-secondary py-0 px-2"
                                            title="Move Up"
                                          >
                                            <i className="fa-solid fa-arrow-up"></i>
                                          </button>
                                          <button
                                            type="button"
                                            disabled={index === arr.length - 1}
                                            onClick={() => {
                                              const nextItem = arr[index + 1];
                                              const updated = newTemplate.fields.map(item => {
                                                if (item.fieldId === tf.fieldId) return { ...item, order: nextItem.order };
                                                if (item.fieldId === nextItem.fieldId) return { ...item, order: tf.order };
                                                return item;
                                              });
                                              setNewTemplate({ ...newTemplate, fields: updated });
                                            }}
                                            className="btn btn-xs btn-outline-secondary py-0 px-2"
                                            title="Move Down"
                                          >
                                            <i className="fa-solid fa-arrow-down"></i>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setNewTemplate({
                                                ...newTemplate,
                                                fields: newTemplate.fields.filter(item => item.fieldId !== tf.fieldId)
                                              });
                                            }}
                                            className="btn btn-xs btn-outline-danger py-0 px-2"
                                            title="Remove Field"
                                          >
                                            <i className="fa-solid fa-trash"></i>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>

                                    {editingTemplateFieldId === tf.fieldId && (
                                      <tr>
                                        <td colSpan="8" className="bg-light p-3 border-bottom">
                                          <div className="card shadow-xs border p-3 bg-white">
                                            <h6 className="fw-bold mb-3 text-primary"><i className="fa-solid fa-sliders me-2"></i>Configure Overrides for "{tf.fObj.label}"</h6>
                                            <div className="row g-2">
                                              <div className="col-md-4">
                                                <label className="premium-label">Placeholder</label>
                                                <input
                                                  type="text"
                                                  className="form-control form-control-sm premium-input"
                                                  value={tf.placeholder || ''}
                                                  onChange={e => {
                                                    const updated = newTemplate.fields.map(item =>
                                                      item.fieldId === tf.fieldId ? { ...item, placeholder: e.target.value } : item
                                                    );
                                                    setNewTemplate({ ...newTemplate, fields: updated });
                                                  }}
                                                />
                                              </div>
                                              <div className="col-md-4">
                                                <label className="premium-label">Helper Text</label>
                                                <input
                                                  type="text"
                                                  className="form-control form-control-sm premium-input"
                                                  value={tf.helperText || ''}
                                                  onChange={e => {
                                                    const updated = newTemplate.fields.map(item =>
                                                      item.fieldId === tf.fieldId ? { ...item, helperText: e.target.value } : item
                                                    );
                                                    setNewTemplate({ ...newTemplate, fields: updated });
                                                  }}
                                                />
                                              </div>
                                              <div className="col-md-4">
                                                <label className="premium-label">Default Value</label>
                                                <input
                                                  type="text"
                                                  className="form-control form-control-sm premium-input"
                                                  value={tf.defaultValue !== undefined && tf.defaultValue !== null ? String(tf.defaultValue) : ''}
                                                  onChange={e => {
                                                    const updated = newTemplate.fields.map(item =>
                                                      item.fieldId === tf.fieldId ? { ...item, defaultValue: e.target.value } : item
                                                    );
                                                    setNewTemplate({ ...newTemplate, fields: updated });
                                                  }}
                                                />
                                              </div>

                                              <div className="col-md-4">
                                                <div className="form-check pt-3">
                                                  <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    checked={!!tf.unique}
                                                    onChange={e => {
                                                      const updated = newTemplate.fields.map(item =>
                                                        item.fieldId === tf.fieldId ? { ...item, unique: e.target.checked } : item
                                                      );
                                                      setNewTemplate({ ...newTemplate, fields: updated });
                                                    }}
                                                  />
                                                  <span className="small text-muted ms-1">Enforce Unique Check</span>
                                                </div>
                                              </div>

                                              {/* Validations Sub-block */}
                                              <div className="col-12 border-top mt-3 pt-2">
                                                <h6 className="fw-semibold text-muted d-block mb-2">Validation Rules</h6>
                                                <div className="row g-2">
                                                  {['number', 'currency', 'percentage', 'date', 'datetime', 'time'].includes(tf.fObj.type) && (
                                                    <>
                                                      <div className="col-md-3">
                                                        <label className="premium-label">Min Value</label>
                                                        <input
                                                          type="number"
                                                          className="form-control form-control-sm premium-input"
                                                          value={tf.validation?.min !== undefined ? tf.validation.min : ''}
                                                          onChange={e => {
                                                            const val = e.target.value !== '' ? Number(e.target.value) : undefined;
                                                            const updated = newTemplate.fields.map(item =>
                                                              item.fieldId === tf.fieldId ? {
                                                                ...item,
                                                                validation: { ...(item.validation || {}), min: val }
                                                              } : item
                                                            );
                                                            setNewTemplate({ ...newTemplate, fields: updated });
                                                          }}
                                                        />
                                                      </div>
                                                      <div className="col-md-3">
                                                        <label className="premium-label">Max Value</label>
                                                        <input
                                                          type="number"
                                                          className="form-control form-control-sm premium-input"
                                                          value={tf.validation?.max !== undefined ? tf.validation.max : ''}
                                                          onChange={e => {
                                                            const val = e.target.value !== '' ? Number(e.target.value) : undefined;
                                                            const updated = newTemplate.fields.map(item =>
                                                              item.fieldId === tf.fieldId ? {
                                                                ...item,
                                                                validation: { ...(item.validation || {}), max: val }
                                                              } : item
                                                            );
                                                            setNewTemplate({ ...newTemplate, fields: updated });
                                                          }}
                                                        />
                                                      </div>
                                                    </>
                                                  )}

                                                  {['text', 'textarea', 'email', 'phone', 'password'].includes(tf.fObj.type) && (
                                                    <>
                                                      <div className="col-md-3">
                                                        <label className="premium-label">Min Characters</label>
                                                        <input
                                                          type="number"
                                                          className="form-control form-control-sm premium-input"
                                                          value={tf.validation?.minLength !== undefined ? tf.validation.minLength : ''}
                                                          onChange={e => {
                                                            const val = e.target.value !== '' ? Number(e.target.value) : undefined;
                                                            const updated = newTemplate.fields.map(item =>
                                                              item.fieldId === tf.fieldId ? {
                                                                ...item,
                                                                validation: { ...(item.validation || {}), minLength: val }
                                                              } : item
                                                            );
                                                            setNewTemplate({ ...newTemplate, fields: updated });
                                                          }}
                                                        />
                                                      </div>
                                                      <div className="col-md-3">
                                                        <label className="premium-label">Max Characters</label>
                                                        <input
                                                          type="number"
                                                          className="form-control form-control-sm premium-input"
                                                          value={tf.validation?.maxLength !== undefined ? tf.validation.maxLength : ''}
                                                          onChange={e => {
                                                            const val = e.target.value !== '' ? Number(e.target.value) : undefined;
                                                            const updated = newTemplate.fields.map(item =>
                                                              item.fieldId === tf.fieldId ? {
                                                                ...item,
                                                                validation: { ...(item.validation || {}), maxLength: val }
                                                              } : item
                                                            );
                                                            setNewTemplate({ ...newTemplate, fields: updated });
                                                          }}
                                                        />
                                                      </div>
                                                      <div className="col-md-6">
                                                        <label className="premium-label">Regex Pattern</label>
                                                        <input
                                                          type="text"
                                                          placeholder="e.g. ^[0-9]{10}$"
                                                          className="form-control form-control-sm premium-input"
                                                          value={tf.validation?.pattern || ''}
                                                          onChange={e => {
                                                            const updated = newTemplate.fields.map(item =>
                                                              item.fieldId === tf.fieldId ? {
                                                                ...item,
                                                                validation: { ...(item.validation || {}), pattern: e.target.value }
                                                              } : item
                                                            );
                                                            setNewTemplate({ ...newTemplate, fields: updated });
                                                          }}
                                                        />
                                                      </div>
                                                    </>
                                                  )}

                                                  <div className="col-md-12">
                                                    <label className="premium-label">Custom Validation Message</label>
                                                    <input
                                                      type="text"
                                                      placeholder="Message to display when validation fails"
                                                      className="form-control form-control-sm premium-input"
                                                      value={tf.validation?.message || ''}
                                                      onChange={e => {
                                                        const updated = newTemplate.fields.map(item =>
                                                          item.fieldId === tf.fieldId ? {
                                                            ...item,
                                                            validation: { ...(item.validation || {}), message: e.target.value }
                                                          } : item
                                                        );
                                                        setNewTemplate({ ...newTemplate, fields: updated });
                                                      }}
                                                    />
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-12 d-flex justify-content-end gap-2">
              {editingTemplateId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTemplateId(null);
                    setNewTemplate({
                      key: '',
                      label: '',
                      description: '',
                      entity: '',
                      purpose: '',
                      scope: 'global',
                      schools: [],
                      fields: []
                    });
                  }}
                  className="btn btn-outline-secondary px-4 py-2 fw-semibold"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className="btn px-5 py-2 fw-bold text-white"
                style={{ backgroundColor: 'var(--button-color)', border: 'none' }}
              >
                {editingTemplateId ? (
                  <><i className="fa-solid fa-floppy-disk me-1"></i>Save Changes</>
                ) : (
                  <><i className="fa-solid fa-plus me-1"></i>Create Template</>
                )}
              </button>
            </div>
          </form>

          <div className="table-responsive">
            <table className="table align-middle table-hover">
              <thead>
                <tr className="table-light">
                  <th>Key</th>
                  <th>Title</th>
                  <th>Entity</th>
                  <th>Purpose</th>
                  <th>Scope</th>
                  <th>Fields Count</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(t => (
                  <tr key={t._id}>
                    <td className="fw-bold">{t.key}</td>
                    <td>{t.label}</td>
                    <td><span className="status-pill active">{typeof t.entity === 'object' ? (t.entity?.label || t.entity?.key || '') : t.entity}</span></td>
                    <td><span className="status-pill draft">{t.purpose || '---'}</span></td>
                    <td><span className="status-pill draft">{t.scope}</span></td>
                    <td>{t.fields?.length || 0} fields</td>
                    <td><span className={`status-pill ${t.status}`}>{t.status}</span></td>
                    <td className="text-end">
                      <button onClick={() => handleStartEditingTemplate(t)} className="btn-action-edit me-2"><i className="fa-solid fa-pen me-1"></i>Edit</button>
                      {t.status === 'draft' && (
                        <>
                          <button onClick={() => handlePublishTemplate(t._id)} className="btn-action-success me-2"><i className="fa-solid fa-check me-1"></i>Publish</button>
                          <button onClick={() => handleDeleteTemplate(t._id)} className="btn-action-delete"><i className="fa-solid fa-trash me-1"></i>Delete</button>
                        </>
                      )}
                      {t.status === 'active' && (
                        <button onClick={() => handleArchiveTemplate(t._id)} className="btn-action-warning"><i className="fa-solid fa-box-archive me-1"></i>Archive</button>
                      )}
                      {t.status === 'archived' && (
                        <button onClick={() => handleRestoreTemplate(t._id)} className="btn-action-neutral"><i className="fa-solid fa-rotate-left me-1"></i>Restore</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      )
      }

      {/* Tab 4: Form Preview */}
      {
        activeTab === 'preview' && (
          <div className="premium-card p-4 bg-white mb-4">
            <h4 className="fw-bold text-dark mb-4"><i className="fa-solid fa-eye me-2" style={{ color: 'var(--button-color)' }}></i>Dynamic Form Preview</h4>

            <div className="row g-3 align-items-end mb-5 border-bottom pb-4">
              <div className="col-md-9">
                <label className="premium-label">Select Active Template</label>
                <select
                  className="form-select premium-input"
                  value={previewTemplateId}
                  onChange={e => setPreviewTemplateId(e.target.value)}
                >
                  <option value="">-- Choose Template --</option>
                  {templates.filter(t => t.status === 'active').map(t => (
                    <option key={t._id} value={t._id}>{t.label} ({typeof t.entity === 'object' ? (t.entity?.label || t.entity?.key || '') : t.entity})</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <button onClick={handleLoadPreviewForm} className="btn w-100 py-2 fw-bold" style={{ backgroundColor: 'var(--button-color)', color: '#fff', border: 'none' }}><i className="fa-solid fa-rotate me-1"></i>Render Layout</button>
              </div>
            </div>

            {previewForm && (
              <div className="row g-4">
                <div className="col-md-6 premium-card">
                  <div className="form-check form-switch mb-3 pt-2">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="submitToBackendToggle"
                      checked={submitToBackend}
                      onChange={e => {
                        setSubmitToBackend(e.target.checked);
                        setBackendResponse(null);
                      }}
                    />
                    <label className="form-check-label fw-semibold text-secondary" htmlFor="submitToBackendToggle">
                      <i className="fa-solid fa-cloud-arrow-up me-1"></i> Submit to Backend Dispatcher
                    </label>
                  </div>
                  <DynamicForm
                    template={previewForm}
                    mode="preview"
                    onSubmit={handlePreviewSubmit}
                  />
                </div>

                <div className="col-md-6 bg-light p-4 rounded border">
                  <h5 className="fw-bold mb-3 text-muted">Submitted Form Payload</h5>
                  {formSubmittedData ? (
                    <pre className="bg-dark text-success p-3 rounded mb-4" style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                      {JSON.stringify(formSubmittedData, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-muted small mb-4">Submit the form preview to see dynamic key-value payload outputs.</p>
                  )}

                  {submitToBackend && (
                    <>
                      <h5 className="fw-bold mb-3 text-muted border-top pt-3">Dispatcher Response</h5>
                      {backendResponse ? (
                        <pre className="bg-dark text-info p-3 rounded" style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                          {JSON.stringify(backendResponse, null, 2)}
                        </pre>
                      ) : (
                        <p className="text-muted small">No response received yet.</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* Tab 5: School Tenants */}
      {
        activeTab === 'schools' && (
          <div className="ov-animate-fade">
            <div className="row g-4">
              {/* Left Column: Form Setup */}
              <div className="col-md-7">
                <h4 className="fw-bold text-dark mb-4">
                  <i className="fa-solid fa-circle-plus me-2" style={{ color: 'var(--button-color)' }}></i>Register School Tenant
                </h4>
                <form onSubmit={handleCreateSchool} className="premium-card row g-3">
                  <div className="col-md-6">
                    <label className="premium-label">School Name *</label>
                    <input
                      type="text"
                      className="form-control premium-input"
                      value={newSchool.name}
                      onChange={e => setNewSchool({ ...newSchool, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Subdomain Slug *</label>
                    <input
                      type="text"
                      className="form-control premium-input"
                      value={newSchool.slug}
                      onChange={e => setNewSchool({ ...newSchool, slug: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Custom Domain</label>
                    <input
                      type="text"
                      className="form-control premium-input"
                      value={newSchool.customDomain}
                      placeholder="e.g. schoolname.com"
                      onChange={e => setNewSchool({ ...newSchool, customDomain: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Logo Image URL</label>
                    <input
                      type="text"
                      className="form-control premium-input"
                      value={newSchool.logoUrl}
                      onChange={e => setNewSchool({ ...newSchool, logoUrl: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Motto / Slogan</label>
                    <input
                      type="text"
                      className="form-control premium-input"
                      value={newSchool.motto}
                      onChange={e => setNewSchool({ ...newSchool, motto: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Hero Background Image URL</label>
                    <input
                      type="text"
                      className="form-control premium-input"
                      value={newSchool.backgroundImage}
                      onChange={e => setNewSchool({ ...newSchool, backgroundImage: e.target.value })}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Email Address *</label>
                    <input
                      type="email"
                      className="form-control premium-input"
                      value={newSchool.email}
                      onChange={e => setNewSchool({ ...newSchool, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="premium-label">Contact Phone No *</label>
                    <input
                      type="text"
                      className="form-control premium-input"
                      value={newSchool.phoneNo}
                      onChange={e => setNewSchool({ ...newSchool, phoneNo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="premium-label">Address</label>
                    <input
                      type="text"
                      className="form-control premium-input"
                      value={newSchool.address}
                      onChange={e => setNewSchool({ ...newSchool, address: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="premium-label">Active Theme</label>
                    <select
                      className="form-select premium-input"
                      value={newSchool.themeName}
                      onChange={e => setNewSchool({ ...newSchool, themeName: e.target.value })}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="midnight">Midnight</option>
                      <option value="emerald">Emerald</option>
                      <option value="crimson">Crimson</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="premium-label">Plan Tier</label>
                    <select
                      className="form-select premium-input"
                      value={newSchool.plan}
                      onChange={e => setNewSchool({ ...newSchool, plan: e.target.value })}
                    >
                      <option value="basic">Basic Plan</option>
                      <option value="premium">Premium Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="premium-label">Status</label>
                    <select
                      className="form-select premium-input"
                      value={newSchool.subscriptionStatus}
                      onChange={e => setNewSchool({ ...newSchool, subscriptionStatus: e.target.value })}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <div className="form-check form-switch pt-2">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={newSchool.questionPaperModule}
                        onChange={e => setNewSchool({ ...newSchool, questionPaperModule: e.target.checked })}
                      />
                      <label className="form-check-label fw-bold text-muted ms-1 small">Enable Question Paper Module</label>
                    </div>
                  </div>
                  <div className="col-12 d-flex justify-content-end pt-2">
                    <button type="submit" className="btn px-5 py-2 fw-bold text-white" style={{ backgroundColor: 'var(--button-color)', border: 'none' }}>
                      <i className="fa-solid fa-plus me-2"></i>Provision School Tenant
                    </button>
                  </div>
                </form>
              </div>

              {/* Right Column: Real-Time Preview */}
              <div className="col-md-5">
                <div className="premium-card p-4 bg-white mb-4 shadow sticky-top" style={{ top: '20px' }}>
                  <h4 className="fw-bold text-muted mb-4"><i className="fa-solid fa-eye me-2"></i>Live Theme Card Preview</h4>
                  <div className="premium-card bg-white overflow-hidden border shadow-lg" style={{ borderTop: `6px solid ${newSchool.themeName === 'emerald' ? '#10b981' : newSchool.themeName === 'crimson' ? '#ef4444' : newSchool.themeName === 'midnight' ? '#6366f1' : newSchool.themeName === 'dark' ? '#1e293b' : '#fe4f2d'}` }}>
                    {newSchool.backgroundImage ? (
                      <div style={{ backgroundImage: `url(${newSchool.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', height: '120px' }} />
                    ) : (
                      <div className="bg-light" style={{ height: '120px' }} />
                    )}
                    <div className="p-4 position-relative">
                      <div className="bg-white rounded-circle p-2 shadow position-absolute" style={{ width: '60px', height: '60px', top: '-30px', left: '20px', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {newSchool.logoUrl ? <img src={newSchool.logoUrl} alt="Logo" className="img-fluid" /> : <i className="fa-solid fa-school text-muted fs-4"></i>}
                      </div>
                      <div className="pt-4">
                        <h5 className="fw-bold text-dark mb-1">{newSchool.name || 'School Name'}</h5>
                        <p className="text-muted small mb-2"><code>{newSchool.slug || 'slug'}.localhost</code></p>
                        {newSchool.motto && <p className="text-muted small italic mb-3">"{newSchool.motto}"</p>}
                        <div className="border-top py-2 my-2 text-muted small">
                          <div className="d-flex justify-content-between mb-1">
                            <span>Custom Domain:</span>
                            <span className="fw-bold text-dark">{newSchool.customDomain || 'None'}</span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span>Plan level:</span>
                            <span className="badge bg-light text-primary border">{newSchool.plan.toUpperCase()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* List School Tenants */}
            <h4 className="fw-bold text-dark mt-4 mb-3">Provisioned School Tenants</h4>
            <div className="row g-4">
              {schools.map(s => {
                const activeSlug = localStorage.getItem('schoolSlug');
                const isCurrentlyActive = s.slug === activeSlug;
                return (
                  <div key={s._id} className="col-md-6 col-lg-4">
                    <div className="premium-card bg-white position-relative shadow-sm" style={{ borderTop: `5px solid ${s.theme?.themeName === 'emerald' ? '#10b981' : s.theme?.themeName === 'crimson' ? '#ef4444' : s.theme?.themeName === 'midnight' ? '#6366f1' : '#0f172a'}` }}>
                      {isCurrentlyActive && (
                        <div className="position-absolute top-0 end-0 m-3">
                          <span className="badge bg-success-light text-success fw-bold px-2 py-1" style={{ fontSize: '11px', borderRadius: '4px' }}>
                            <i className="fa-solid fa-circle-check me-1"></i>Active Context
                          </span>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="d-flex align-items-center mb-3">
                          <div className="bg-light rounded-circle p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '50px', height: '50px', border: '1px solid #e2e8f0' }}>
                            {s.logoUrl ? (
                              <img src={s.logoUrl} alt={s.name} className="img-fluid" style={{ maxHeight: '100%' }} />
                            ) : (
                              <i className="fa-solid fa-school text-muted fs-4"></i>
                            )}
                          </div>
                          <div>
                            <h5 className="fw-bold mb-0 text-dark text-truncate" style={{ maxWidth: '150px' }}>{s.name}</h5>
                            <code className="small text-muted">{s.slug}.localhost</code>
                          </div>
                        </div>
                        {s.motto && <p className="text-muted small italic mb-3">"{s.motto}"</p>}
                        <div className="small border-top border-bottom py-2 my-2 text-muted">
                          <div className="d-flex justify-content-between mb-1">
                            <span>Domain:</span>
                            <span className="fw-semibold text-dark">{s.customDomain || 'Default Slug'}</span>
                          </div>
                          <div className="d-flex justify-content-between mb-1">
                            <span>Theme:</span>
                            <span className="badge bg-light text-dark border">{s.theme?.themeName || 'light'}</span>
                          </div>
                          <div className="d-flex justify-content-between">
                            <span>Subscription:</span>
                            <span className="badge bg-info-light text-info">{s.subscription?.plan || 'basic'}</span>
                          </div>
                        </div>
                        <div className="d-flex gap-2 pt-2">
                          <button
                            onClick={() => handleSetActiveSchool(s)}
                            disabled={isCurrentlyActive}
                            className="btn flex-grow-1 py-2 fw-semibold"
                            style={{
                              backgroundColor: isCurrentlyActive ? 'transparent' : 'var(--button-color)',
                              color: isCurrentlyActive ? 'var(--text-color)' : '#fff',
                              border: isCurrentlyActive ? '1px solid #ccc' : 'none'
                            }}
                          >
                            <i className="fa-solid fa-circle-play me-1"></i>Set In Use
                          </button>
                          <button
                            onClick={() => handleDeleteSchool(s._id)}
                            className="btn btn-outline-danger px-3"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      }

      {/* Tab 6: User Accounts */}
      {
        activeTab === 'users' && (
          <div className="premium-card p-4 bg-white mb-4">
            <h4 className="fw-bold text-dark mb-4"><i className="fa-solid fa-users me-2" style={{ color: 'var(--button-color)' }}></i>User Accounts</h4>

            <div className="mb-4">
              <label className="premium-label">Select Tenant Context</label>
              <select
                className="form-select premium-input"
                value={selectedSchoolForUsers}
                onChange={e => setSelectedSchoolForUsers(e.target.value)}
              >
                {schools.map(s => (
                  <option key={s._id} value={s._id}>{s.name} ({s.slug})</option>
                ))}
              </select>
            </div>

            <form onSubmit={handleCreateUser} className="developer-form row g-3 mb-5">
              <h5 className="fw-bold text-muted mb-2">Create Tenant User Account</h5>
              <div className="col-md-4">
                <label className="premium-label">Username</label>
                <input
                  type="text"
                  className="form-control premium-input"
                  value={newUser.username}
                  onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="premium-label">Password</label>
                <input
                  type="password"
                  className="form-control premium-input"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  required
                />
              </div>
              <div className="col-md-4">
                <label className="premium-label">Role</label>
                <select
                  className="form-select premium-input"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="viewer">Viewer</option>
                  <option value="admin">Admin</option>
                  <option value="payment-manager">Payment Manager</option>
                  <option value="student-enrollment">Student Enrollment Officer</option>
                </select>
              </div>
              <div className="col-12 d-flex justify-content-end">
                <button type="submit" className="btn px-4 py-2 fw-bold text-white" style={{ backgroundColor: 'var(--button-color)', border: 'none' }}><i className="fa-solid fa-plus me-1"></i>Create User Account</button>
              </div>
            </form>

            <div className="table-responsive">
              <table className="table align-middle table-hover">
                <thead>
                  <tr className="table-light">
                    <th>Username</th>
                    <th>Password</th>
                    <th>Role</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isEditing = editingUserId === u._id;
                    return (
                      <tr key={u._id}>
                        <td className="fw-bold">{u.username}</td>
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="form-control form-control-sm premium-input"
                              value={editUserData.password}
                              onChange={e => setEditUserData({ ...editUserData, password: e.target.value })}
                            />
                          ) : (
                            <div className="d-flex align-items-center gap-2">
                              <span>{visiblePasswords[u._id] ? u.password : '••••••••'}</span>
                              <button onClick={() => togglePasswordVisibility(u._id)} className="btn btn-xs btn-light py-1 border"><i className={`fa-solid ${visiblePasswords[u._id] ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                            </div>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <select
                              className="form-select form-select-sm premium-input"
                              value={editUserData.role}
                              onChange={e => setEditUserData({ ...editUserData, role: e.target.value })}
                            >
                              <option value="viewer">Viewer</option>
                              <option value="admin">Admin</option>
                              <option value="payment-manager">Payment Manager</option>
                              <option value="student-enrollment">Student Enrollment Officer</option>
                            </select>
                          ) : (
                            <span className="badge bg-light text-dark border">{u.role}</span>
                          )}
                        </td>
                        <td className="text-end">
                          {isEditing ? (
                            <>
                              <button onClick={() => handleSaveUserEdit(u)} className="btn btn-sm btn-outline-success me-2 fw-semibold px-3"><i className="fa-solid fa-floppy-disk me-1"></i>Save</button>
                              <button onClick={() => setEditingUserId(null)} className="btn btn-sm btn-outline-secondary fw-semibold px-3">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleStartEditingUser(u)} className="btn btn-sm btn-outline-primary me-2 fw-semibold"><i className="fa-solid fa-pen me-1"></i>Edit</button>
                              <button onClick={() => handleImpersonateUser(u)} className="btn btn-sm text-white py-1 px-3 fw-semibold" style={{ backgroundColor: 'var(--button-color)', border: 'none' }}><i className="fa-solid fa-user-secret me-2"></i>Login As</button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
      <LoadingIndicator message={loadingMessage} active={loading} />
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Entity Details View Modal */}
      {selectedEntityForView && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(3px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setSelectedEntityForView(null)}
        >
          <div
            className="premium-card text-dark"
            style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="d-flex justify-content-between align-items-center border-bottom pb-3 mb-4">
              <h5 className="fw-bold mb-0">
                <i className={`fa-solid ${selectedEntityForView.icon || 'fa-cubes'} me-2`} style={{ color: selectedEntityForView.color || 'var(--button-color)' }}></i>
                {selectedEntityForView.label} Entity Metadata
              </h5>
              <button className="btn-close" style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer' }} onClick={() => setSelectedEntityForView(null)}>&times;</button>
            </div>

            <div className="row g-3">
              <div className="col-md-6 mb-3">
                <strong className="d-block small text-secondary">Machine Key:</strong>
                <code>{selectedEntityForView.key}</code>
              </div>
              <div className="col-md-6 mb-3">
                <strong className="d-block small text-secondary">Friendly Name:</strong>
                <span>{selectedEntityForView.label}</span>
              </div>
              <div className="col-md-6 mb-3">
                <strong className="d-block small text-secondary">MongoDB Collection:</strong>
                <code>{selectedEntityForView.collection}</code>
              </div>
              <div className="col-md-6 mb-3">
                <strong className="d-block small text-secondary">Mongoose Model:</strong>
                <code>{selectedEntityForView.model}</code>
              </div>
              <div className="col-md-6 mb-3">
                <strong className="d-block small text-secondary">Category (Grouping):</strong>
                <span>{selectedEntityForView.category || 'General'}</span>
              </div>
              <div className="col-md-6 mb-3">
                <strong className="d-block small text-secondary">Backend Handler:</strong>
                <span className="badge bg-primary text-white d-inline-block px-2 py-1 mt-1">{selectedEntityForView.handler}</span>
              </div>
              <div className="col-12 mb-3">
                <strong className="d-block small text-secondary">Description:</strong>
                <span className="text-muted small">{selectedEntityForView.description || 'No description provided.'}</span>
              </div>

              {/* Storage Config Details */}
              <div className="col-12 border-top pt-3">
                <h6 className="fw-bold mb-3"><i className="fa-solid fa-database me-2 text-info"></i>Storage Mapping Configurations</h6>
                {(!selectedEntityForView.storage || selectedEntityForView.storage.length === 0) ? (
                  <div className="alert alert-secondary py-2 small mb-0">No custom storage configuration defined. Defaults to standard MongoDB collection CRUD.</div>
                ) : (
                  selectedEntityForView.storage.map((store, sIdx) => (
                    <div key={sIdx} className="p-3 rounded mb-3 border bg-light shadow-xs" style={{ border: '1px solid #dee2e6' }}>
                      <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                        <strong className="text-secondary"><i className="fa-solid fa-table me-1"></i>Model: {store.model}</strong>
                        {store.dynamicFieldContainer && (
                          <span className="badge bg-warning text-dark small px-2 py-1">
                            <i className="fa-solid fa-code me-1"></i>Container: {store.dynamicFieldContainer}
                          </span>
                        )}
                      </div>

                      <div className="small">
                        <strong className="d-block mb-1">Field Mappings (Field Registry Key &rarr; Mongoose Field):</strong>
                        {(!store.fields || (store.fields instanceof Map ? store.fields.size === 0 : Object.keys(store.fields).length === 0)) ? (
                          <div className="text-muted italic pt-1">No field maps configured. All properties stored inside default dynamic fields.</div>
                        ) : (
                          <table className="table table-sm table-bordered mt-2 mb-0 bg-white" style={{ border: '1px solid #dee2e6' }}>
                            <thead>
                              <tr className="table-light">
                                <th>Registry Key</th>
                                <th>Backend Schema Property</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(store.fields instanceof Map ? Object.fromEntries(store.fields) : store.fields).map(([regKey, schemaProp]) => {
                                const renderKey = typeof regKey === 'object' ? (regKey.key || regKey.label || JSON.stringify(regKey)) : String(regKey);
                                const renderVal = typeof schemaProp === 'object' ? (schemaProp.key || schemaProp.label || JSON.stringify(schemaProp)) : String(schemaProp);
                                return (
                                  <tr key={renderKey}>
                                    <td><code>{renderKey}</code></td>
                                    <td><code>{renderVal}</code></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="d-flex justify-content-end border-top pt-3 mt-4">
              <button className="btn btn-sm btn-outline-secondary px-4 py-1.5 fw-semibold" onClick={() => setSelectedEntityForView(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
}
