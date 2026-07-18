const FeeStructureRepository = require('../../domain/finance/repositories/FeeStructureRepository');
const StudentEnrollmentRepository = require('../../domain/student/repositories/StudentEnrollmentRepository');
const AcademicYear = require('../../domain/academics/models/AcademicYear');
const mongoose = require('mongoose');

const resolveAcademicYearId = async (academicYearInput, schoolId) => {
    if (!academicYearInput) return null;
    const query = { $or: [{ name: academicYearInput }, { year: academicYearInput }] };
    if (mongoose.isValidObjectId(academicYearInput)) {
        query.$or.push({ _id: new mongoose.Types.ObjectId(academicYearInput) });
    }
    const yearDoc = await AcademicYear.findOne(query);
    return yearDoc ? yearDoc._id : null;
};

class FinanceService {
  async saveFees(schoolId, data) {
    const { studentId, academicYear, totalFees, discount, newPayment, isNewStudent } = data;
    const resolvedYearId = await resolveAcademicYearId(academicYear, schoolId) || new mongoose.Types.ObjectId("6a49704e31d281a6130aa86b");

    const StudentFeeAssignment = mongoose.model('StudentFeeAssignment');
    const StudentPaymentLedger = mongoose.model('StudentPaymentLedger');
    const FinancialTransactionService = require('./FinancialTransactionService');

    // 1. Fetch or create StudentFeeAssignment
    let assignment = await StudentFeeAssignment.findOne({ studentId, academicYearId: resolvedYearId });
    if (!assignment) {
      const StudentEnrollment = mongoose.model('StudentEnrollment');
      const enrollment = await StudentEnrollment.findOne({ studentId, academicYearId: resolvedYearId });
      const classId = enrollment ? enrollment.classId : new mongoose.Types.ObjectId();
      
      assignment = new StudentFeeAssignment({
        studentId,
        schoolId,
        academicYearId: resolvedYearId,
        classId,
        feeComponents: newPayment?.components || [],
        discount: discount || 0,
        totalAmount: totalFees || 0,
        status: 'pending'
      });
      await assignment.save();
    } else {
      assignment.totalAmount = totalFees;
      assignment.discount = discount;
      await assignment.save();
    }

    // 2. Fetch or create StudentPaymentLedger
    let ledger = await StudentPaymentLedger.findOne({ studentId, academicYearId: resolvedYearId });
    if (!ledger) {
      ledger = new StudentPaymentLedger({
        studentId,
        schoolId,
        academicYearId: resolvedYearId,
        feeAssignmentId: assignment._id,
        totalFees: assignment.totalAmount,
        discount: assignment.discount,
        balance: assignment.totalAmount - assignment.discount,
        payments: []
      });
    } else {
      ledger.totalFees = assignment.totalAmount;
      ledger.discount = assignment.discount;
      ledger.balance = ledger.totalFees - ledger.discount - ledger.payments.reduce((sum, p) => sum + p.amount, 0);
    }

    // 3. Add new payment record if present
    if (newPayment) {
      const basePaymentRecord = {
        receiptNumber: newPayment.receiptNumber || '0000',
        amount: newPayment.amount || 0,
        paymentDate: newPayment.date ? new Date(newPayment.date) : new Date(),
        paymentMethod: newPayment.paymentMethod || "Unknown",
        paymentBy: newPayment.paymentBy || "Unknown",
        transactionReference: newPayment.transactionReference || "",
        remarks: newPayment.remarks || "",
        status: 'completed',
        createdBy: data.userId || null,
        feeComponents: newPayment.components || []
      };

      ledger.payments.push(basePaymentRecord);
      ledger.balance -= basePaymentRecord.amount;

      // Update assignment status
      if (ledger.balance <= 0) {
        assignment.status = 'fully_paid';
      } else if (ledger.balance < (ledger.totalFees - ledger.discount)) {
        assignment.status = 'partially_paid';
      } else {
        assignment.status = 'pending';
      }
      await assignment.save();
      await ledger.save();

      // 4. Create financial transaction log
      try {
        await FinancialTransactionService.recordTransaction({
          schoolId,
          transactionType: 'income',
          sourceModule: 'student_fee',
          referenceId: ledger._id,
          amount: basePaymentRecord.amount,
          paymentMethod: basePaymentRecord.paymentMethod,
          remarks: `Student Fee Payment for receipt ${basePaymentRecord.receiptNumber}`,
          createdBy: data.userId || null,
          transactionDate: basePaymentRecord.paymentDate
        });
      } catch (txErr) {
        console.error('⚠️ Failed to log financial transaction:', txErr);
      }
    } else {
      await ledger.save();
    }

    return ledger;
  }

  async getFees(schoolId, studentId, academicYear) {
    if (!studentId || !academicYear) {
      const StudentPaymentLedger = mongoose.model('StudentPaymentLedger');
      const ledgers = await StudentPaymentLedger.find({});
      
      const studentMap = {};
      for (const ledger of ledgers) {
        const sId = ledger.studentId.toString();
        
        const AcademicYear = mongoose.model('AcademicYear');
        const yearDoc = await AcademicYear.findById(ledger.academicYearId);
        const yearName = yearDoc ? yearDoc.name : ledger.academicYearId.toString();

        const yearData = {
          academicYear: yearName,
          totalFees: ledger.totalFees,
          discount: ledger.discount,
          isNewStudent: false,
          payments: ledger.payments.map(p => {
            const pObj = p.toObject ? p.toObject() : p;
            pObj.date = pObj.paymentDate; // Alias paymentDate to date for PDF/UI mapping
            return pObj;
          })
        };

        if (!studentMap[sId]) {
          studentMap[sId] = {
            _id: ledger._id,
            studentId: ledger.studentId,
            schoolId: ledger.schoolId,
            academicYears: [yearData]
          };
        } else {
          studentMap[sId].academicYears.push(yearData);
        }
      }
      
      return Object.values(studentMap);
    }

    const resolvedYearId = await resolveAcademicYearId(academicYear, schoolId);
    if (!resolvedYearId) throw new Error("Academic year not found");

    const StudentFeeAssignment = mongoose.model('StudentFeeAssignment');
    const StudentPaymentLedger = mongoose.model('StudentPaymentLedger');

    const assignment = await StudentFeeAssignment.findOne({ studentId, academicYearId: resolvedYearId });
    const ledger = await StudentPaymentLedger.findOne({ studentId, academicYearId: resolvedYearId });

    let payments = [];
    let discount = 0;
    let totalFees = 0;
    let balance = 0;

    if (assignment) {
      totalFees = assignment.totalAmount;
      discount = assignment.discount;
    }
    if (ledger) {
      payments = ledger.payments.map(p => {
        const pObj = p.toObject ? p.toObject() : p;
        pObj.date = pObj.paymentDate; // Alias for PDF compatibility
        return pObj;
      });
      balance = ledger.balance;
    } else {
      balance = totalFees - discount;
    }

    return { totalFees, discount, isNewStudent: false, payments, balance };
  }

  async saveClassFees(schoolId, data) {
    const { academicYear, class_id, fees } = data;
    const resolvedYearId = await resolveAcademicYearId(academicYear, schoolId) || new mongoose.Types.ObjectId("6a49704e31d281a6130aa86b");
    const classIdObj = new mongoose.Types.ObjectId(class_id);

    let classFeesDoc = await FeeStructureRepository.findOne({ academicYear: resolvedYearId });
    const newFee = { class_id: classIdObj, fees: fees || [] };

    if (!classFeesDoc) {
      classFeesDoc = await FeeStructureRepository.create({
        schoolId,
        academicYear: resolvedYearId,
        classes: [newFee]
      });
    } else {
      const index = classFeesDoc.classes.findIndex(c => c.class_id && c.class_id.equals(classIdObj));
      if (index !== -1) {
        classFeesDoc.classes[index] = { ...classFeesDoc.classes[index]._doc, ...newFee };
      } else {
        classFeesDoc.classes.push(newFee);
      }
      await classFeesDoc.save();
    }
    return classFeesDoc;
  }

  async getClassFees() {
    return FeeStructureRepository.find({});
  }

  async copyClassFees(schoolId, data) {
    const { fromYear, toYear } = data;
    const fromYearId = await resolveAcademicYearId(fromYear, schoolId);
    const toYearId = await resolveAcademicYearId(toYear, schoolId);

    if (!fromYearId || !toYearId) throw new Error("One or both academic years could not be resolved.");

    const sourceFees = await FeeStructureRepository.findOne({ academicYear: fromYearId });
    if (!sourceFees) throw new Error(`No fee structure found to copy from year '${fromYear}'.`);

    let targetFees = await FeeStructureRepository.findOne({ academicYear: toYearId });
    const copiedClasses = sourceFees.classes.map(c => ({
      class_id: c.class_id,
      fees: c.fees.map(f => ({ fieldId: f.fieldId, amount: f.amount }))
    }));

    if (!targetFees) {
      targetFees = await FeeStructureRepository.create({
        schoolId,
        academicYear: toYearId,
        classes: copiedClasses
      });
    } else {
      targetFees.classes = copiedClasses;
      await targetFees.save();
    }
    return targetFees;
  }
}

module.exports = new FinanceService();
