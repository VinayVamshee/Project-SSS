const mongoose = require('mongoose');
const Student = require('../Models/Student');
const PersonalInformationList = require('../Models/PersonalInformationList');

// Fetch all active field definitions (filtered by school tenant scope)
exports.getFieldDefinitions = async (req, res) => {
    try {
        const query = { isActive: true };

        if (req.schoolId) {
            const schoolObjectId = new mongoose.Types.ObjectId(req.schoolId);
            query.$or = [
                { applicableSchools: { $exists: false } },
                { applicableSchools: { $size: 0 } },
                { applicableSchools: schoolObjectId }
            ];
        }

        const fields = await PersonalInformationList.find(query).sort({ sno: 1 });
        res.status(200).json({ data: fields });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching field definitions', error: error.message });
    }
};

// Add or update a field definition (admin only)
exports.addFieldDefinition = async (req, res) => {
    try {
        const { fieldKey, fieldName, fieldType, sno, required, isUnique, options, applicableSchools, validationPattern, validationMessage } = req.body;
        if (!fieldKey || !fieldName || !fieldType) {
            return res.status(400).json({ message: 'fieldKey, fieldName, and fieldType are required.' });
        }

        // Validate validationPattern regex syntax if provided
        if (validationPattern) {
            try {
                new RegExp(validationPattern);
            } catch (err) {
                return res.status(400).json({ message: `Invalid validation regex pattern: ${err.message}` });
            }
        }

        const exists = await PersonalInformationList.findOne({ fieldKey });
        if (exists) {
            return res.status(409).json({ message: `Field key '${fieldKey}' already exists.`, data: exists });
        }

        const newField = new PersonalInformationList({
            fieldKey, fieldName, fieldType,
            sno: sno || 99,
            required: required || false,
            isUnique: isUnique || false,
            options: options || [],
            applicableSchools: applicableSchools || [],
            validationPattern: validationPattern || "",
            validationMessage: validationMessage || ""
        });

        await newField.save();
        res.status(201).json({ message: 'Field definition added successfully', data: newField });
    } catch (error) {
        res.status(500).json({ message: 'Error adding field definition', error: error.message });
    }
};

// Update an existing field definition
exports.updateFieldDefinition = async (req, res) => {
    try {
        const { id } = req.params;
        const { validationPattern } = req.body;

        // Validate validationPattern regex syntax if provided in update payload
        if (validationPattern !== undefined && validationPattern !== "") {
            try {
                new RegExp(validationPattern);
            } catch (err) {
                return res.status(400).json({ message: `Invalid validation regex pattern: ${err.message}` });
            }
        }

        const updated = await PersonalInformationList.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) return res.status(404).json({ message: 'Field definition not found.' });
        res.status(200).json({ message: 'Field definition updated', data: updated });
    } catch (error) {
        res.status(500).json({ message: 'Error updating field definition', error: error.message });
    }
};

// Delete a field definition
exports.deleteFieldDefinition = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await PersonalInformationList.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'Field definition not found.' });
        res.status(200).json({ message: 'Field definition deleted.' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting field definition', error: error.message });
    }
};

// Add a new student using EAV dynamic fields
const validateDynamicFields = async (dynamicFields) => {
    if (!dynamicFields || !Array.isArray(dynamicFields)) return;

    for (const field of dynamicFields) {
        if (!field.fieldId) continue;
        const definition = await PersonalInformationList.findById(field.fieldId);
        if (definition && definition.validationPattern) {
            const regex = new RegExp(definition.validationPattern);
            const value = field.value || "";
            if (value && !regex.test(value)) {
                throw new Error(definition.validationMessage || `Invalid format for '${definition.fieldName}'`);
            }
        }
    }
};

exports.addStudent = async (req, res) => {
    try {
        const { name, image, academicYearId, enrollmentClass, dynamicFields } = req.body;

        if (!name) return res.status(400).json({ message: 'Student name is required.' });

        // Run validation formulas
        try {
            await validateDynamicFields(dynamicFields);
        } catch (validationErr) {
            return res.status(400).json({ message: validationErr.message });
        }

        const newStudent = new Student({
            name,
            image: image || '',
            academicYearId: academicYearId || null,
            enrollments: academicYearId ? [{
                academicYear: academicYearId,
                class: enrollmentClass || '',
                status: 'Active'
            }] : [],
            dynamicFields: dynamicFields || []
        });

        await newStudent.save();
        res.status(201).json({ message: 'Student added successfully', data: newStudent });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error adding student', error: error.message });
    }
};

// Get all students (with populated academic year and dynamic field references)
exports.getStudents = async (req, res) => {
    try {
        const students = await Student.find()
            .populate('academicYearId', 'name status')
            .populate('enrollments.academicYear', 'name status')
            .populate('dynamicFields.fieldId', 'fieldKey fieldName fieldType sno');
        res.status(200).json({ students });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching students', error: error.message });
    }
};

// Update student profile
exports.updateStudent = async (req, res) => {
    try {
        const studentId = req.params.id;
        const { name, image, academicYearId, dynamicFields } = req.body;

        // Run validation formulas
        try {
            await validateDynamicFields(dynamicFields);
        } catch (validationErr) {
            return res.status(400).json({ message: validationErr.message });
        }

        const updatedStudent = await Student.findByIdAndUpdate(
            studentId,
            { name, image, academicYearId, dynamicFields },
            { new: true }
        ).populate('dynamicFields.fieldId', 'fieldKey fieldName fieldType');

        if (!updatedStudent) return res.status(404).json({ message: 'Student not found' });
        res.status(200).json({ message: 'Student updated successfully', data: updatedStudent });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating student', error: error.message });
    }
};

// Update enrollment status for a student (promotion / TC / Dropped)
exports.updateAcademicYearStatus = async (req, res) => {
    const studentId = req.params.id;
    const { status } = req.body;

    try {
        const student = await Student.findById(studentId);
        if (!student) return res.status(404).json({ message: "Student not found." });

        if (student.enrollments.length > 0) {
            const lastIndex = student.enrollments.length - 1;
            student.enrollments[lastIndex].status = status || "Passed";
        }

        await student.save();
        return res.status(200).json({ message: "Enrollment status updated." });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Failed to update enrollment status." });
    }
};

// Bulk promote students to a new academic year and class
exports.passStudentsTo = async (req, res) => {
    try {
        const { studentIds, newAcademicYear, newClass } = req.body;
        if (!studentIds || studentIds.length === 0 || !newAcademicYear || !newClass) {
            return res.status(400).json({ message: "Missing required data." });
        }

        const students = await Student.find({ _id: { $in: studentIds } });
        const bulkOperations = students.map(student => {
            const enrollments = student.enrollments || [];
            if (enrollments.length > 0) {
                enrollments[enrollments.length - 1].status = "Passed";
            }
            enrollments.push({
                academicYear: newAcademicYear,
                class: newClass,
                status: "Active"
            });

            return {
                updateOne: {
                    filter: { _id: student._id },
                    update: {
                        enrollments,
                        academicYearId: newAcademicYear
                    }
                }
            };
        });

        await Student.bulkWrite(bulkOperations);
        res.status(200).json({ message: "Students promoted successfully!" });
    } catch (error) {
        console.error("Error promoting students:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// Bulk update enrollment status (drop, TC, etc.)
exports.dropAcademicYear = async (req, res) => {
    try {
        const { studentIds, academicYear, status } = req.body;
        if (!studentIds || studentIds.length === 0 || !academicYear || !status) {
            return res.status(400).json({ message: "Missing data." });
        }

        const students = await Student.find({ _id: { $in: studentIds } });
        const bulkUpdates = students.map(student => {
            const updatedEnrollments = (student.enrollments || []).map(entry => {
                if (entry.academicYear?.toString() === academicYear) {
                    return { ...entry.toObject(), status };
                }
                return entry;
            });

            return {
                updateOne: {
                    filter: { _id: student._id },
                    update: { enrollments: updatedEnrollments }
                }
            };
        });

        await Student.bulkWrite(bulkUpdates);
        res.status(200).json({ message: "Students updated successfully!" });
    } catch (error) {
        console.error("Error updating students:", error);
        res.status(500).json({ message: "Internal server error." });
    }
};

// Legacy alias routes kept for backward compatibility
exports.getPersonalInformationList = exports.getFieldDefinitions;
exports.addAdditionalPersonalInfo = exports.addFieldDefinition;
exports.deletePersonalInfo = exports.deleteFieldDefinition;
