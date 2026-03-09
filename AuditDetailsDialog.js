import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import DOMPurify from "dompurify";
import apiClient from "@/utils/apiClient";
import { auditAdapters } from "@/utils/audit/auditAdapters";
import moment from "moment";
import {
  simplifyAuditJson,
  extractChangedFromJson,
} from "@/utils/simplifyJsonStructureHelper";

/* -------------------------------------------------- */
/* COMPONENT */
/* -------------------------------------------------- */

export default function AuditDataGrid({
  auditDialogOpen,
  setAuditDialogOpen,
  ...rest
}) {
  const auditableId = rest?.auditableId;
  const sectionId = rest?.sectionId;

  const formatStatus = (val) => {
    if (val === true) return "Active";
    if (val === false) return "Inactive";
    return val; // leave as-is for non-boolean or undefined
  };

  // Optional: generic boolean formatter if you wish to show Yes/No elsewhere
  const formatBoolean = (val) => {
    if (val === true) return "Yes";
    if (val === false) return "No";
    return val;
  };
  const [details, setDetails] = useState([]);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [usersSummary, setUsersSummary] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [auditDetailsList, setAuditDetailsList] = useState([]);
  const [auditDetailsPage, setAuditDetailsPage] = useState(1);
  const [auditDetailsPageSize] = useState(10);
  const [auditDetailsTotal, setAuditDetailsTotal] = useState(0);
  const [auditDetailsLoading, setAuditDetailsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [paginationModel, setPaginationModel] = useState({
    page: 0, // DataGrid is 0-based
    pageSize: 1,
  });

  /* -------------------------------------------------- */
  /* ADAPTER RESOLVER */
  /* -------------------------------------------------- */
  const getAdapter = () => auditAdapters?.[sectionId] ?? null;

  /* -------------------------------------------------- */
  /* EFFECT */
  /* -------------------------------------------------- */
  useEffect(() => {
    if (auditDialogOpen && auditableId && sectionId) {
      fetchSummary(0, paginationModel.pageSize);
    }
  }, [auditDialogOpen, auditableId, sectionId]);

  /* -------------------------------------------------- */
  /* FETCH SUMMARY */
  /* -------------------------------------------------- */
  // const fetchSummary = async () => {
  //   try {
  //     setLoading(true);

  //     const res = await apiClient.post("/api/audit/get-audit-summary", {
  //       auditableId,
  //       sectionId,
  //     });

  //     const adapter = getAdapter();
  //     const adapted = adapter?.adaptSummary?.(res.data?.data) ?? [];

  //     const enriched = adapted.map((u, idx) => ({
  //       id: idx + 1,
  //       ...u,
  //       userName:
  //         (u.userDetails?.first_name || "") +
  //         " " +
  //         (u.userDetails?.last_name || ""),
  //       userEmail: u.userDetails?.email || "",
  //       userOrgTypeId: u.userDetails?.organizationTypeId || 0,
  //       userOrgType: u.userDetails?.organizationType || "",
  //     }));

  //     setUsersSummary(enriched);
  //   } catch (err) {
  //     console.error("Audit summary error", err);
  //     setUsersSummary([]);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchSummary = async (
    page = paginationModel.page,
    pageSize = paginationModel.pageSize,
  ) => {
    try {
      setLoading(true);

      const res = await apiClient.post("/api/audit/get-audit-summary", {
        auditableId,
        sectionId,
        page: page + 1, // backend = 1-based
        pageSize,
      });

      const responseData = res?.data?.data || {};
      const summaryData = responseData || [];

      const adapter = getAdapter();
      const adapted = adapter?.adaptSummary?.(summaryData) ?? [];

      const offset = page * pageSize;

      const enriched = adapted.map((u, idx) => ({
        id: offset + idx + 1, // ✅ stable serial across pages
        ...u,
        userName:
          (u.userDetails?.first_name || "") +
          " " +
          (u.userDetails?.last_name || ""),
        userEmail: u.userDetails?.email || "",
        userOrgTypeId: u.userDetails?.organizationTypeId || 0,
        userOrgType: u.userDetails?.organizationType || "",
      }));

      setUsersSummary(enriched);
      setTotalRows(res?.data?.total || 0); // ✅ total from backend
    } catch (err) {
      console.error("Audit summary error", err);
      setUsersSummary([]);
      setTotalRows(0);
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------- */
  /* FETCH DETAILS */
  /* -------------------------------------------------- */
  const handleViewDetails = async (targetUserId) => {
    try {
      setAuditDetailsLoading(true);
      setAuditDetailsPage(1);
      setSelectedUserId(targetUserId);

      const res = await apiClient.post("/api/audit/get-audit-details", {
        auditableId,
        sectionId,
        userId: targetUserId,
        page: 1,
        pageSize: auditDetailsPageSize,
      });

      const { data = [], pagination = {} } = res.data || {};
      const total = pagination?.total;

      const adapter = getAdapter();
      const adapted = adapter?.adaptDetails?.(data) ?? [];

      setAuditDetailsList(adapted);
      setAuditDetailsTotal(total);
      setDetailDialogOpen(true);
    } catch (err) {
      console.error("Audit details error", err);
      setAuditDetailsList([]);
      setAuditDetailsTotal(0);
    } finally {
      setAuditDetailsLoading(false);
    }
  };

  const loadMoreAuditDetails = async () => {
    try {
      setAuditDetailsLoading(true);

      const nextPage = auditDetailsPage + 1;

      const res = await apiClient.post("/api/audit/get-audit-details", {
        auditableId,
        sectionId,
        userId: selectedUserId,
        page: nextPage,
        pageSize: auditDetailsPageSize,
      });

      const { data = [] } = res.data || {};

      const adapter = getAdapter();
      const adapted = adapter?.adaptDetails?.(data) ?? [];

      setAuditDetailsList((prev) => [...prev, ...adapted]);
      setAuditDetailsPage(nextPage);
    } catch (err) {
      console.error("Load more audit details error", err);
    } finally {
      setAuditDetailsLoading(false);
    }
  };

  /* -------------------------------------------------- */
  /* SUMMARY GRID COLUMNS (UNCHANGED) */
  /* -------------------------------------------------- */
  const columns = [
    { field: "id", headerName: "S.No", width: 100 },
    { field: "userName", headerName: "User Name", width: 160 },
    { field: "userEmail", headerName: "User Email", width: 180 },
    { field: "userOrgType", headerName: "User Type", width: 180 },
    {
      field: "totalChangedFields",
      headerName: "Total Fields Changed Till Date",
      width: 160,
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 200,
      align: "center", // aligns cell content
      headerAlign: "center", // aligns header text
      renderCell: (params) => {
        const actions = params.row?.actions || {};
        return (
          <Typography variant="body2" textAlign="center" sx={{ mt: 2 }}>
            Created: {actions.created ?? 0} | Updated: {actions.updated ?? 0}
          </Typography>
        );
      },
    },
    {
      field: "lastModified",
      headerName: "Last Modified",
      width: 200,
      renderCell: (params) =>
        params.row?.lastModified
          ? new Date(params.row.lastModified).toLocaleString()
          : "-",
    },
    {
      field: "viewDetails",
      headerName: "Details",
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => handleViewDetails(params.row?.userId)}
        >
          View
        </Button>
      ),
    },
  ];

  /* -------------------------------------------------- */
  /* HELPERS (UNCHANGED) */
  /* -------------------------------------------------- */

  const IGNORED_FIELDS = [
    "id",
    "uuid",
    "createdAt",
    "updatedAt",
    "created_by",
    "updated_by",
    "deleted_at",
    "deletedBy",
  ];

  const isEmptyObject = (obj) =>
    obj && typeof obj === "object" && Object.keys(obj).length === 0;

  const capitalize = (str) =>
    str
      ?.replace(/_/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  // const renderCellValue = (val) => {
  //   if (val == null || val === "") return "";

  //   if (Array.isArray(val)) {
  //     return val
  //       .filter(
  //         (v) => v != null && !(typeof v === "object" && isEmptyObject(v)),
  //       )
  //       .map((item, i) => (
  //         <Typography key={i} variant="body2">
  //           {renderCellValue(item)}
  //         </Typography>
  //       ));
  //   }

  //   if (typeof val === "object") {
  //     return Object.entries(val)
  //       .filter(
  //         ([k, v]) =>
  //           !IGNORED_FIELDS.includes(k) &&
  //           v != null &&
  //           !(typeof v === "object" && isEmptyObject(v)),
  //       )
  //       .map(([k, v], i) => (
  //         <Typography key={i} variant="body2">
  //           {capitalize(k)}: {renderCellValue(v)}
  //         </Typography>
  //       ));
  //   }

  //   return val.toString();
  // };

  // const renderBlank = () => (
  //   <Typography variant="body2" fontWeight="bold">
  //     Blank
  //   </Typography>
  // );

  // const renderCellValue = (val) => {
  //   // 🔹 Show bold "blank"
  //   if (val == null || val === "") return renderBlank();

  //   if (Array.isArray(val)) {
  //     if (val.length === 0) return renderBlank();

  //     const filtered = val.filter(
  //       (v) => v != null && !(typeof v === "object" && isEmptyObject(v)),
  //     );

  //     if (!filtered.length) return renderBlank();

  //     return filtered.map((item, i) => (
  //       <Typography key={i} variant="body2">
  //         {renderCellValue(item)}
  //       </Typography>
  //     ));
  //   }

  //   if (typeof val === "object") {
  //     if (isEmptyObject(val)) return renderBlank();

  //     const entries = Object.entries(val).filter(
  //       ([k, v]) =>
  //         !IGNORED_FIELDS.includes(k) &&
  //         v != null &&
  //         !(typeof v === "object" && isEmptyObject(v)),
  //     );

  //     if (!entries.length) return renderBlank();

  //     return entries.map(([k, v], i) => (
  //       <Typography key={i} variant="body2">
  //         {capitalize(k)}: {renderCellValue(v)}
  //       </Typography>
  //     ));
  //   }

  //   return val?.toString?.() || renderBlank();
  // };

  const renderBlank = () => (
    <Typography variant="body2" fontWeight="bold">
      Blank
    </Typography>
  );

  /**
   * Renders values with special-casing:
   * - If fieldKey === 'status' and val is boolean: show "Active"/"Inactive".
   * - Keeps existing behavior for arrays/objects/blank.
   */
  const isHtmlString = (str) =>
    typeof str === "string" && /<\/?[a-z][\s\S]*>/i.test(str);
  const renderCellValue = (val, fieldKey) => {
    // 🔹 Show bold "Blank"
    if (val == null || val === "") return renderBlank();

    // 🔹 Detect HTML content (like email body)
    if (typeof val === "string" && isHtmlString(val)) {
      return (
        <Box
          sx={{ maxHeight: 250, overflow: "auto" }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(val) }}
        />
      );
    }
    // 🔹 Special-case: status field → Active/Inactive
    if (fieldKey === "status") {
      const formatted = formatStatus(val);
      if (formatted == null || formatted === "") return renderBlank();
      return <Typography variant="body2">{formatted.toString()}</Typography>;
    }

    // (Optional) If you want all booleans (not just status) to be Yes/No:
    // if (typeof val === "boolean") {
    //   return <Typography variant="body2">{formatBoolean(val).toString()}</Typography>;
    // }

    if (Array.isArray(val)) {
      if (val.length === 0) return renderBlank();

      const filtered = val.filter(
        (v) => v != null && !(typeof v === "object" && isEmptyObject(v)),
      );

      if (!filtered.length) return renderBlank();

      return filtered.map((item, i) => (
        <Typography key={i} variant="body2">
          {renderCellValue(item, fieldKey)}
        </Typography>
      ));
    }

    if (typeof val === "object") {
      if (isEmptyObject(val)) return renderBlank();

      const entries = Object.entries(val).filter(
        ([k, v]) =>
          !IGNORED_FIELDS.includes(k) &&
          v != null &&
          !(typeof v === "object" && isEmptyObject(v)),
      );

      if (!entries.length) return renderBlank();

      return entries.map(([k, v], i) => (
        <Typography key={i} variant="body2">
          {capitalize(k)}: {renderCellValue(v, k /* pass child key down */)}
        </Typography>
      ));
    }

    return val?.toString?.() || renderBlank();
  };

  const formatDateIfNeeded = (key, value) => {
    if (!value) return value;

    const dateFields = ["startdate", "enddate", "createdat", "updatedat"];

    // normalize key: remove spaces + lowercase
    const normalizedKey = key.replace(/\s+/g, "").toLowerCase();

    if (dateFields.includes(normalizedKey)) {
      return moment(value).format("DD MMM YYYY");
    }

    return value;
  };
  const renderChangedTable = (changedValues) => {
    const keys = Array.from(new Set([...Object.keys(changedValues)]));

    if (!keys.length) return <Typography>No changes detected.</Typography>;

    return (
      <Box mb={2}>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          gutterBottom
          sx={{ color: HEADER_BG }}
        >
          Highlighted Changes
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: HEADER_BG }}>
              <TableCell sx={{ color: HEADER_TEXT }}>Field</TableCell>
              <TableCell sx={{ color: HEADER_TEXT }}>Old Value</TableCell>
              <TableCell sx={{ color: HEADER_TEXT }}>New Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {keys.map((k, i) => {
              const oldVal = formatDateIfNeeded(k, changedValues[k]?.oldValue);
              const newVal = formatDateIfNeeded(k, changedValues[k]?.newValue);

              return (
                <TableRow key={i}>
                  <TableCell>{capitalize(k)}</TableCell>

                  <TableCell>
                    {renderCellValue(
                      k.toLowerCase() === "status"
                        ? formatStatus(oldVal)
                        : oldVal,
                      k,
                    )}
                  </TableCell>

                  <TableCell>
                    {renderCellValue(
                      k.toLowerCase() === "status"
                        ? formatStatus(newVal)
                        : newVal,
                      k,
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    );
  };

  const HEADER_BG = "#45154F";
  const HEADER_TEXT = "#FFFFFF";

  const renderFullValuesTable = (oldValues, newValues, event) => {
    const oldS = simplifyAuditJson(oldValues);
    const newS = simplifyAuditJson(newValues);

    const keys = Array.from(
      new Set([...Object.keys(oldS), ...Object.keys(newS)]),
    );

    if (!keys.length) return <Typography>No values detected.</Typography>;

    return (
      <Box mb={2}>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          gutterBottom
          sx={{ color: HEADER_BG }}
        >
          {event === "UPDATE"
            ? "Complete Audit Values (Before & After)"
            : "Audit Values"}
        </Typography>

        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: HEADER_BG }}>
              <TableCell sx={{ color: HEADER_TEXT }}>Field</TableCell>
              {event !== "INSERT" && (
                <TableCell sx={{ color: HEADER_TEXT }}>Old Value</TableCell>
              )}
              {event !== "DELETE" && (
                <TableCell sx={{ color: HEADER_TEXT }}>New Value</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {keys.map((k, i) => (
              <TableRow key={i}>
                <TableCell>{capitalize(k)}</TableCell>
                {event !== "INSERT" && (
                  <TableCell>{renderCellValue(oldS[k])}</TableCell>
                )}
                {event !== "DELETE" && (
                  <TableCell>{renderCellValue(newS[k])}</TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  const renderFrameworkChangedTable = (frameworkChanges = []) => {
    if (!frameworkChanges.length)
      return <Typography>No framework changes detected.</Typography>;

    return (
      <Box mb={2}>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          gutterBottom
          sx={{ color: HEADER_BG }}
        >
          Framework Development Changes
        </Typography>

        {frameworkChanges.map((block, idx) => (
          <Paper key={idx} sx={{ mb: 2, p: 2 }} elevation={2}>
            <Typography fontWeight="bold">
              Indicator Type: {block.indicatorTypeName}
            </Typography>

            <Typography>Section: {block.sectionName}</Typography>

            <Typography gutterBottom>
              Indicator: {block.indicatorName}
            </Typography>

            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: HEADER_BG }}>
                  <TableCell sx={{ color: HEADER_TEXT }}>Field</TableCell>
                  <TableCell sx={{ color: HEADER_TEXT }}>Old Value</TableCell>
                  <TableCell sx={{ color: HEADER_TEXT }}>New Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {block.changes.map((change, i) => (
                  <TableRow key={i}>
                    <TableCell>{capitalize(change.field)}</TableCell>
                    <TableCell>{renderCellValue(change.oldValue)}</TableCell>
                    <TableCell>{renderCellValue(change.newValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
        ))}
      </Box>
    );
  };

  // const renderChangedTable = (changedValues) => {
  //   const flattened = extractChangedFromJson(changedValues);
  //   if (!flattened.length) return <Typography>No changes detected.</Typography>;

  //   return (
  //     <Box mb={2}>
  //       <Typography
  //         variant="subtitle1"
  //         fontWeight="bold"
  //         gutterBottom
  //         sx={{ color: HEADER_BG }}
  //       >
  //         Highlighted Changes
  //       </Typography>

  //       <Table size="small">
  //         <TableHead>
  //           <TableRow sx={{ backgroundColor: HEADER_BG }}>
  //             <TableCell sx={{ color: HEADER_TEXT }}>Field</TableCell>
  //             <TableCell sx={{ color: HEADER_TEXT }}>Old Value</TableCell>
  //             <TableCell sx={{ color: HEADER_TEXT }}>New Value</TableCell>
  //           </TableRow>
  //         </TableHead>
  //         <TableBody>
  //           {flattened.map((c, i) => (
  //             <TableRow key={i}>
  //               <TableCell>{capitalize(c.field)}</TableCell>
  //               <TableCell>{renderCellValue(c.oldValue)}</TableCell>
  //               <TableCell>{renderCellValue(c.newValue)}</TableCell>
  //             </TableRow>
  //           ))}
  //         </TableBody>
  //       </Table>
  //     </Box>
  //   );
  // };

  // const renderChangedTable = (changedValues) => {
  //   // Instead of flattening, just take keys from changedValues directly
  //   const keys = Array.from(new Set([...Object.keys(changedValues)]));

  //   if (!keys.length) return <Typography>No changes detected.</Typography>;

  //   return (
  //     <Box mb={2}>
  //       <Typography
  //         variant="subtitle1"
  //         fontWeight="bold"
  //         gutterBottom
  //         sx={{ color: HEADER_BG }}
  //       >
  //         Highlighted Changes
  //       </Typography>

  //       <Table size="small">
  //         <TableHead>
  //           <TableRow sx={{ backgroundColor: HEADER_BG }}>
  //             <TableCell sx={{ color: HEADER_TEXT }}>Field</TableCell>
  //             <TableCell sx={{ color: HEADER_TEXT }}>Old Value</TableCell>
  //             <TableCell sx={{ color: HEADER_TEXT }}>New Value</TableCell>
  //           </TableRow>
  //         </TableHead>
  //         <TableBody>
  //           {keys.map((k, i) => (
  //             <TableRow key={i}>
  //               <TableCell>{capitalize(k)}</TableCell>
  //               <TableCell>
  //                 {renderCellValue(changedValues[k]?.oldValue)}
  //               </TableCell>
  //               <TableCell>
  //                 {renderCellValue(changedValues[k]?.newValue)}
  //               </TableCell>
  //             </TableRow>
  //           ))}
  //         </TableBody>
  //       </Table>
  //     </Box>
  //   );
  // };

  return (
    <>
      {/* SUMMARY DIALOG */}
      <Dialog
        open={auditDialogOpen}
        fullWidth
        maxWidth="lg"
        onClose={() => setAuditDialogOpen(false)}
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            backgroundColor: "#45154F",
            color: "#FFF",
            mb: 2,
          }}
        >
          Audit Summary
        </DialogTitle>
        <DialogContent>
          <DataGrid
            autoHeight
            rows={usersSummary}
            columns={columns}
            loading={loading}
            pagination
            paginationMode="server"
            rowCount={totalRows}
            pageSizeOptions={[1, 5, 10, 20]}
            paginationModel={paginationModel}
            onPaginationModelChange={(newModel) => {
              if (
                newModel.page !== paginationModel.page ||
                newModel.pageSize !== paginationModel.pageSize
              ) {
                setPaginationModel(newModel);
                fetchSummary(newModel.page, newModel.pageSize);
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setAuditDialogOpen(false)}
            variant="contained"
            sx={{ backgroundColor: "#45154F", color: "#fff" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* DETAILS DIALOG */}
      <Dialog
        open={detailDialogOpen}
        fullWidth
        maxWidth="lg"
        onClose={() => setDetailDialogOpen(false)}
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            backgroundColor: "#45154F",
            color: "#FFF",
            mb: 2,
          }}
        >
          Audit Details
        </DialogTitle>

        <DialogContent dividers>
          {auditDetailsList.map((item, idx) => {
            const { main, subEntities = [], lastModified } = item;

            return (
              <Accordion key={idx}>
                <Tooltip
                  title="Click here to view detailed log"
                  arrow
                  placement="top"
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography sx={{ fontWeight: "bold" }}>
                      {main.auditableType || "Entity"} | Last Modified:{" "}
                      {new Date(lastModified).toLocaleString()}
                    </Typography>
                  </AccordionSummary>
                </Tooltip>

                <AccordionDetails>
                  <Paper sx={{ p: 2, mb: 2 }}>
                    {renderFullValuesTable(
                      main.oldValues,
                      main.newValues,
                      main.event,
                    )}
                  </Paper>

                  {main.event === "UPDATE" && (
                    <Paper sx={{ p: 2, mb: 2 }}>
                      {main.auditableType === "FRAMEWORK_DEVELOPMENT"
                        ? renderFrameworkChangedTable(main.changedValues)
                        : renderChangedTable(main.changedValues)}
                    </Paper>
                  )}

                  {subEntities.length > 0 && (
                    <Paper sx={{ p: 2 }}>
                      <Typography
                        variant="subtitle1"
                        fontWeight="bold"
                        gutterBottom
                      >
                        Related Entities
                      </Typography>

                      {subEntities.map((sub, i) => (
                        <Paper sx={{ p: 1, mb: 1 }} key={i}>
                          <Typography>
                            {sub.auditableType} | {sub.event} |{" "}
                            {new Date(sub.createdAt).toLocaleString()}
                          </Typography>

                          {renderFullValuesTable(
                            sub.oldValues,
                            sub.newValues,
                            sub.event,
                          )}

                          {sub.event === "UPDATE" &&
                            renderChangedTable(sub.changedValues)}
                        </Paper>
                      ))}
                    </Paper>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}

          {/* 🔹 LOAD MORE */}
          {auditDetailsList.length < auditDetailsTotal && (
            <Box textAlign="center" mt={3}>
              <Button
                variant="outlined"
                onClick={loadMoreAuditDetails}
                disabled={auditDetailsLoading}
              >
                {auditDetailsLoading ? "Loading..." : "Load More"}
              </Button>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            variant="contained"
            onClick={() => setDetailDialogOpen(false)}
            sx={{ backgroundColor: "#45154F", color: "#fff" }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
