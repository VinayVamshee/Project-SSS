from datetime import datetime, timedelta
import json

# Load your file
with open("/content/tableConvert.com_ntw3s9.json", "r", encoding="utf-8") as f:
    raw_data = json.load(f)

# Default image URLs
male_image = "https://png.pngtree.com/png-clipart/20240428/original/pngtree-student-profile-in-modern-flat-gradient-style-png-image_14957139.png"
female_image = "https://png.pngtree.com/png-clipart/20240428/original/pngtree-student-profile-in-modern-flat-gradient-style-png-image_14957140.png"

def convert_excel_date(serial):
    try:
        return (datetime(1899, 12, 30) + timedelta(days=int(serial))).strftime('%Y-%m-%d')
    except:
        return None

students = []
for entry in raw_data:
    dob_iso = convert_excel_date(entry.get("DOB"))
    try:
        age = datetime.now().year - datetime.strptime(dob_iso, "%Y-%m-%d").year if dob_iso else None
    except:
        age = None

    student = {
        "name": entry.get("SName", ""),
        "nameHindi": entry.get("SNameH", ""),
        "dob": dob_iso,
        "dobInWords": entry.get("DOBWord", ""),
        "gender": entry.get("Gender", ""),
        "aadharNo": entry.get("SAadharNo", ""),
        "bloodGroup": entry.get("BGroup", ""),
        "age": age,
        "image": male_image if entry.get("Gender") == "Male" else female_image,
        "category": entry.get("CategoryName", ""),
        "AdmissionNo": entry.get("AdmissionNo", ""),
        "Caste": entry.get("CastName", ""),
        "CasteHindi": entry.get("CasteH", ""),
        "FreeStud": entry.get("FreeStud", ""),
        "academicYears": [
            {
                "academicYear": entry.get("ASession", ""),
                "class": entry.get("AClass", "")
            }
        ],
        "additionalInfo": [
            {"key": "Father's Name", "value": entry.get("FName", "")},
            {"key": "Mother's Name", "value": entry.get("MName", "")},
            {"key": "Father's Phone No.", "value": entry.get("MobileNo", "")},
            {"key": "Mother's Phone No.", "value": entry.get("MobileNo1", "")},
            {"key": "Father's Aadhar Card", "value": entry.get("FAadharNo", "")},
            {"key": "Mother's Aadhar Card", "value": entry.get("MAadharNo", "")},
            {"key": "Father's Occupation", "value": entry.get("FatherOccupation", "")},
            {"key": "Mother's Occupation", "value": entry.get("MotherOccupation", "")},
            {"key": "Address", "value": entry.get("Address", "")},
            {"key": "Permanent Address", "value": entry.get("PAddress", "")},
            {"key": "City", "value": entry.get("City", "")},
        ]
    }

    student["additionalInfo"] = [info for info in student["additionalInfo"] if info["value"]]
    students.append(student)

# Save to file
with open("/content/converted_students_mongodb_ready.json", "w", encoding="utf-8") as f:
    json.dump(students, f, ensure_ascii=False, indent=2)

print("✅ File saved as converted_students_mongodb_ready.json")
