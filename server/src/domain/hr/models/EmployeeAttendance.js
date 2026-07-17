const mongoose = require('mongoose');

const employeeAttendanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['Present', 'Absent', 'HalfDay', 'Leave'], required: true },
  remarks: { type: String, default: "" }
}, { timestamps: true });

employeeAttendanceSchema.index({ employeeId: 1, date: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('EmployeeAttendance', employeeAttendanceSchema);
