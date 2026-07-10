import React from 'react';

export default function SearchFilterBar({
    selectedYear,
    setSelectedYear,
    selectedClass,
    setSelectedClass,
    classes,
    academicYears,
    statusFilter,
    setStatusFilter,
    personalInfoList = [],
    selectedField,
    setSelectedField,
    searchText,
    setSearchText,
    filters = [],
    setFilters,
    filteredCount = 0,
    children
}) {
    // Add active filter tag
    const handleAddFilter = () => {
        if (selectedField && searchText) {
            setFilters([...filters, { field: selectedField, value: searchText }]);
            setSelectedField('');
            setSearchText('');
        }
    };

    // Remove active filter tag
    const handleRemoveFilter = (idxToRemove) => {
        setFilters(filters.filter((_, idx) => idx !== idxToRemove));
    };

    return (
        <div className="w-100 mb-3 search-filter-wrapper">
            <div className="SearchFilter">
                
                {/* 1. Academic Year filter */}
                <div className="yearFilter">
                    <select 
                        className="form-select form-select-sm" 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(e.target.value)}
                        style={{ width: '100px' }}
                    >
                        <option value="">Select Academic Year</option>
                        <option value="">All</option>
                        {academicYears.map((year, idx) => (
                            <option key={idx} value={year.name || year.year}>{year.name || year.year}</option>
                        ))}
                    </select>
                </div>

                {/* 2. Class filter */}
                <div className="classFilter">
                    <select 
                        className="form-select form-select-sm" 
                        value={selectedClass} 
                        onChange={(e) => setSelectedClass(e.target.value)}
                    >
                        <option value="">Select Class</option>
                        <option value="">All</option>
                        {classes.map((cls) => (
                            <option key={cls._id} value={cls.class}>{cls.class}</option>
                        ))}
                    </select>
                </div>

                {/* 3. Status Filter */}
                <div className="statusFilter">
                    <select
                        className="form-select form-select-sm"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        style={{ width: '100px' }}
                    >
                        <option value="">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Passed">Passed</option>
                        <option value="Dropped">Dropped</option>
                        <option value="TC-Issued">TC-Issued</option>
                        <option value="Failed">Failed</option>
                    </select>
                </div>

                {/* 4. Filtered Count */}
                <div className="filteredCount d-flex align-items-center btn fw-bold text-secondary border shadow" style={{ backgroundColor: 'white' }}>
                    {filteredCount}
                </div>

                {/* 5. Choose Filter Field */}
                <select
                    className="form-select form-select-sm searchType"
                    value={selectedField}
                    onChange={(e) => {
                        setSelectedField(e.target.value);
                        setSearchText('');
                    }}
                    style={{ width: '200px' }}
                >
                    <option disabled value="">Choose Filter Field</option>
                    <optgroup label="Core Fields">
                        <option value="name">Student Name</option>
                    </optgroup>
                    <optgroup label="Academic Properties">
                        <option value="Academic - status">Status</option>
                        <option value="Academic - class">Class</option>
                    </optgroup>
                    <optgroup label="Registration Fields">
                        {personalInfoList.map((info) => (
                            <option key={info._id} value={info.fieldKey}>{info.fieldName}</option>
                        ))}
                    </optgroup>
                </select>

                {/* Filter Value Input / Select */}
                {(() => {
                    const fieldDef = personalInfoList.find(f => f.fieldKey === selectedField);
                    
                    if (selectedField === 'Academic - status') {
                        return (
                            <select className="form-select form-select-sm" style={{ flex: '1' }} value={searchText} onChange={(e) => setSearchText(e.target.value)}>
                                <option value="">Select Status</option>
                                {["Active", "Passed", "TC-Issued", "Dropped", "Failed"].map((s, idx) => (
                                    <option key={idx} value={s}>{s}</option>
                                ))}
                            </select>
                        );
                    }
                    
                    if (fieldDef && fieldDef.fieldType === 'select') {
                        return (
                            <select className="form-select form-select-sm" style={{ flex: '1' }} value={searchText} onChange={(e) => setSearchText(e.target.value)}>
                                <option value="">Select Option</option>
                                {(fieldDef.options || []).map((option, idx) => (
                                    <option key={idx} value={option}>{option}</option>
                                ))}
                            </select>
                        );
                    }

                    if (selectedField === 'gender') {
                        return (
                            <select className="form-select form-select-sm" style={{ flex: '1' }} value={searchText} onChange={(e) => setSearchText(e.target.value)}>
                                <option value="">Select Gender</option>
                                {["Male", "Female"].map((g, idx) => (
                                    <option key={idx} value={g}>{g}</option>
                                ))}
                            </select>
                        );
                    }

                    return (
                        <input
                            type="text"
                            placeholder="Filter value"
                            className="SearchStudent"
                            style={{ flex: '1' }}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    );
                })()}

                <button 
                    type="button" 
                    className="btn" 
                    onClick={handleAddFilter}
                >
                    <i className="fa-solid fa-filter me-1"></i>Add Filter
                </button>

                <button 
                    type="button" 
                    className="btn" 
                    onClick={() => {
                        setSelectedField('');
                        setSearchText('');
                        setFilters([]);
                    }}
                >
                    <i className="fa-solid fa-xmark me-1"></i>Reset
                </button>

                {children}
            </div>

            {/* Display active filter tag lists */}
            {filters.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-2 p-2 bg-light rounded border">
                    <span className="small text-muted fw-bold align-self-center me-1">Active filters:</span>
                    {filters.map((f, idx) => {
                        const name = personalInfoList.find(pi => pi.fieldKey === f.field) ? personalInfoList.find(pi => pi.fieldKey === f.field).fieldName : f.field;
                        return (
                            <span key={idx} className="badge bg-warning text-dark p-2 d-flex align-items-center gap-2 rounded" style={{ padding: '7px 10px', borderRadius: '10px', fontWeight: 'bold' }}>
                                <span>{name}: {f.value}</span>
                                <button type="button" className="btn-close btn-close-sm ms-2" onClick={() => handleRemoveFilter(idx)} />
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
