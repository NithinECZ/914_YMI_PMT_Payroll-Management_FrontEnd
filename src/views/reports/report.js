import React, { useState, useEffect, useMemo, useCallback } from "react";
import '../../assets/CSS/Report.css';
import DataTable from "react-data-table-component";
import {CCard,CCardBody,CRow,CCol,CFormSelect,CButton,CFormInput,CSpinner,} from "@coreui/react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { FiDownload } from "react-icons/fi";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import usePrivilege from "../hooks/usePrivilege";
import API from '../../api.js';

// customStyles — exact same object used in EmailMaster / CategoryMaster / SkillMaster,
// with whiteSpace: "normal" added on headCells so long report headers wrap instead of
// getting cut off (everything else identical to those masters).
const customStyles = {
    rows: { style: { minHeight: "42px" } },
    headCells: {
        style: {
            justifyContent: "flex-start",
            fontSize: "12px",
            fontWeight: "700",
            letterSpacing: "0.6px",
            paddingTop: "6px",
            paddingBottom: "6px",
            background: "#f1f4f9",
            textTransform: "uppercase",
            whiteSpace: "normal",
            wordBreak: "break-word",
        },
    },
    cells: {
        style: {
            justifyContent: "flex-start",
            fontSize: "13px",
            paddingTop: "0px",
            paddingBottom: "0px",
        },
    },
};

const paginationRowsPerPageOptions = [10, 25, 50, 100];
const paginationComponentOptions = {
    rowsPerPageText: "Rows per page",
    rangeSeparatorText: "of",
    selectAllRowsItem: true,
    selectAllRowsItemText: "All",
};

// 👈 every category cell comes from the backend as "obtained/total"
// (e.g. "12/15") or "NA" (that attempt had no question assigned in that category).
// This just renders that string with NA styled differently — no calculation here,
// backend already did the obtained/total math per attempt (see ReportService).
const ScoreCell = ({ value }) => {
    if (!value || value === "NA") {
        return <span className="score-na">NA</span>;
    }
    return <span className="score-value">{value}</span>;
};

// 👇 colors for the attempt's Submit_Status (e.g. "Passed", "Suspended").
// This is the raw DB status of THIS specific attempt row — lets you tell a
// completed attempt apart from a still-pending/Suspended reassessment row.
const ATTEMPT_STATUS_COLORS = {
    Passed: { bg: "#e6f4ea", color: "#1e7e34" },
    Failed: { bg: "#fdecea", color: "#c62828" },
    Suspended: { bg: "#fff4e5", color: "#b26a00" },
};
const AttemptStatusBadge = ({ value }) => {
    if (!value || value === "NA") return <span className="score-na">NA</span>;
    const palette = ATTEMPT_STATUS_COLORS[value] || { bg: "#eef0f2", color: "#555" };
    return (
        <span
            style={{
                backgroundColor: palette.bg,
                color: palette.color,
                padding: "2px 10px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 600,
                whiteSpace: "nowrap",
            }}
        >
            {value}
        </span>
    );
};

// 👇 colors for the Performance Band result (Met / Partially Met / Not Met).
// Computed backend-side (ReportService + PerformanceBandHelper) by comparing:
//   - Requirement band = matched from the employee's ACTUAL department experience
//     (USER_MASTER.Experience_Years, i.e. what's set in Employee Master)
//   - Skill band        = matched from this attempt's ACHIEVED score % (Obtained %)
// against the current SKILL_MASTER rows (Experience_Range + Percentage_Range).
// 👈 NOTE: the intermediate "Skill" band label itself is no longer shown as a column —
// it was confusing (it displayed the matched score-band's raw range text, not the
// employee's real experience). Only the final Obtained % and Performance Status show now.
const PERFORMANCE_STATUS_COLORS = {
    "Met": { bg: "#e6f4ea", color: "#1e7e34" },
    "Partially Met": { bg: "#fff4e5", color: "#b26a00" },
    "Not Met": { bg: "#fdecea", color: "#c62828" },
};
const PerformanceStatusBadge = ({ value }) => {
    if (!value || value === "NA") return <span className="score-na">NA</span>;
    const palette = PERFORMANCE_STATUS_COLORS[value] || { bg: "#eef0f2", color: "#555" };
    return (
        <span
            style={{
                backgroundColor: palette.bg,
                color: palette.color,
                padding: "2px 10px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: 600,
                whiteSpace: "nowrap",
            }}
        >
            {value}
        </span>
    );
};

const Report = () => {
    const [divisions, setDivisions] = useState([]);
    const [assessments, setAssessments] = useState([]);
    const [selectedDivision, setSelectedDivision] = useState("");
    const [selectedAssessment, setSelectedAssessment] = useState("");
    const [loadingDivisions, setLoadingDivisions] = useState(false);
    const [loadingAssessments, setLoadingAssessments] = useState(false);
    const [loadingReport, setLoadingReport] = useState(false);
    const [reportRows, setReportRows] = useState([]);
    const [hasSearched, setHasSearched] = useState(false);
    const [employeeFilter, setEmployeeFilter] = useState("");
    const { privileges: userPrivileges = [] } = usePrivilege();
    const uPrivilege =userPrivileges.find((x) => x.menuName === "Report") || {};

useEffect(() => {
        const loadDivisions = async () => {
            setLoadingDivisions(true);
            try {
                const storedUser = sessionStorage.getItem("user"); // 👈 sessionStorage, key = "user"
                const employeeCode = storedUser ? JSON.parse(storedUser).employeeId : null; // 👈 field = employeeId

                if (!employeeCode) {
                    console.error("No employeeId found in session");
                    setDivisions([]);
                    setLoadingDivisions(false);
                    return;
                }

                const res = await API.get('/Report/divisions', {
                    params: { employeeCode },
                });
                setDivisions(res.data?.data ?? []);
            } catch (err) {
                console.error("Failed to load divisions", err);
                setDivisions([]);
            } finally {
                setLoadingDivisions(false);
            }
        };
        loadDivisions();
    }, []);


    useEffect(() => {
        if (!selectedDivision) {
            setAssessments([]);
            setSelectedAssessment("");
            return;
        }

        const loadAssessments = async () => {
            setLoadingAssessments(true);
            setSelectedAssessment("");
            try {
                const res = await API.get(`/report/assessments/${selectedDivision}`);
                const normalized = (res.data?.data ?? []).map((a) => ({ ...a, id: String(a.id) }));
                setAssessments(normalized);
            } catch (err) {
                console.error("Failed to load assessments", err);
                setAssessments([]);
            } finally {
                setLoadingAssessments(false);
            }
        };
        loadAssessments();
    }, [selectedDivision]);


    useEffect(() => {
        setReportRows([]);
        setEmployeeFilter("");
        setHasSearched(false);
    }, [selectedAssessment]);


    const fetchReport = useCallback(async () => {
        if (!selectedDivision || !selectedAssessment) return;
        setLoadingReport(true);
        setHasSearched(true);
        try {
            const res = await API.get('/Report/data', {
                params: {
                    divisionId: selectedDivision,
                    assessmentId: selectedAssessment,
                },
            });
            setReportRows(res.data?.data ?? []);
        } catch (err) {
            console.error("Failed to load report data", err);
            setReportRows([]);
        } finally {
            setLoadingReport(false);
        }
    }, [selectedDivision, selectedAssessment]);

    const handleSearch = () => {
        setEmployeeFilter("");
        fetchReport();
    };

    const handleCancel = () => {
        setSelectedDivision("");
        setSelectedAssessment("");
        setEmployeeFilter("");
        setAssessments([]);
        setReportRows([]);
        setHasSearched(false);
    };


    const filteredRows = useMemo(() => {
        if (!employeeFilter.trim()) return reportRows;
        const term = employeeFilter.trim().toLowerCase();
        return reportRows.filter(
            (r) =>
                r.operatorName?.toLowerCase().includes(term) ||
                r.empNo?.toLowerCase().includes(term)
        );
    }, [reportRows, employeeFilter]);


    const skillNames = useMemo(
        () => (reportRows.length ? Object.keys(reportRows[0].scores || {}) : []),
        [reportRows]
    );

    // 👇 every category column shows "obtained/total" (e.g. "12/15") or "NA" via
    // ScoreCell. Total column uses the same renderer. Columns at the end:
    //   Attempt Status      -> row.submitStatus       (Passed / Suspended / ...)
    //   Obtained %           -> row.obtainedPercentage  (this attempt's achieved score %)
    //   Performance Status    -> row.performanceStatus   (Met / Partially Met / Not Met, colored badge)
    // 👈 REMOVED — "Skill" column. It was showing the matched score-band's raw range text
    // (confusing to read), not the employee's actual experience. The employee's real
    // department experience (Employee Master) still drives the Requirement side of the
    // Met/Partially Met/Not Met calculation on the backend — it's just not its own column now.
    const columns = useMemo(
        () => [
            { name: "S.No", selector: (row) => row.sNo, width: "70px", center: true },
            { name: "EMP NO", selector: (row) => row.empNo, width: "130px", center: true },
            { name: "Operator", selector: (row) => row.operatorName, width: "160px", center: true },
            { name: "Qualification", selector: (row) => row.position, width: "140px", center: true },
            ...skillNames.map((skill) => ({
                name: skill,
                selector: (row) => row.scores?.[skill],
                cell: (row) => <ScoreCell value={row.scores?.[skill]} />,
                wrap: true,
                center: true,
                width: "110px",
            })),
            {
                name: "Reassessment",
                selector: (row) => row.retestId,
                cell: (row) => <ScoreCell value={row.retestId} />,
                center: true,
                width: "170px",
            },
            {
                name: "Total",
                selector: (row) => row.total,
                cell: (row) => <ScoreCell value={row.total} />,
                center: true,
                width: "110px",
            },
            {
                name: "Attempt Status",
                selector: (row) => row.submitStatus,
                cell: (row) => <AttemptStatusBadge value={row.submitStatus} />,
                center: true,
                width: "170px",
            },
            {
                name: "Obtained %",
                selector: (row) => row.obtainedPercentage,
                cell: (row) => <ScoreCell value={row.obtainedPercentage} />,
                center: true,
                width: "140px",
            },
            {
                name: "Performance Status",
                selector: (row) => row.performanceStatus,
                cell: (row) => <PerformanceStatusBadge value={row.performanceStatus} />,
                center: true,
                width: "200px",
            },
        ],
        [skillNames]
    );

    const handleExport = useCallback(() => {
        if (!filteredRows.length) return;
        const exportData = filteredRows.map((row) => {
            const base = {
                "S.No": row.sNo,
                "EMP NO": row.empNo,
                "Operator": row.operatorName,
                "Position": row.position,
            };
            skillNames.forEach((skill) => {
                base[skill] = row.scores?.[skill] ?? "NA";
            });
            base["Reassessment"] = row.retestId ?? "NA";
            base["Total"] = row.total ?? "NA";
            base["Attempt Status"] = row.submitStatus ?? "NA";
            base["Obtained %"] = row.obtainedPercentage ?? "NA";
            base["Performance Status"] = row.performanceStatus ?? "NA";
            return base;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
        const divisionName = divisions.find((d) => String(d.id) === String(selectedDivision))?.name ?? "Report";
        const assessmentName = assessments.find((a) => String(a.id) === String(selectedAssessment))?.name ?? "";
        const fileName = `${divisionName}_${assessmentName}_Report.xlsx`.replace(/\s+/g, "_");
        saveAs(blob, fileName);
    }, [filteredRows, skillNames, divisions, assessments, selectedDivision, selectedAssessment]);

    return (
        <div className="report-page">
            {/* headers in the grid below were getting cut off with "..." — this
                overrides the library's default ellipsis truncation on header cells
                so the full header text always shows (no logic touched, styling only) */}
            <style>{`
                .report-grid-wrapper .rdt_TableCol,
                .report-grid-wrapper .rdt_TableCol_Sortable,
                .report-grid-wrapper .rdt_TableCol div {
                    white-space: normal !important;
                    overflow: visible !important;
                    text-overflow: unset !important;
                }
            `}</style>
            <CCard className="filter-card">
                <CCardBody>
                    <CRow className="align-items-end">
                        <CCol md={3}>
                            <label>Division</label>
                            <CFormSelect
                                value={selectedDivision}
                                onChange={(e) => setSelectedDivision(e.target.value)}
                                disabled={loadingDivisions}
                            >
                                <option value="">
                                    {loadingDivisions ? "Loading divisions..." : "Select Division"}
                                </option>
                                {divisions.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </CFormSelect>
                        </CCol>
                        <CCol md={3}>
                            <label>Assessment</label>
                            <CFormSelect
                                value={selectedAssessment}
                                onChange={(e) => setSelectedAssessment(e.target.value)}
                                disabled={!selectedDivision || loadingAssessments}
                            >
                                <option value="">
                                    {!selectedDivision
                                        ? "Select Division first"
                                        : loadingAssessments
                                            ? "Loading assessments..."
                                            : "Select Assessment"}
                                </option>
                                {assessments.map((a, idx) => (
                                    <option key={idx} value={String(a.id)}>
                                        {a.name}
                                    </option>
                                ))}
                            </CFormSelect>
                        </CCol>
                        <CCol md={6} className="button-group">
                            <CButton
                                className="btn-report-primary btn-lg-report"
                                onClick={handleSearch}
                                disabled={!selectedDivision || !selectedAssessment || loadingReport}
                            >
                                {loadingReport ? <CSpinner size="sm" /> : <FaSearch />}
                                Search
                            </CButton>

                            <CButton
                                className="btn-report-secondary btn-lg-report"
                                onClick={handleCancel}
                            >
                                Clear
                            </CButton>
                        </CCol>
                    </CRow>
                </CCardBody>
            </CCard>

            <div className="table-card report-grid-wrapper">
                <div className="toolbar">
                    <CButton
                        className="btn-report-primary"
                        disabled={!reportRows.length}
                        onClick={handleExport}
                    >
                        <FiDownload /> Export to Excel
                    </CButton>
                    {/* search icon + clear (X) button — matches CategoryMaster / SkillMaster / AssessmentRuleMaster / EmailMaster */}
                    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                        <FaSearch style={{ position: "absolute", left: "12px", color: "#9ca3af", fontSize: "14px", pointerEvents: "none" }} />
                        <CFormInput
                            placeholder="Search employee..."
                            value={employeeFilter}
                            onChange={(e) => setEmployeeFilter(e.target.value)}
                            disabled={!reportRows.length}
                            style={{ paddingLeft: "36px" }}
                        />
                        {employeeFilter && (
                            <FaTimes
                                onClick={() => setEmployeeFilter("")}
                                style={{ position: "absolute", right: "12px", color: "#9ca3af", fontSize: "14px", cursor: "pointer" }}
                            />
                        )}
                    </div>
                </div>
                <DataTable
                    columns={columns}
                    data={filteredRows}
                    progressPending={loadingReport}
                    pagination
                    paginationRowsPerPageOptions={paginationRowsPerPageOptions}
                    paginationComponentOptions={paginationComponentOptions}
                    striped
                    highlightOnHover
                    responsive
                    fixedHeader
                    fixedHeaderScrollHeight="450px"
                    persistTableHead
                    customStyles={customStyles}
                    noDataComponent={
                        <div className="no-data">
                            {hasSearched
                                ? "No records found."
                                : "Select a Division and Assessment, then click Search."}
                        </div>
                    }
                />
            </div>
        </div>
    );
};

export default Report;