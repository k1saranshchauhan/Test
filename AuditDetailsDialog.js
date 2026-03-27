import MainFormHeader from "@/src/components/DashboardUI/MainFormHeader";
import { setError, setLoader } from "@/store/slices/errorSlice";
import apiClient from "@/utils/apiClient";
import SearchTable from "../../SearchTable";
import { Box, Divider, IconButton, Tooltip, Typography,Grid } from "@mui/material";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CardConatiner2 from "../../UI/CardContainer2";
import OomfDashboardActionDialog from "../../nitiAyog/OomfDashboardActionDialog";
import ModeEditOutlineOutlinedIcon from "@mui/icons-material/ModeEditOutlineOutlined";
import {
  CheckCircle,
  HourglassEmpty,
  Undo,
  RemoveCircleOutline,
  Edit,
} from "@mui/icons-material";
import { useRouter } from "next/router";
import dayjs from "dayjs";
import ForwardedSchemesDialog from "../../nitiAyog/ForwardedSchemesDialog";
import RemoveRedEyeIcon from "@mui/icons-material/RemoveRedEye";
import EditIcon from "@mui/icons-material/Edit";
import { Tabs, Tab } from "@mui/material";
import { ReorderColumnsDialog } from "../../nitiAyog/dgqi/ReorderColumnsDialog";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import TableChartIcon from "@mui/icons-material/TableChart";
import ArticleIcon from "@mui/icons-material/Article";
import ImageIcon from "@mui/icons-material/Image";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import FilePresentIcon from "@mui/icons-material/FilePresent";
import DescriptionIcon from "@mui/icons-material/Description";
import SlideshowIcon from "@mui/icons-material/Slideshow"; // For PowerPoint
import CodeIcon from "@mui/icons-material/Code"; // For code files
import CompressedFileIcon from "@mui/icons-material/Archive";
import HistoryIcon from "@mui/icons-material/History";
import { usePrivileges } from "@/src/context/privilegeContextProvider";
import { SECTION_KEY } from "@/src/constants/privilegesSectionKeys/sectionKeys";
import CustomRemarksDialog from "../../common/CustomRemarksDialog";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import BulkForwardDialog from "../../nitiAyog/oomfForm/BulkForwardDialog";
import {
 Button,
 Autocomplete,
 TextField,
 Paper
} from "@mui/material";
import { encryptData } from "@/utils/niti/encryption";
import { oomfFrameworkId } from "@/src/constants/unified/frameworkConstants";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

const CommonDashboardNiti = () => {
  const {
    mappedPrivileges,
    hasAddAccess,
    hasEditAccess,
    hasViewAccess,
    hasAuditTrailViewAccess,
    refresh,
  } = usePrivileges(SECTION_KEY.OUTPUT_OUTCOME_STATEMENT_WITH_INDICATOR);
  const [applicationStatus, setApplicationStatus] = useState("Pending");
  const [tableDataApplication, setTableDataApplication] = useState([]);
  const [applicationCount, setApplicationCount] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openForwarded, setOpenForwarded] = useState(false);
  const [columns, setColumns] = useState([]);
  const [openBulkForwardDialog, setOpenBulkForwardDialog] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [ministryList, setMinistryList] = useState([]);
  const [selectedMinistry, setSelectedMinistry] = useState(null);
  const [departmentList, setDepartmentList] = useState([]);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const userData = useSelector((state) => state.config.userData);
  const userOrganizationType = userData?.OrganizationType?.id;
  const userMinistryIds = userData?.userRelationships[0]?.ministryIds;
  const userDepartmentIds = userData?.userRelationships[0]?.departmentIds;
  const userSchemeIds = userData?.userRelationships[0]?.schemeIds;
  const [selectedRow, setSelectedRow] = useState(null);
  const subRoleIds = [
    ...new Set(
      userData?.privileges?.flatMap(
        (item) => item.accessRights?.oomfSubRoles?.map((role) => role.id) || [],
      ) || [],
    ),
  ];

  const getFileIcon = (filename) => {
    const ext = filename?.split(".").pop()?.toLowerCase();
    if (!ext) return <InsertDriveFileIcon sx={{ color: "gray" }} />;

    switch (ext) {
      case "pdf":
        return <PictureAsPdfIcon sx={{ color: "#D32F2F" }} />;
      case "xls":
      case "xlsx":
      case "csv":
        return <TableChartIcon sx={{ color: "#2E7D32" }} />;
      case "doc":
      case "docx":
      case "rtf":
        return <ArticleIcon sx={{ color: "#1565C0" }} />;
      case "ppt":
      case "pptx":
        return <SlideshowIcon sx={{ color: "#D44726" }} />; // Distinct color for PowerPoint
      case "png":
      case "jpg":
      case "jpeg":
      case "gif":
      case "bmp":
      case "tiff":
      case "webp":
        return <ImageIcon sx={{ color: "#FBC02D" }} />;
      case "txt":
      case "log":
        return <DescriptionIcon sx={{ color: "#6A1B9A" }} />;
      case "json":
      case "xml":
      case "html":
      case "css":
      case "js":
        return <CodeIcon sx={{ color: "#4A148C" }} />; // Icon for code/structured text
      case "mp3":
      case "wav":
      case "mp4":
      case "mpeg":
        return <FilePresentIcon sx={{ color: "#00838F" }} />; // Generic media icon
      case "zip":
      case "rar":
      case "7z":
        return <CompressedFileIcon sx={{ color: "#BF360C" }} />; // Icon for compressed files
      default:
        return <FilePresentIcon sx={{ color: "#78909C" }} />;
    }
  };
  const FILE_SERVER_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}api/public/download-file/`;

  // set first role as default
  const [activeSubRoleId, setActiveSubRoleId] = useState(subRoleIds[0] ?? null);
  const [columnVisibilityModel, setColumnVisibilityModel] = useState({});
  const [tempColumns, setTempColumns] = useState([]);
  const [openReorder, setOpenReorder] = useState(false);
  const [tempOrder, setTempOrder] = useState({});
  const router = useRouter();
  const dispatch = useDispatch();
  const route = useRouter();
  const subRoleLabels = {
    1: "Planner",
    2: "Approver",
    3: "Reporter",
    // extend as needed
  };

  const handleOpen = (row) => {
    setSelectedRow(row);
    if (applicationStatus === "Pending") {
      setOpen(true);
    } else {
      setOpenForwarded(true);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setSelectedRow(null);
  };

  const buildPayload = () => ({
    subRoleIds: activeSubRoleId ? [activeSubRoleId] : [],
    orgTypeId: Number(userData?.OrganizationType?.id) || 0,
    ...(applicationStatus === "Pending" &&
      [11, 12, 13].includes(userOrganizationType) && {
        ministryId: selectedMinistry?.id,
        departmentId: selectedDepartment?.id,
      }),
  });

  const filterSchemesByAssociatedFramework = (data = [], frameworkId) => {
    if (!Array.isArray(data) || !frameworkId) return [];

    return data.filter((item) => {
      const details =
        item?.submissionData?.jsonData?.schemeFinancialYearWiseBudgetDetails ||
        [];

      return details.some((fy) =>
        fy?.associatedFrameworks?.some(
          (framework) => Number(framework.id) === Number(frameworkId),
        ),
      );
    });
  };

  // 🔹 Map normal API data (old endpoints)
  const mapNormalApiDataToTable = (data, status, notStartedCondition) => {
    return (data || []).map((item, index) => ({
      id: index + 1,
      submissionId: item.submissionId,
      ministry: item?.submissionData?.form_values?.ministryId?.name || "-",
      department: item?.submissionData?.form_values?.departmentId?.name || "-",
      scheme: item.submissionData?.isParentScheme
        ? item.submissionData?.form_values?.schemeId?.name || "-"
        : item.submissionData?.form_values?.subSchemeId?.name || "-",
      isParentScheme: Boolean(item.submissionData?.isParentScheme),
      financialYear: item.submissionData?.form_values?.financialYear || "-",
      submittedOn: item.submissionData?.updated_on
        ? dayjs(item.submissionData.updated_on).format("DD-MM-YYYY")
        : item.submissionData?.submission_on
          ? dayjs(item.submissionData.submission_on).format("DD-MM-YYYY")
          : "-",

      budgetCategory: (() => {
        const value = item.submissionData?.form_values?.financialOutlay;
        if (value === null || value === undefined || value === "") return "-";
        return value % 1 !== 0 ? Number(value.toFixed(2)) : value;
      })(),
      status:
        notStartedCondition && item?.submissionData?.mappingDone === false
          ? "Mapping Pending"
          : item?.submissionData?.status,
      userName:
        item?.submissionData?.User?.first_name +
        " " +
        item?.submissionData?.User?.last_name,
      permission: item.toWorkflow || item.submissionData?.workflow || null,
      atStage: notStartedCondition ? "Planner DMEO" : item.toLabel || "-",
      remarks: item?.fromRemarks || "-",
      forwardedTo: item.toLabel || "-",
      documents: item?.fromDocumentIds,
      previousRecords: item.previousRecords || [],
      budgetPhase:
        item?.toWorkflow?.permission?.isPostBudget === true ? "PRE" : "POST",
    }));
  };

  // 🔹 Map special API data (new flat structure)
  const mapSpecialApiDataToTable = (data, status) => {
    return (data || []).map((item, index) => ({
      id: index + 1,
      submissionId: item.id,
      ministry: item?.form_values?.ministryId?.name || "-",
      department: item?.form_values?.departmentId?.name || "-",
      scheme: item.isParentScheme
        ? item.form_values?.schemeId?.name || "-"
        : item.form_values?.subSchemeId?.name || "-",
      isParentScheme: Boolean(item.isParentScheme),
      financialYear: item.form_values?.financialYear || "-",
      submittedOn: item.submission_on
        ? dayjs(item.submission_on).format("DD-MM-YYYY")
        : "-",
      budgetCategory: (() => {
        const value = item.form_values?.financialOutlay;
        if (value === null || value === undefined || value === "") return "-";
        return value % 1 !== 0 ? Number(value.toFixed(2)) : value;
      })(),
      remarks: item?.workflow?.forwardStep?.[0]?.fromRemarks,
      documents: item?.workflow?.forwardStep?.[0]?.fromDocumentIds,
      status: item.status || status,
      permission: item.workflow || null,
      atStage: item.workflow?.label || "-",
      forwardedTo: item.workflow?.label || "-",
      previousRecords: [], // special API doesn’t include previous records
    }));
  };
  const mapNotStartedApiDataToTable = (data) => {
    return (data || []).map((item, index) => {
      const submission = item.submissionData || {};
      return {
        id: index + 1,
        submissionId: submission.id, // will be null for NotStarted
        ministry: submission.jsonData?.ministryId?.name || "-",
        department:
          submission.jsonData?.parentName?.name ||
          submission.jsonData?.departmentId?.name ||
          "-",
        scheme: submission.schemeName || "-",
        isParentScheme: !!submission.parentScheme,
        financialYear: submission.financialYear || "-",
        submittedOn: "-", // Not started, so no submission date
        budgetCategory: (() => {
          const value = submission.financialOutlay;
          if (value === null || value === undefined || value === "") return "-";
          return value % 1 !== 0 ? Number(value.toFixed(2)) : value;
        })(),

        status: submission.status || "NotStarted",
        permission: null,
        atStage: "-", // Not started yet
        forwardedTo: "-", // Not started yet
        previousRecords: [], // No previous records
      };
    });
  };
  const mapDraftApiDataToTable = (data) => {
    return (data || []).map((item, index) => {
      const submission = item.metaData || {};
      return {
        id: index + 1,
        draftId: item?.id,
        submissionId: submission.id, // will be null for NotStarted
        ministry: submission.ministryId?.name || "-",
        department: submission.departmentId?.name || "-",
        scheme: submission.schemeId?.name || "-",
        isParentScheme: item.subSchemeId === null,
        financialYear: submission.financialYear || "-",
        submittedOn: "-", // Not started, so no submission date

        budgetCategory: (() => {
          const value = submission.financialOutlay;
          if (value === null || value === undefined || value === "") return "-";
          return value % 1 !== 0 ? Number(value.toFixed(2)) : value;
        })(),
        remarks: item?.fromRemarks || "-",

        status: submission.status || "Draft",
        permission: null,
        atStage: "-", // Not started yet
        forwardedTo: "-", // Not started yet
        previousRecords: [], // No previous records
      };
    });
  };

  const getRoleFlags = () => {
    const orgTypeId = Number(userData?.orgType_id) || 0;
    const subRoleId = activeSubRoleId;

    return {
      orgTypeId,
      subRoleId,
      isSpecialReporter:
        [10, 11, 12, 1, 2, 3, 4, 9].includes(orgTypeId) && subRoleId === 3,

      isNotStartedUser: [10, 11, 1, 9].includes(orgTypeId) && subRoleId === 1,

      canSeeDraft: subRoleId === 1 && [10, 11, 1, 9].includes(orgTypeId),
    };
  };

  const fetchApiData = async (url, payload) => {
    const res = await apiClient.post(url, payload);
    return res?.data?.data || [];
  };

  // 🔹 Updated getData function
  const getData = async () => {
    if (!userData) return;

    setIsLoading(true);
    try {
      const payload = buildPayload();
      const { isSpecialReporter, isNotStartedUser, canSeeDraft } =
        getRoleFlags();

      // 🔵 1. DRAFT
      if (canSeeDraft && applicationStatus === "Draft") {
        const moduleId = mappedPrivileges?.sectionId;
        const userId = userData?.id;

        if (!moduleId || !userId) return;

        const draftData = await fetchApiData(
          "/api/master/fetch-draft-records",
          { moduleId, userId },
        );

        setTableDataApplication(mapDraftApiDataToTable(draftData));
        return;
      }

      // 🔵 2. SPECIAL REPORTER
      if (isSpecialReporter) {
        const statusMap = {
          Pending: "pending",
          InProgress: "inprogress",
          Completed: "completed",
        };

        const data = await fetchApiData(
          "api/oomf/dashboard/get-status-based-schemes-reporter",
          payload,
        );

        const key = statusMap[applicationStatus] || "pending";
        const list = data[key] || [];

        setTableDataApplication(
          mapSpecialApiDataToTable(list, applicationStatus),
        );
        return;
      }

      // 🔵 3. PENDING + UNFORWARDED (ORG 1/9, SUBROLE 1)
      if (applicationStatus === "Pending" && isNotStartedUser) {
        const [unforwarded, pending] = await Promise.all([
          fetchApiData("api/oomf/dashboard/get-unforwarded-schemes", payload),
          fetchApiData("api/oomf/dashboard/get-pending-schemes", payload),
        ]);

        setTableDataApplication(
          mapNormalApiDataToTable(
            [...unforwarded, ...pending],
            "Pending",
            true,
          ),
        );
        return;
      }

      // 🔵 4. NOT STARTED
      if (applicationStatus === "NotStarted" && isNotStartedUser) {
        const data = await fetchApiData(
          "api/oomf/dashboard/get-not-started-schemes",
          payload,
        );

        setTableDataApplication(
          mapNotStartedApiDataToTable(
            filterSchemesByAssociatedFramework(data, oomfFrameworkId),
            "NotStarted",
          ),
        );
        return;
      }

      // 🔵 5. NORMAL FLOW
      const endpoint =
        applicationStatus === "Pending"
          ? "api/oomf/dashboard/get-pending-schemes"
          : "api/oomf/dashboard/get-forwarded-schemes";

      const data = await fetchApiData(endpoint, payload);

      setTableDataApplication(
        mapNormalApiDataToTable(
          applicationStatus === "Pending" ? data : data.latestRecord || [],
          applicationStatus,
          isNotStartedUser,
        ),
      );
    } catch (error) {
      console.error(error);
      dispatch(setError(error?.message || "Failed to fetch data"));
      setTableDataApplication([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 Fetch counts
  const getDataCount = async () => {
    if (!userData) return;

    setIsLoading(true);
    try {
      const payload = buildPayload();
      const { isSpecialReporter, isNotStartedUser, canSeeDraft } =
        getRoleFlags();

      let counts = [];

      // 🔵 1. SPECIAL REPORTER
      if (isSpecialReporter) {
        const data = await fetchApiData(
          "api/oomf/dashboard/get-status-based-schemes-reporter",
          payload,
        );

        counts = [
          { status: "Pending", count: data.pending?.length || 0 },
          { status: "InProgress", count: data.inprogress?.length || 0 },
          { status: "Completed", count: data.completed?.length || 0 },
        ];

        setApplicationCount(counts);
        return;
      }

      // 🔵 2. NORMAL COUNTS
      const [unforwarded, pending, forwarded] = await Promise.all([
        isNotStartedUser
          ? fetchApiData("api/oomf/dashboard/get-unforwarded-schemes", payload)
          : [],
        fetchApiData("api/oomf/dashboard/get-pending-schemes", payload),
        fetchApiData("api/oomf/dashboard/get-forwarded-schemes", payload),
      ]);

      const mergedPending = isNotStartedUser
        ? [...pending, ...unforwarded]
        : pending;

      counts.push(
        { status: "Pending", count: mergedPending.length },
        { status: "Forwarded", count: forwarded?.latestRecord?.length || 0 },
      );

      // 🔵 3. NOT STARTED
      if (isNotStartedUser) {
        const notStarted = await fetchApiData(
          "api/oomf/dashboard/get-not-started-schemes",
          payload,
        );

        counts.unshift({
          status: "NotStarted",
          count: filterSchemesByAssociatedFramework(notStarted, oomfFrameworkId)
            ?.length,
        });
      }

      // 🔵 4. DRAFT
      if (canSeeDraft) {
        const moduleId = mappedPrivileges?.sectionId;
        const userId = userData?.id;

        if (moduleId && userId) {
          const drafts = await fetchApiData("/api/master/fetch-draft-records", {
            moduleId,
            userId,
          });

          counts.unshift({ status: "Draft", count: drafts.length });
        }
      }

      setApplicationCount(counts);
    } catch (error) {
      console.error(error);
      dispatch(setError(error?.message || "Failed to fetch counts"));
      setApplicationCount([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!activeSubRoleId || !userData) return;

    getData();
    getDataCount();
  }, [applicationStatus, activeSubRoleId, userData]);

    useEffect(() => {
    if (!activeSubRoleId || !userData) return;
    if(applicationStatus === "Pending" && [11,12,13].includes(userOrganizationType)){
    getData();
    }
  }, [selectedMinistry,selectedDepartment]);

  useEffect(() => {
    if (userData?.privileges?.length) {
      const roles =
        userData.privileges.flatMap(
          (item) => item.accessRights?.oomfSubRoles?.map((r) => r.id) || [],
        ) || [];
      if (roles.length > 0) setActiveSubRoleId(roles[0]);
    }
  }, [userData]);

  const baseColumns = [
    {
      field: "id",
      headerName: "S.No",
      headerClassName: "super-app-theme--header",
      width: 80,
    },
    {
      field: "financialYear",
      headerName: "Financial Year",
      width: 150,
      headerClassName: "super-app-theme--header",
      headerAlign: "left",
      align: "left",
    },
    {
      field: "ministry",
      headerName: "Ministry Name",
      flex: 1,
      minWidth: 200,
      headerClassName: "super-app-theme--header",
      headerAlign: "left",
      align: "left",
    },
    {
      field: "department",
      headerName: "Department Name",
      flex: 1,
      minWidth: 200,
      headerClassName: "super-app-theme--header",
      headerAlign: "left",
      align: "left",
    },
    {
      field: "scheme",
      headerName: "Scheme Name",
      flex: 1,
      minWidth: 200,
      headerClassName: "super-app-theme--header",
      headerAlign: "left",
      align: "left",
    },
    {
      field: "isParentScheme",
      headerName: "Is Parent Scheme",
      width: 170,
      headerClassName: "super-app-theme--header",
      headerAlign: "left",
      align: "left",
      renderCell: (params) => (params.value ? "Yes" : "No"),
    },
    {
      field: "budgetCategory",
      headerName: "Budget (In Cr.)",
      width: 150,
      headerClassName: "super-app-theme--header",
      headerAlign: "left",
      align: "left",
    },
  ];
  const handleViewAuditTrail = async (row) => {
    if (!row?.id || !auditTrailPrivileges?.sectionId) return;

    setAuditParams({
      auditableId: String(row.id),
      sectionId: auditTrailPrivileges.sectionId,
    });
    setAuditDialogOpen(true);
  };

  const auditTrailColumn = {
    field: "viewAuditTrail",
    headerName: "Audit Trail",
    width: 160,
    sortable: false,
    renderCell: (params) => (
      <Tooltip title="View Audit Trail">
        <IconButton
          onClick={() => handleViewAuditTrail(params.row)}
          color="primary"
          size="small"
        >
          <HistoryIcon />
        </IconButton>
      </Tooltip>
    ),
  };

  const getColumnsForStatus = (status) => {
    switch (status) {
      case "Pending":
        return [
          ...baseColumns,
          {
            field: "status",
            headerName: "Status",
            width: 150,
            headerClassName: "super-app-theme--header",
          },
          {
            field: "atStage",
            headerName: "Stage",
            width: 150,
            headerClassName: "super-app-theme--header",
            headerAlign: "left",
            align: "left",
          },
          {
            field: "documents",
            headerName: "Documents",
            headerClassName: "super-app-theme--header",
            width: 150,
            renderCell: (params) => {
              const docs = params.row?.documents || [];

              return docs.length > 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    overflow: "hidden",
                    height: "100%",
                  }}
                >
                  {docs.map((doc, index) => {
                    const fileName = doc?.name;
                    const filePath = doc?.originalName;
                    const fileUrl = `${FILE_SERVER_URL}${doc?.downloadId}`;
                    return (
                      <Tooltip key={index} title={fileName}>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginRight: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                            verticalAlign: "middle",
                          }}
                        >
                          {getFileIcon(filePath)}
                        </a>
                      </Tooltip>
                    );
                  })}
                </Box>
              ) : (
                "No Attachment"
              );
            },
            sortComparator: () => 0, // prevent sorting error on arrays
          },
          {
            field: "submittedOn",
            headerName: "Submitted On",
            width: 150,
            headerClassName: "super-app-theme--header",
            headerAlign: "left",
            align: "left",
          },
          {
            field: "remarks",
            headerName: "Remarks",
            width: 100,
            headerClassName: "super-app-theme--header",
            headerAlign: "left",
            align: "left",
            sortable: false,
            filterable: false,

            renderCell: (params) => {
              const value = params.value;
              if (!value) return "-";

              return (
                <CustomRemarksDialog
                  title="Remarks"
                  content={
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {value}
                    </Typography>
                  }
                  trigger={
                    <Tooltip title="View Remarks">
                      <IconButton size="small" sx={{ color: "#45154F" }}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                />
              );
            },
          },
          {
            field: "action",
            headerName: "Action",
            flex: 0.6,
            minWidth: 100,
            headerClassName: "super-app-theme--header",
            renderCell: (params) => (
              <Tooltip title="Take Action">
                <IconButton
                  onClick={() => {
                    handleOpen(params?.row);
                  }}
                >
                  <MoreHorizIcon />
                </IconButton>
              </Tooltip>
            ),
          },
          ...(hasAuditTrailViewAccess ? [auditTrailColumn] : []),
        ];
      case "InProgress":
        return [
          ...baseColumns,
          {
            field: "submittedOn",
            headerName: "Submitted On",
            width: 150,
            headerClassName: "super-app-theme--header",
          },
          {
            field: "status",
            headerName: "Status",
            width: 150,
            headerClassName: "super-app-theme--header",
          },
          {
            field: "remarks",
            headerName: "Remarks",
            width: 100,
            headerClassName: "super-app-theme--header",
            headerAlign: "left",
            align: "left",
            sortable: false,
            filterable: false,

            renderCell: (params) => {
              const value = params.value;
              if (!value) return "-";

              return (
                <CustomRemarksDialog
                  title="Remarks"
                  content={
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {value}
                    </Typography>
                  }
                  trigger={
                    <Tooltip title="View Remarks">
                      <IconButton size="small" sx={{ color: "#45154F" }}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                />
              );
            },
          },
          {
            field: "documents",
            headerName: "Documents",
            width: 150,
            headerClassName: "super-app-theme--header",
            renderCell: (params) => {
              const docs = params.row?.documents || [];

              return docs?.length > 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    overflow: "hidden",
                    height: "100%",
                  }}
                >
                  {docs?.map((doc, index) => {
                    const fileName = doc?.name;
                    const filePath = doc?.originalName;
                    const fileUrl = `${FILE_SERVER_URL}${doc?.downloadId}`;
                    return (
                      <Tooltip key={index} title={fileName}>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginRight: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                            verticalAlign: "middle",
                          }}
                        >
                          {getFileIcon(filePath)}
                        </a>
                      </Tooltip>
                    );
                  })}
                </Box>
              ) : (
                "No Attachment"
              );
            },
            sortComparator: () => 0, // prevent sorting error on arrays
          },
          {
            field: "action",
            headerName: "Edit Progress",
            flex: 0.8,
            minWidth: 150,
            headerClassName: "super-app-theme--header",
            renderCell: (params) => (
              <Tooltip title="Edit Progress">
                <IconButton
                  sx={{ color: "#45154F" }}
                  // onClick={() => {
                  //   // Redirect to a URL with submissionId as query param
                  //   router.push({
                  //     pathname: "/niti/update-indicator-progress",
                  //     query: { id: params.row.submissionId, isEdit: true },
                  //   });
                  // }}
                  onClick={() => {
                    const token = encryptData({
                      id: params?.row?.submissionId,
                      isEdit: true,
                    });

                    router.push({
                      pathname: "/niti/update-indicator-progress",
                      query: { tk: token },
                    });
                  }}
                >
                  <EditIcon />
                </IconButton>
              </Tooltip>
            ),
          },
          {
            field: "view",
            headerName: "History",
            flex: 0.8,
            minWidth: 150,
            headerClassName: "super-app-theme--header",
            renderCell: (params) => (
              <Tooltip title="View Previous Records">
                <IconButton onClick={() => handleOpen(params.row)}>
                  <MoreHorizIcon />
                </IconButton>
              </Tooltip>
            ),
          },
        ];
      case "Completed":
        return [
          ...baseColumns,
          {
            field: "submittedOn",
            headerName: "Submitted On",
            width: 150,
            headerClassName: "super-app-theme--header",
          },
          {
            field: "status",
            headerName: "Status",
            width: 150,
            headerClassName: "super-app-theme--header",
          },
          {
            field: "documents",
            headerName: "Documents",
            width: 150,
            headerClassName: "super-app-theme--header",
            renderCell: (params) => {
              const docs = params.row?.documents || [];

              return docs.length > 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    flexWrap: "nowrap",
                    overflow: "hidden",
                    height: "100%",
                  }}
                >
                  {docs.map((doc, index) => {
                    const fileName = doc?.name;
                    const filePath = doc?.originalName;
                    const fileUrl = `${FILE_SERVER_URL}${doc?.downloadId}`;
                    return (
                      <Tooltip key={index} title={fileName}>
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            marginRight: 6,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            lineHeight: 1,
                            verticalAlign: "middle",
                          }}
                        >
                          {getFileIcon(filePath)}
                        </a>
                      </Tooltip>
                    );
                  })}
                </Box>
              ) : (
                "No Attachment"
              );
            },
            sortComparator: () => 0, // prevent sorting error on arrays
          },
          {
            field: "remarks",
            headerName: "Remarks",
            width: 100,
            headerClassName: "super-app-theme--header",
            headerAlign: "left",
            align: "left",
            sortable: false,
            filterable: false,

            renderCell: (params) => {
              const value = params.value;
              if (!value) return "-";

              return (
                <CustomRemarksDialog
                  title="Remarks"
                  content={
                    <Typography
                      variant="body2"
                      sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                    >
                      {value}
                    </Typography>
                  }
                  trigger={
                    <Tooltip title="View Remarks">
                      <IconButton size="small" sx={{ color: "#45154F" }}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                />
              );
            },
          },
          {
            field: "viewProgress",
            headerName: "View Progress",
            flex: 0.8,
            minWidth: 150,
            headerClassName: "super-app-theme--header",
            renderCell: (params) => (
              <Tooltip title="View Progress">
                <IconButton
                  size="small"
                  sx={{ color: "#45154F" }}
                  // onClick={() => {
                  //   // Redirect to a URL with submissionId as query param
                  //   router.push({
                  //     pathname: "/niti/update-indicator-progress",
                  //     query: { id: params.row.submissionId, isEdit: false },
                  //   });
                  // }}
                  onClick={() => {
                    const token = encryptData({
                      id: params?.row?.submissionId,
                      isEdit: false,
                    });

                    router.push({
                      pathname: "/niti/update-indicator-progress",
                      query: { tk: token },
                    });
                  }}
                >
                  <RemoveRedEyeIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ),
          },
          {
            field: "view",
            headerName: "History",
            flex: 0.8,
            minWidth: 150,
            headerClassName: "super-app-theme--header",
            renderCell: (params) => (
              <Tooltip title="View Previous Records">
                <IconButton onClick={() => handleOpen(params.row)}>
                  <MoreHorizIcon />
                </IconButton>
              </Tooltip>
            ),
          },
        ];
      case "NotStarted":
        return [
          ...baseColumns,
          {
            field: "status",
            headerName: "Status",
            width: 150,
            headerClassName: "super-app-theme--header",
          },
        ];
      case "Draft":
        return [
          ...baseColumns,
          {
            field: "status",
            headerName: "Status",
            width: 150,
            headerClassName: "super-app-theme--header",
          },
          {
            field: "action",
            headerName: "Action",
            flex: 0.6,
            minWidth: 150,
            headerClassName: "super-app-theme--header",
            renderCell: (params) => (
              <Tooltip title="Edit Draft">
                <ModeEditOutlineOutlinedIcon
                  sx={{ cursor: "pointer", color: "#45154F" }}
                  onClick={() => {
                    const token = encryptData({
                      id: params?.row?.draftId,
                      mode: params?.row?.status?.toLowerCase(), // draft
                    });

                    router.push({
                      pathname: params?.row?.isParentScheme
                        ? "/niti/create-output-outcomes"
                        : "/niti/create-sub-scheme-op-oc",
                      query: { tk: token },
                    });
                  }}
                >
                  <MoreHorizIcon />
                </ModeEditOutlineOutlinedIcon>
              </Tooltip>
            ),
          },
        ];
      default: // Forwarded / other
        return [
          ...baseColumns,
          {
            field: "forwardedTo",
            headerName: "Forwarded To",
            width: 150,
            headerClassName: "super-app-theme--header",
          },
          {
            field: "submittedOn",
            headerName: "Submitted On",
            width: 150,
            headerClassName: "super-app-theme--header",
          },
          {
            field: "view",
            headerName: "History",
            flex: 0.8,
            minWidth: 150,
            headerClassName: "super-app-theme--header",
            renderCell: (params) => (
              <Tooltip title="View Previous Records">
                <IconButton onClick={() => handleOpen(params.row)}>
                  <MoreHorizIcon />
                </IconButton>
              </Tooltip>
            ),
          },
        ];
    }
  };

  const icons = [
    //  Draft
    {
      icon: <Edit fontSize="large" />,
      bgColor: "#e3f2fd", // light blue
      color: "#1976d2", // blue
    },

    //  NotStarted
    {
      icon: <RemoveCircleOutline fontSize="large" />,
      bgColor: "#f3e5f5", // light purple
      color: "#8e24aa", // purple
    },

    //  Pending (existing)
    {
      icon: <HourglassEmpty fontSize="large" />,
      bgColor: "#f0fbf8",
      color: "#ff9800",
    },

    //  InProgress (existing)
    {
      icon: <Undo fontSize="large" />,
      bgColor: "#42a5f524",
      color: "#42a5f5",
    },

    //  Completed (existing)
    {
      icon: <CheckCircle fontSize="large" />,
      bgColor: "#dcedc8",
      color: "#4caf50",
    },
  ];

  useEffect(() => {
    const cols = getColumnsForStatus(applicationStatus);
    setColumns([...cols]);

    const visibility = {};
    cols.forEach((col) => (visibility[col.field] = true));
    setColumnVisibilityModel(visibility);

    setTempColumns([...cols]);
  }, [applicationStatus]);
  // Initialize column visibility (all true)
  useEffect(() => {
    const initialModel = {};
    columns.forEach((col) => {
      initialModel[col.field] = true;
    });
    setColumnVisibilityModel(initialModel);
  }, []);

  const moveColumn = (fromIndex, toIndex) => {
    const newCols = [...tempColumns];
    const [moved] = newCols.splice(fromIndex, 1);
    newCols.splice(toIndex, 0, moved);
    setTempColumns(newCols);
  };

  const handleOpenReorder = () => {
    if (!columns || columns.length === 0) return;
    setTempColumns([...columns]);

    // Optional: initialize ranks for visible columns if needed
    const visibleCols = columns.filter(
      (col) => columnVisibilityModel[col.field] !== false,
    );
    const initialOrder = {};
    visibleCols.forEach((col, idx) => {
      initialOrder[col.field] = idx + 1;
    });
    setTempOrder(initialOrder);

    // Open dialog
    setOpenReorder(true);
  };
  const handleApply = () => {
    const visibleCols = tempColumns.filter(
      (col) => columnVisibilityModel[col.field] !== false,
    );
    const hiddenCols = tempColumns.filter(
      (col) => columnVisibilityModel[col.field] === false,
    );

    setColumns([...visibleCols, ...hiddenCols]);
    setOpenReorder(false);
  };

  const handleCancelReorder = () => {
    setTempColumns([...columns]); // restore tempColumns to current columns
    setOpenReorder(false);
  };

  const handleReset = () => {
    // Reset tempColumns in the dialog to default
    setTempColumns([...getColumnsForStatus(applicationStatus)]);

    // Reset visibility
    const initialVisibility = {};
    getColumnsForStatus(applicationStatus).forEach((col) => {
      initialVisibility[col.field] = true;
    });
    setColumnVisibilityModel(initialVisibility);
  };

  const selectedSubmissionIds = tableDataApplication
  ?.filter((row) => selectedRowIds.includes(row.id))
  ?.map((row) => row.submissionId)
  ?.filter(Boolean);

  useEffect(() => {
  if (!activeSubRoleId || !userData) return;

  setSelectedRowIds([]); // reset selection
  getData();
  getDataCount();
}, [applicationStatus, activeSubRoleId, userData]);

  const fetchMasters = async () => {
    try {
      const res = await apiClient.get("api/master/all-oomf-masters");
      const data = res.data.data || [];
      const formattedMinistry = data?.ministries
        ?.filter((item) => userMinistryIds?.includes(item?.id))
        ?.map((item) => ({
          id: item?.id,
          name: item?.name,
          associatedFramework: item?.jsonData?.associatedFramework,
        }));
      setMinistryList(formattedMinistry);
    } catch (error) {
      setMinistryList([]);
      console.error("Failed to fetch master:", error);
    } 
  };

  useEffect(()=>{
    if((applicationStatus === "Pending" && [11,12,13].includes(userOrganizationType))){
      fetchMasters();
    }
  },[applicationStatus])

useEffect(() => {
  const fetchDepartments = async () => {
    try {
      const response = await apiClient.post(
        `api/master/get-departments-for-ministry`,
        { ministryIds: [selectedMinistry?.id] }, // send selected ministry id
      );

      const { data } = response?.data || {};
      if (Array.isArray(data)) {
        const allowedDepartmentIds =
          userData?.userRelationships?.[0]?.departmentIds || [];

        const filteredData = data
          ?.filter((dept) => allowedDepartmentIds?.includes(dept.id))
          ?.map((item) => ({
            id: item?.id,
            name: item?.name,
            associatedFramework: item?.jsonData?.associatedFramework,
          }));

        setDepartmentList(filteredData || []);
      }
    } catch (error) {
      console.error(
        "Failed to fetch department list for scheme across md:",
        error,
      );
      setDepartmentList([]);
    }
  };

  if (selectedMinistry?.id) {
    fetchDepartments();
  } else {
    setDepartmentList([]);
    setSelectedDepartment(null);
  }
}, [selectedMinistry, userData?.userRelationships]);

  return (
    <Box marginTop={2} padding={3}>
      <MainFormHeader title={`${applicationStatus}`} />
      <Divider sx={{ marginTop: 2 }} />
      <ReorderColumnsDialog
        openReorder={openReorder}
        handleCancelReorder={handleCancelReorder}
        tempColumns={tempColumns}
        moveColumn={moveColumn}
        setColumnVisibilityModel={setColumnVisibilityModel}
        columnVisibilityModel={columnVisibilityModel}
        handleReset={handleReset}
        handleApply={handleApply}
      />
      <Box marginTop={2}>
        {/* Role Tabs */}
        <Tabs
          value={activeSubRoleId ?? subRoleIds[0]} // default to first role if none selected
          onChange={(e, newValue) => {
            setActiveSubRoleId(newValue);
            setTableDataApplication([]); // clear previous table instantly
            setSelectedRowIds([]);
            setApplicationStatus("Pending"); // reset status cards
          }}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          {[...subRoleIds]
            .sort((a, b) => a - b)
            .map((roleId) => (
              <Tab
                key={roleId}
                label={subRoleLabels[roleId] || `Role ${roleId}`}
                value={roleId}
              />
            ))}
        </Tabs>
      </Box>
      {/* <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          mt: 2,
          flexWrap: "wrap", // responsive wrapping
          gap: 2,
        }}
      >
        {auditParams?.auditableId && auditParams?.sectionId && (
          <AuditDataGrid
            {...auditParams}
            auditDialogOpen={auditDialogOpen}
            setAuditDialogOpen={setAuditDialogOpen}
          />
        )}
      </Box> */}

      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))"
        gap={2}
        marginTop={5}
        marginBottom={5}
      >
        {applicationCount?.map((item, key) => (
          <Box
            key={key}
            onClick={() => setApplicationStatus(item?.status)}
            sx={{ cursor: "pointer" }}
          >
            <CardConatiner2
              iconColor={icons[key]?.color}
              bgColor={icons[key]?.bgColor}
              icon={icons[key]?.icon}
              title={item?.status}
              applicationStatus={applicationStatus}
              count={item?.count}
            />
          </Box>
        ))}
      </Box>

      <Box
        sx={{
          maxHeight: 470,

          width: "100%",
          overflow: "auto",
          "&::-webkit-scrollbar": {
            display: "none",
            scrollbarWidth: "none",
          },
        }}
      >
        <Box>
          {applicationStatus === "Pending" &&
            [11, 12, 13].includes(userOrganizationType) && (
              <Paper elevation={1} sx={{ px: 3,pt:3,pb:2, border: "1px solid lightgray",borderRadius:"6px", }}>
              <Grid container gap={2.5}>
                <Grid size={{ xs: 12, sm: 3, md: 4 }}>
                  <Autocomplete
                    options={ministryList || []}
                    value={selectedMinistry}
                    onChange={(event, newValue) => {
                      setSelectedMinistry(newValue);
                      setSelectedDepartment(null); // reset department when ministry changes
                    }}
                    getOptionLabel={(option) => option?.name || ""}
                    isOptionEqualToValue={(option, value) =>
                      option?.id === value?.id
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Ministry"
                        placeholder="Choose Ministry"
                        size="small"
                      />
                    )}
                    clearOnEscape
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3, md: 4 }}>
                  <Autocomplete
                    options={departmentList || []}
                    value={selectedDepartment}
                    onChange={(event, newValue) => {
                      setSelectedDepartment(newValue);
                    }}
                    getOptionLabel={(option) => option?.name || ""}
                    isOptionEqualToValue={(option, value) =>
                      option?.id === value?.id
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Select Department"
                        placeholder="Choose Department"
                        size="small"
                      />
                    )}
                    disabled={!selectedMinistry}
                    clearOnEscape
                    fullWidth
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 3, md: 3 }}>
                  <Tooltip
                    title={
                      selectedSubmissionIds.length < 2
                        ? "At least 2 records should be selected to bulk forward"
                        : "Forward selected records"
                    }
                    arrow
                  >
                    <span>
                      <Button
                        variant="contained"
                        color="success"
                        onClick={() => setOpenBulkForwardDialog(true)}
                        endIcon={<ArrowForwardIosIcon />}
                        disabled={selectedSubmissionIds.length < 2}
                        sx={{ mb: 2 }}
                      >
                        Click to Bulk Forward
                      </Button>
                    </span>
                  </Tooltip>
                </Grid>
              </Grid>
              </Paper>
            )}
        </Box>
        {isLoading ? (
          <Typography>Loading...</Typography>
        ) : tableDataApplication.length === 0 ? (
          <Typography>No submissions found</Typography>
        ) : (
          <>
            <SearchTable
              columns={columns}
              data={tableDataApplication}
              isCheckbox={
                applicationStatus === "Pending" &&
                [11, 12, 13].includes(userOrganizationType) && selectedMinistry
              }
              isHideDensity={false}
              isHideExport={true}
              isHideFilter={false}
              isHideColumn={true}
              isHidePaging={false}
              name="villageName"
              id="villageName"
              fileName="tableData"
              columnVisibilityModel={columnVisibilityModel}
              onColumnVisibilityModelChange={(newModel) =>
                setColumnVisibilityModel(newModel)
              }
              handleOpenReorder={handleOpenReorder}
              rowSelectionModel={selectedRowIds}
              onRowSelectionModelChange={(newSelection) => {
                setSelectedRowIds(newSelection);
              }}
            />
          </>
        )}
      </Box>

      <OomfDashboardActionDialog
        open={open}
        onClose={handleClose}
        row={selectedRow}
      />
      <ForwardedSchemesDialog
        open={openForwarded}
        onClose={() => setOpenForwarded(false)}
        latestRecord={selectedRow ? [selectedRow] : []}
        row={selectedRow}
        previousRecords={selectedRow?.previousRecords || []}
      />
      {console.log("Submission Ids::", selectedSubmissionIds)}
      <BulkForwardDialog
        open={openBulkForwardDialog}
        onClose={() => setOpenBulkForwardDialog(false)}
        mode={"edit"}
        submissionIds={selectedSubmissionIds}
        isCreator={false} // true only when creator is submitting first time
        type={""}
        canForward={true}
      />
    </Box>
  );
};

export default CommonDashboardNiti;
