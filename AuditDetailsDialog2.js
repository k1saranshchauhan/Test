/* -------------------------------------------------- */
/* DYNAMIC RENDER ENGINE (UPDATED) */
/* -------------------------------------------------- */

const renderBlank = () => (
  <Typography variant="body2" fontWeight="bold">
    Blank
  </Typography>
);

const getFieldConfig = (path) => renderConfig?.[path] || { type: "auto" };

const isHtml = (str) =>
  typeof str === "string" && /<\/?[a-z][\s\S]*>/i.test(str);

/* -------------------- */
/* LIST RENDERER */
/* -------------------- */

const renderList = (data, cfg, path) => {
  if (!Array.isArray(data) || !data.length) return renderBlank();

  return data.map((item, idx) => {
    if (cfg?.displayKey) {
      return (
        <Typography key={idx}>{item?.[cfg.displayKey]}</Typography>
      );
    }

    if (typeof item === "object") {
      return (
        <Box key={idx} mb={1}>
          {Object.entries(item)
            .filter(([k]) => !IGNORED_FIELDS.includes(k))
            .map(([k, v]) => (
              <Typography key={k}>
                {getLabel(k)}: {renderDynamicValue(v, `${path}.${k}`)}
              </Typography>
            ))}
        </Box>
      );
    }

    return <Typography key={idx}>{item}</Typography>;
  });
};

/* -------------------- */
/* AUTO TABLE */
/* -------------------- */

const renderAutoTable = (data, path) => {
  if (!Array.isArray(data) || !data.length) return renderBlank();

  const columns = Object.keys(data[0]).filter(
    (c) => !IGNORED_FIELDS.includes(c)
  );

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {columns.map((col) => (
            <TableCell key={col}>{getLabel(col)}</TableCell>
          ))}
        </TableRow>
      </TableHead>

      <TableBody>
        {data.map((row, i) => (
          <TableRow key={i}>
            {columns.map((col) => (
              <TableCell key={col}>
                {renderDynamicValue(row[col], `${path}.${col}`)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/* -------------------- */
/* CONFIG TABLE */
/* -------------------- */

const renderConfigTable = (data, cfg, path) => {
  if (!Array.isArray(data) || !data.length) return renderBlank();

  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {cfg.columns.map((col) => (
            <TableCell key={col.key}>{col.label}</TableCell>
          ))}
        </TableRow>
      </TableHead>

      <TableBody>
        {data.map((row, idx) => (
          <TableRow key={idx}>
            {cfg.columns.map((col) => (
              <TableCell key={col.key}>
                {col.type === "list"
                  ? renderList(row[col.key], col, `${path}.${col.key}`)
                  : renderDynamicValue(row[col.key], `${path}.${col.key}`)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/* -------------------- */
/* AUTO RENDER */
/* -------------------- */

const autoRender = (value, path) => {
  if (value === null || value === undefined || value === "")
    return renderBlank();

  if (isHtml(value)) {
    return (
      <Box
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(value),
        }}
      />
    );
  }

  if (Array.isArray(value)) {
    if (typeof value[0] === "object") {
      return renderAutoTable(value, path);
    }

    return value.map((v, i) => (
      <Typography key={i}>{v}</Typography>
    ));
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

/* -------------------- */
/* MAIN RENDER */
/* -------------------- */

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
      return (
        <Typography>
          {moment(value).format("DD MMM YYYY")}
        </Typography>
      );

    case "html":
      return (
        <Box
          sx={{ maxHeight: 250, overflow: "auto" }}
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(value),
          }}
        />
      );

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



const renderConfig = {
  "jsonData.sdgAlignment": {
    type: "list",
    displayKey: "name",
  },

  "jsonData.nodalMinistry": {
    type: "list",
    displayKey: "name",
  },

  "jsonData.schemeFinancialYearWiseBudgetDetails": {
    type: "table",
    columns: [
      { key: "financialYear", label: "Financial Year" },
      { key: "revisedBudget", label: "Revised Budget" },
      { key: "estimatedBudget", label: "Estimated Budget" },
      {
        key: "associatedFrameworks",
        label: "Frameworks",
        type: "list",
        displayKey: "name",
      },
    ],
  },
};
