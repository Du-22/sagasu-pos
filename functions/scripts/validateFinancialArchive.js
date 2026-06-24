const {
  initializeApp: initializeAdminApp,
  getApps: getAdminApps,
} = require("firebase-admin/app");
const { getFunctions, httpsCallable } = require("firebase/functions");
const { initializeApp: initializeClientApp, getApps: getClientApps } = require("firebase/app");
const { runClientDryRun, WEB_CONFIGS } = require("./financialArchiveClientDryRun");

const DEFAULT_PROJECT_ID = "sagasu-pos-system-dev";
const getDefaultBucket = (projectId) => `${projectId}-financial-archives`;

const parseArgs = (argv) => {
  const options = {
    projectId: DEFAULT_PROJECT_ID,
    storageBucket: null,
    retentionMonths: 12,
    dryRun: true,
    deleteAfterArchive: false,
    force: false,
    oldest: false,
    confirmDelete: false,
    admin: false,
    callable: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--project") {
      options.projectId = next;
      index += 1;
    } else if (arg === "--bucket") {
      options.storageBucket = next;
      index += 1;
    } else if (arg === "--month") {
      options.month = next;
      index += 1;
    } else if (arg === "--retention-months") {
      options.retentionMonths = Number(next);
      index += 1;
    } else if (arg === "--archive") {
      options.dryRun = false;
    } else if (arg === "--delete-after-archive") {
      options.deleteAfterArchive = true;
    } else if (arg === "--confirm-delete-archived-details") {
      options.confirmDelete = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--oldest") {
      options.oldest = true;
    } else if (arg === "--admin") {
      options.admin = true;
    } else if (arg === "--callable") {
      options.callable = true;
    } else if (arg === "--help") {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!options.storageBucket) {
    options.storageBucket = getDefaultBucket(options.projectId);
  }

  return options;
};

const printHelp = () => {
  console.log(`
Usage:
  node functions/scripts/validateFinancialArchive.js --month YYYY-MM [options]
  node functions/scripts/validateFinancialArchive.js --oldest [options]

Safe defaults:
  Dry run is enabled by default. It reads Firestore and builds archive metadata in memory only.

Options:
  --project <id>                         Firebase project id. Default: sagasu-pos-system-dev
  --bucket <name>                        Storage bucket. Default: <projectId>-financial-archives
  --month <YYYY-MM>                      Validate one month.
  --oldest                               Validate the oldest eligible month.
  --retention-months <number>            Default: 12
  --force                                Allow a month inside the retention window for dev testing.
  --archive                              Actually upload files and write Firestore summaries.
  --delete-after-archive                 Delete Firestore details after archive verification.
  --confirm-delete-archived-details      Required together with --delete-after-archive.
  --admin                                Use Admin SDK for dry run. Requires ADC/service account.
  --callable                             Call deployed archiveFinancialMonth. Requires --month.
`);
};

const validateOptions = (options) => {
  if (options.help) return;
  if (!options.month && !options.oldest) {
    throw new Error("Pass --month YYYY-MM or --oldest");
  }
  if (options.month && options.oldest) {
    throw new Error("Use only one of --month or --oldest");
  }
  if (options.deleteAfterArchive && options.dryRun) {
    throw new Error("--delete-after-archive requires --archive");
  }
  if (options.deleteAfterArchive && !options.confirmDelete) {
    throw new Error(
      "--delete-after-archive also requires --confirm-delete-archived-details",
    );
  }
  if (options.callable && options.oldest) {
    throw new Error("--callable currently requires --month, not --oldest");
  }
  if (options.callable && !options.month) {
    throw new Error("--callable requires --month YYYY-MM");
  }
};

const initFirebaseAdmin = ({ projectId, storageBucket }) => {
  if (getAdminApps().length > 0) return;
  if (storageBucket) {
    process.env.FINANCIAL_ARCHIVE_BUCKET = storageBucket;
  }

  initializeAdminApp({
    projectId,
    storageBucket,
  });
};

const initFirebaseClient = (projectId) => {
  if (getClientApps().length > 0) {
    return getClientApps()[0];
  }

  const config = WEB_CONFIGS[projectId];
  if (!config) {
    throw new Error(`No web Firebase config for project: ${projectId}`);
  }

  return initializeClientApp(config);
};

const runCallableArchive = async (options) => {
  const app = initFirebaseClient(options.projectId);
  const functions = getFunctions(app);
  const archiveFinancialMonth = httpsCallable(functions, "archiveFinancialMonth");
  const result = await archiveFinancialMonth({
    month: options.month,
    retentionMonths: options.retentionMonths,
    dryRun: options.dryRun,
    deleteAfterArchive: options.deleteAfterArchive,
    force: options.force,
  });

  return {
    mode: "deployed-callable",
    ...result.data,
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  validateOptions(options);

  if (options.help) {
    printHelp();
    return;
  }

  let result;

  if (options.callable) {
    result = await runCallableArchive(options);
  } else if (options.dryRun && !options.admin) {
    result = await runClientDryRun(options);
  } else {
    initFirebaseAdmin(options);
    const {
      archiveFinancialMonthCore,
      archiveOldestEligibleMonthCore,
    } = require("../financialArchive");

    result = options.oldest
      ? await archiveOldestEligibleMonthCore({
          retentionMonths: options.retentionMonths,
          dryRun: options.dryRun,
          deleteAfterArchive: options.deleteAfterArchive,
        })
      : await archiveFinancialMonthCore({
          month: options.month,
          retentionMonths: options.retentionMonths,
          dryRun: options.dryRun,
          deleteAfterArchive: options.deleteAfterArchive,
          force: options.force,
        });
  }

  console.log(JSON.stringify(result, null, 2));
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
