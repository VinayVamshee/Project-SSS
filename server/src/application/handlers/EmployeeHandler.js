const mongoose = require('mongoose');

class EmployeeHandler {
  async handle(schoolId, mappedModels, payload, template, entity) {
    const EmployeeModel = mongoose.model('Employee');
    const employeeData = { ...mappedModels.Employee, schoolId };

    if (!employeeData.employeeCode) {
      const count = await EmployeeModel.countDocuments({ schoolId });
      employeeData.employeeCode = `EMP-${String(count + 1).padStart(3, '0')}`;
    }

    let employeeDoc;
    if (payload._id || payload.employeeId) {
      const empId = payload._id || payload.employeeId;
      employeeDoc = await EmployeeModel.findByIdAndUpdate(empId, employeeData, { new: true, runValidators: true });
    } else {
      employeeDoc = new EmployeeModel(employeeData);
      await employeeDoc.save();
    }

    return {
      employee: employeeDoc
    };
  }
}

module.exports = new EmployeeHandler();
