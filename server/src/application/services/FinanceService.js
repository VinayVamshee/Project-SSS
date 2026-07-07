const PaymentRepository = require('../../domain/finance/repositories/PaymentRepository');
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

    let paymentEntry = await PaymentRepository.findOne({ studentId });

    const basePaymentRecord = {
      amount: newPayment?.amount || 0,
      date: newPayment?.date ? new Date(newPayment.date) : new Date(),
      paymentMethod: newPayment?.paymentMethod || "Unknown",
      paymentBy: newPayment?.paymentBy || "Unknown",
      components: newPayment?.components || [],
      receiptBookName: newPayment?.receiptBookName || "",
      receiptNumber: newPayment?.receiptNumber || 0,
    };

    if (!paymentEntry) {
      paymentEntry = await PaymentRepository.create({
        studentId,
        schoolId,
        academicYears: [{
          academicYear: resolvedYearId,
          totalFees,
          discount,
          isNewStudent,
          payments: newPayment ? [basePaymentRecord] : []
        }]
      });
    } else {
      const index = paymentEntry.academicYears.findIndex(ay => ay.academicYear?.toString() === resolvedYearId.toString());
      if (index !== -1) {
        paymentEntry.academicYears[index].totalFees = totalFees;
        paymentEntry.academicYears[index].discount = discount;
        paymentEntry.academicYears[index].isNewStudent = isNewStudent;
        if (newPayment) paymentEntry.academicYears[index].payments.push(basePaymentRecord);
      } else {
        paymentEntry.academicYears.push({
          academicYear: resolvedYearId,
          totalFees,
          discount,
          isNewStudent,
          payments: newPayment ? [basePaymentRecord] : []
        });
      }
      await paymentEntry.save();
    }
    return paymentEntry;
  }

  async getFees(schoolId, studentId, academicYear) {
    if (!studentId || !academicYear) {
      return PaymentRepository.find({});
    }

    const resolvedYearId = await resolveAcademicYearId(academicYear, schoolId);
    if (!resolvedYearId) throw new Error("Academic year not found");

    const enrollment = await StudentEnrollmentRepository.findOne({ studentId, academicYearId: resolvedYearId });
    if (!enrollment) throw new Error("No enrollment found for this student in the target academic year.");

    const paymentRecord = await PaymentRepository.findOne({ studentId });
    let payments = [];
    let isNewStudent = false;
    let discount = 0;
    let totalFees = 0;

    if (paymentRecord) {
      const yearData = paymentRecord.academicYears.find(year => year.academicYear?.toString() === resolvedYearId.toString());
      if (yearData) {
        payments = yearData.payments;
        isNewStudent = yearData.isNewStudent ?? false;
        discount = yearData.discount ?? 0;
        totalFees = yearData.totalFees ?? 0;
      }
    }

    return { totalFees, discount, isNewStudent, payments };
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
