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
  Switch,
  FormControlLabel,
   Tabs, Tab
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { DataGrid } from "@mui/x-data-grid";
import DOMPurify from "dompurify";
import moment from "moment";
import apiClient from "@/utils/apiClient";
import { auditAdapters } from "@/utils/audit/auditAdapters";
import { simplifyAuditJson } from "@/utils/simplifyJsonStructureHelper";
/* -------------------------------------------------- */
/* CONSTANTS */
/* -------------------------------------------------- */
const HEADER_BG = "#45154F";
const HEADER_TEXT = "#FFFFFF";

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

/* -------------------------------------------------- */
/* COMPONENT */
/* -------------------------------------------------- */

export default function AuditDataGrid({
  auditDialogOpen,
  setAuditDialogOpen,
  renderConfig = {},
  labelConfig = {
    "frequencyType":"Frequency Pattern"
  },
  ...rest
}) {
  const auditableId = rest?.auditableId;
  const sectionId = rest?.sectionId;

  const [usersSummary, setUsersSummary] = useState([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [auditDetailsList, setAuditDetailsList] = useState([]);
  const [auditDetailsPage, setAuditDetailsPage] = useState(1);
  const [auditDetailsTotal, setAuditDetailsTotal] = useState(0);
  const [auditDetailsLoading, setAuditDetailsLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 5,
  });

  const auditDetailsPageSize = 10;

  const [showHighlightedChanges, setShowHighlightedChanges] = useState(true);

  /* -------------------------------------------------- */
  /* HELPERS */
  /* -------------------------------------------------- */
  const capitalize = (str) =>
    str
      ?.replace(/_/g, " ")
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const getLabel = (key) => {
    console.log("LC::",labelConfig?.[key] || capitalize(key))
    return labelConfig?.[key] || capitalize(key);}

  const formatStatus = (val) => {
    if (val === true) return "Active";
    if (val === false) return "Inactive";
    return val;
  };

  const formatBoolean = (val) => {
    if (val === true) return "Yes";
    if (val === false) return "No";
    return val;
  };

  const getAdapter = () => auditAdapters?.[sectionId] ?? null;

  const formatDateIfNeeded = (key, val) => {
    if (!val) return val;
    if (key.toLowerCase().includes("date")) return moment(val).format("DD MMM YYYY");
    return val;
  };
  
  const renderAutoTable = (data, path) => {
  if (!Array.isArray(data) || !data.length) return renderBlank();

  const columns = Object.keys(data[0]).filter((c) => !IGNORED_FIELDS.includes(c));

  return (
    <Box
      sx={{
        maxWidth: 400,
        overflowX: "auto", // horizontal scroll if columns exceed width
        overflowY: "auto", // vertical scroll if rows exceed height
        maxHeight: 400,    // adjust max height as needed
        border: "1px solid #ddd",
        borderRadius: 1,
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: HEADER_BG, position: "sticky", top: 0, zIndex: 1 }}>
            {columns.map((col) => (
              <TableCell key={col} sx={{ color: HEADER_TEXT, fontWeight: "bold", minWidth: 120 }}>
                {getLabel(col)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col} sx={{ minWidth: 120 }}>
                  {renderDynamicValue(row[col], `${path}.${col}`)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};

  /* -------------------------------------------------- */
  /* FETCH SUMMARY */
  /* -------------------------------------------------- */
  const fetchSummary = async (page, pageSize) => {
    try {
      setLoading(true);

      const res = await apiClient.post("/api/audit/get-audit-summary", {
        auditableId,
        sectionId,
        page: page + 1,
        pageSize,
      });

      const adapter = getAdapter();
      const adapted = adapter?.adaptSummary?.(res.data?.data) ?? [];

      const offset = page * pageSize;

      const enriched = adapted.map((u, idx) => ({
        id: offset + idx + 1,
        ...u,
        userName:
          (u.userDetails?.first_name || "") +
          " " +
          (u.userDetails?.last_name || ""),
        userEmail: u.userDetails?.email || "",
        userOrgType: u.userDetails?.organizationType || "",
      }));

      setUsersSummary(enriched);
      setTotalRows(res?.data?.total || 0);
    } catch (err) {
      console.error("Audit summary error", err);
      setUsersSummary([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auditDialogOpen && auditableId && sectionId) {
      fetchSummary(paginationModel.page, paginationModel.pageSize);
    }
  }, [auditDialogOpen]);

  /* -------------------------------------------------- */
  /* FETCH DETAILS */
  /* -------------------------------------------------- */
  const handleViewDetails = async (userId) => {
    try {
      setAuditDetailsLoading(true);
      setSelectedUserId(userId);
      setAuditDetailsPage(1);

      const res = await apiClient.post("/api/audit/get-audit-details", {
        auditableId,
        sectionId,
        userId,
        page: 1,
        pageSize: auditDetailsPageSize,
      });

      const adapter = getAdapter();
      const adapted = adapter?.adaptDetails?.(res.data?.data) ?? [];

      setAuditDetailsList(adapted);
      setAuditDetailsTotal(res?.data?.pagination?.total || 0);

      setDetailDialogOpen(true);
    } catch (err) {
      console.error(err);
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

      const adapter = getAdapter();
      const adapted = adapter?.adaptDetails?.(res.data?.data) ?? [];

      setAuditDetailsList((prev) => [...prev, ...adapted]);
      setAuditDetailsPage(nextPage);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditDetailsLoading(false);
    }
  };

  /* -------------------------------------------------- */
  /* RENDERING HELPERS */
  /* -------------------------------------------------- */
  const renderBlank = () => (
    <Typography variant="body2" fontWeight="bold">
      Blank
    </Typography>
  );

  const getFieldConfig = (path) => renderConfig?.[path] || { type: "auto" };

  const isHtml = (str) =>
    typeof str === "string" && /<\/?[a-z][\s\S]*>/i.test(str);

  const autoRender = (value, path) => {
    if (value === null || value === undefined || value === "") return renderBlank();

    if (isHtml(value)) {
      return <Box dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} />;
    }

    if (Array.isArray(value)) {
      if (typeof value[0] === "object") return renderAutoTable(value, path);
      return value.map((v, i) => <Typography key={i}>{v}</Typography>);
    }

    if (typeof value === "object") {
      return Object.entries(value)
        .filter(([k]) => !IGNORED_FIELDS.includes(k))
        .map(([k, v]) => (
          <Typography key={k}>
            {getLabel(k)}: {renderDynamicValue(v, `${path}.${k}`)}
          </Typography>
        ));
    }

    return <Typography>{value.toString()}</Typography>;
  };

  const renderDynamicValue = (value, path) => {
    const config = getFieldConfig(path);
    const type = config.type;

    if (value == null || value === "") return renderBlank();

    switch (type) {
      case "status":
        return <Typography>{formatStatus(value)}</Typography>;
      case "boolean":
        return <Typography>{formatBoolean(value)}</Typography>;
      case "date":
        return <Typography>{moment(value).format("DD MMM YYYY")}</Typography>;
      case "html":
        return <Box sx={{ maxHeight: 250, overflow: "auto" }} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(value) }} />;
      case "list":
        return renderList(value, config, path);
      case "table":
        return renderConfigTable(value, config, path);
      case "custom":
        return config.render(value);
      default:
        return autoRender(value, path);
    }
  };

  /* -------------------------------------------------- */
  /* FULL VALUES TABLE */
  /* -------------------------------------------------- */
  const renderFullValuesTable = (oldValues, newValues, event) => {
    const oldS = simplifyAuditJson(oldValues);
    const newS = simplifyAuditJson(newValues);

    const keys = Array.from(new Set([...Object.keys(oldS), ...Object.keys(newS)]));

    return (
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: HEADER_BG }}>
            <TableCell sx={{ color: HEADER_TEXT }}>Field</TableCell>
            {event !== "INSERT" && <TableCell sx={{ color: HEADER_TEXT }}>Old Value</TableCell>}
            {event !== "DELETE" && <TableCell sx={{ color: HEADER_TEXT }}>New Value</TableCell>}
          </TableRow>
        </TableHead>

        <TableBody>
          {keys.map((k) => (
            <TableRow key={k}>
              <TableCell>{getLabel(k)}</TableCell>
              {event !== "INSERT" && <TableCell>{renderDynamicValue(oldS[k], k)}</TableCell>}
              {event !== "DELETE" && <TableCell>{renderDynamicValue(newS[k], k)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  /* -------------------------------------------------- */
  /* HIGHLIGHTED CHANGES TABLE */
  /* -------------------------------------------------- */
  const renderChangedTable = (oldValues, newValues) => {
    const oldS = simplifyAuditJson(oldValues);
    const newS = simplifyAuditJson(newValues);

    const changedKeys = Object.keys({ ...oldS, ...newS }).filter(
      (k) => oldS[k] !== newS[k]
    );

    if (!changedKeys.length)
      return <Typography>No changes detected.</Typography>;

    return (
      <Box mb={2} sx={{ overflowX: "auto" }}>
        <Typography
          variant="subtitle1"
          fontWeight="bold"
          gutterBottom
          sx={{ color: HEADER_BG }}
        >
          Highlighted Changes
        </Typography>

        <Table size="small" sx={{ minWidth: 350 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: HEADER_BG, position: "sticky", top: 0, zIndex: 1 }}>
              <TableCell sx={{ color: HEADER_TEXT, fontWeight: "bold" }}>Field</TableCell>
              <TableCell sx={{ color: HEADER_TEXT, fontWeight: "bold" }}>Old Value</TableCell>
              <TableCell sx={{ color: HEADER_TEXT, fontWeight: "bold" }}>New Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {changedKeys.map((k, i) => (
              <TableRow key={i}>
                <TableCell>{capitalize(k)}</TableCell>
                <TableCell>{renderDynamicValue(oldS[k], k)}</TableCell>
                <TableCell>{renderDynamicValue(newS[k], k)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    );
  };

  /* -------------------------------------------------- */
  /* SUMMARY GRID COLUMNS */
  /* -------------------------------------------------- */
  const columns = [
    { field: "id", headerName: "S.No", width: 90 },
    { field: "userName", headerName: "User Name", width: 160 },
    { field: "userEmail", headerName: "User Email", width: 200 },
    { field: "userOrgType", headerName: "User Type", width: 150 },
    {
      field: "actions",
      headerName: "Actions",
      width: 220,
      renderCell: (params) => {
        const actions = params.row?.actions || {};
        return (
          <Typography sx={{mt:2,fontSize:"14px"}}>
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
        params.row?.lastModified ? new Date(params.row.lastModified).toLocaleString() : "-",
    },
    {
      field: "viewDetails",
      headerName: "Details",
      width: 120,
      renderCell: (params) => (
        <Button size="small" variant="outlined" onClick={() => handleViewDetails(params.row?.userId)}>
          View
        </Button>
      ),
    },
  ];

  /* -------------------------------------------------- */
  /* RENDER */
  /* -------------------------------------------------- */
  return (
    <>
      {/* SUMMARY */}
      <Dialog
        open={auditDialogOpen}
        maxWidth="lg"
        fullWidth
        onClose={() => setAuditDialogOpen(false)}
      >
        <DialogTitle sx={{ backgroundColor: HEADER_BG, color: "#fff", fontWeight: "bold" }}>
          Audit Summary
        </DialogTitle>

        <DialogContent>
          <DataGrid
            rows={usersSummary}
            columns={columns}
            loading={loading}
            pagination
            paginationMode="server"
            rowCount={totalRows}
            paginationModel={paginationModel}
            pageSizeOptions={[5, 10, 20]}
            onPaginationModelChange={(model) => {
              setPaginationModel(model);
              fetchSummary(model.page, model.pageSize);
            }}
            autoHeight
          />
        </DialogContent>

        <DialogActions>
          <Button variant="contained" sx={{ backgroundColor: HEADER_BG }} onClick={() => setAuditDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* DETAILS */}
      <Dialog
        open={detailDialogOpen}
        maxWidth="lg"
        fullWidth
        onClose={() => setDetailDialogOpen(false)}
      >
        <DialogTitle sx={{ backgroundColor: HEADER_BG, color: "#fff", fontWeight: "bold" }}>
          Audit Details
        </DialogTitle>

        <DialogContent dividers>
          {auditDetailsList.map((item, idx) => {
            const { main, subEntities = [], lastModified } = item;

            return (
              <Accordion key={idx}>
                <Tooltip title="Click to view log">
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography fontWeight="bold">
                      {main.auditableType} | Last Modified: {new Date(lastModified).toLocaleString()}
                    </Typography>
                  </AccordionSummary>
                </Tooltip>

                <AccordionDetails>
                  {/* Toggle for Full vs Highlighted Changes */}
                 
<Box display="flex" alignItems="center" gap={2}>
  {/* Tabs control */}
  <Tabs
    value={showHighlightedChanges ? "highlighted" : "full"}
    onChange={(_, newValue) => {
      // Map tab value back to your boolean state
      setShowHighlightedChanges(newValue === "highlighted");
    }}
    aria-label="View mode tabs"
    // Optional: make tabs compact
    variant="standard"
  >
    <Tab
      label="View Highlighted Changes"
      value="highlighted"
      sx={{ textTransform: "none", minHeight: 36, minWidth: 0, paddingX: 1.5 }}
    />
    <Tab
      label="View Full Values"
      value="full"
      sx={{ textTransform: "none", minHeight: 36, minWidth: 0, paddingX: 1.5 }}
    />
  </Tabs>
</Box>


                  <Paper sx={{ p: 2, mb: 2 }}>
                    {showHighlightedChanges
                      ? renderChangedTable(main.oldValues, main.newValues)
                      : renderFullValuesTable(main.oldValues, main.newValues, main.event)}
                  </Paper>

                  {subEntities.length > 0 && (
                    <Paper sx={{ p: 2 }}>
                      <Typography fontWeight="bold">Related Entities</Typography>

                      {subEntities.map((sub, i) => (
                        <Paper sx={{ p: 2, mb: 1 }} key={i}>
                          <Typography>
                            {sub.auditableType} | {sub.event}
                          </Typography>

                          {showHighlightedChanges
                            ? renderChangedTable(sub.oldValues, sub.newValues)
                            : renderFullValuesTable(sub.oldValues, sub.newValues, sub.event)}
                        </Paper>
                      ))}
                    </Paper>
                  )}
                </AccordionDetails>
              </Accordion>
            );
          })}

          {auditDetailsList.length < auditDetailsTotal && (
            <Box textAlign="center" mt={3}>
              <Button variant="outlined" disabled={auditDetailsLoading} onClick={loadMoreAuditDetails}>
                {auditDetailsLoading ? "Loading..." : "Load More"}
              </Button>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button variant="contained" sx={{ backgroundColor: HEADER_BG }} onClick={() => setDetailDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
