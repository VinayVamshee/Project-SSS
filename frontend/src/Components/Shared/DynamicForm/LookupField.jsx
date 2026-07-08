import React, {
  useState,
  useEffect,
  useRef,
  useCallback
} from "react";

import { lookup as lookupAPI } from "../../../API";

export default function LookupField({
  fieldKey,
  lookup,
  value,
  onChange,
  readOnly
}) {

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  const entityName = lookup?.entity || "records";

  const fetchRecords = useCallback(async (text = "") => {

    setLoading(true);

    try {

      const res = await lookupAPI(fieldKey, text);

      const data = res.data?.data || res.data || [];

      setRecords(Array.isArray(data) ? data : []);

    } catch (err) {

      console.error(err);

      setRecords([]);

    } finally {

      setLoading(false);

    }

  }, [fieldKey]);

  useEffect(() => {

    if (!open) return;

    fetchRecords("");

  }, [open, fetchRecords]);

  useEffect(() => {

    const handler = (e) => {

      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target)
      ) {

        setOpen(false);

      }

    };

    document.addEventListener("mousedown", handler);

    return () =>
      document.removeEventListener("mousedown", handler);

  }, []);

  const handleSearch = (e) => {

    const value = e.target.value;

    setSearch(value);

    if (debounceRef.current)
      clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {

      fetchRecords(value);

    }, 300);

  };

  const handleSelect = (record) => {

  onChange(record.value);

  setSearch(record.label);

  setOpen(false);

};

  const handleClear = () => {

  onChange("");

  setSearch("");

  setRecords([]);

};

  return (
    <div className="df-lookup" ref={wrapperRef}>
      <div className="df-lookup-input-wrapper">
        <input
          type="text"
          className="df-input df-lookup-input"
          placeholder={`Search ${entityName}...`}
          value={search}
          readOnly={readOnly}
          onFocus={() => !readOnly && setOpen(true)}
          onChange={handleSearch}
          onClick={() => !readOnly && setOpen(true)}
        />

        {!readOnly && value && (
          <i
            className="fa-solid fa-xmark df-lookup-clear"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        )}

        {!readOnly && (
          <i
            className={`fa-solid ${open ? "fa-chevron-up" : "fa-chevron-down"
              } df-lookup-arrow`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((prev) => !prev);
            }}
          />
        )}
      </div>

      {open && (
        <div className="df-lookup-dropdown">
          {/* Search Box */}
          <div className="df-lookup-search">
            <input
              type="text"
              className="df-input"
              placeholder={`Search ${entityName}...`}
              value={search}
              onChange={handleSearch}
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="df-lookup-list">
            {loading && (
              <div className="df-lookup-loading">
                <div className="df-spinner" />
              </div>
            )}

            {!loading && records.length === 0 && (
              <div className="df-lookup-empty">
                No {entityName} found
              </div>
            )}

            {!loading &&
              records.map((record) => (
                <div
                  key={record.value}
                  className={`df-lookup-item ${value === record.value ? "active" : ""
                    }`}
                  onClick={() => handleSelect(record)}
                >
                  <span>{record.label}</span>

                  {value === record.value && (
                    <i className="fa-solid fa-check" />
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

}