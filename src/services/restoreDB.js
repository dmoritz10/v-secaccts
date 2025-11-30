import { collection, doc, getDocs, writeBatch } from "firebase/firestore";
import { db } from "@/firebase";
import { auth, provider } from "@/firebase";
import { signInWithPopup } from "firebase/auth";
import { useAccountStore } from "@/stores/account";
import { useCategoryStore } from "@/stores/category";
import {
  toast,
  alertDialog,
  promptDialog,
  confirmDialog,
  blockScreen,
  unblockScreen,
} from "@/ui/dialogState.js";

const SHEET_ID = "1vd8AFeyJfLHCFptRYwAAFp6dtUPQa86KX8b4JFcdWNk";
const SHEETS_TO_RESTORE = []; // Empty = all sheets

export async function restoreAllSheets() {
  const msg = `Using this function will overwrite`;

  // Sign out first to ensure fresh scopes
  await auth.signOut();

  // Add proper scope for reading & writing Sheets
  provider.addScope("https://www.googleapis.com/auth/spreadsheets");
  // Sign in with popup
  const userCredential = await signInWithPopup(auth, provider);
  const accessToken = userCredential._tokenResponse.oauthAccessToken;

  const [ssName, sheets] = await getBackupSS(accessToken);

  if (!ssName) {
    alertDialog("Restore Database from Backup", sheets);
    return;
  }

  const confirmOk = await confirmDialog(
    `Restore Database from Backup <br>${ssName}`,
    `The Backup contains the following sheets. 
        <br><strong>${sheets}</strong>
        <br><br>Each sheet will add to the database if it's not already present.
        <br>If the sheet is already in the database, it will be completely replaced.
        <br>
        <br>Continue ?`
  );

  if (!confirmOk) return;

  // Restore each sheet
  const accountStore = useAccountStore();
  const categoryStore = useCategoryStore();

  accountStore.unsubscribeFromAccounts();
  categoryStore.unsubscribeFromCategories();

  for (const sheetName of sheets) {
    await restoreSheet(sheetName, accessToken);
  }

  accountStore.subscribeToAccounts();
  categoryStore.subscribeToCategories();

  console.log("All sheets restored!");
}

async function getBackupSS(accessToken) {
  const SHEET_ID = await promptDialog("Restore Database from Backup", "", "SS Id");
  if (SHEET_ID !== null) {
    console.log("User entered:", SHEET_ID);
  } else {
    return [null, "Cancelled"];
  }

  // Fetch sheet names
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=properties.title,sheets.properties.title`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) return [null, `Invalid Restore Spreadsheet: ${res.status}`];

  const json = await res.json();
  const ssName = json.properties.title;
  const sheetNames = json.sheets.map((s) => s.properties.title);

  return [ssName, sheetNames];
}

async function restoreSheet(sheetName, accessToken) {
  console.log(`Restoring sheet: ${sheetName}`);
  const rows = await fetchSheetData(sheetName, accessToken);
  const batch = writeBatch(db);
  // 1. Fetch all existing docs in this collection
  const colRef = collection(db, sheetName);
  const existingDocsSnap = await getDocs(colRef);

  // 2. Track docIds from the backup
  const backupDocIds = new Set();

  for (const [docId, jsonString] of rows) {
    if (docId === "Document ID") continue;
    backupDocIds.add(docId);
    const data = JSON.parse(jsonString);
    const docRef = doc(db, sheetName, docId);
    batch.set(docRef, data); // set = create or overwrite
  }

  for (const docSnap of existingDocsSnap.docs) {
    if (!backupDocIds.has(docSnap.id)) {
      batch.delete(docSnap.ref);
    }
  }
  await batch.commit();
  console.log(`Restored ${rows.length} documents for collection ${sheetName}`);
}

async function fetchSheetData(sheetName, accessToken) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
    sheetName
  )}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch sheet ${sheetName}: ${res.status}`);

  const text = await res.text();
  const match = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/);
  if (!match) throw new Error(`Invalid sheet response for ${sheetName}`);
  const data = JSON.parse(match[1]);

  const rows = data.table.rows.map((r) => [r.c[0]?.v ?? "", r.c[1]?.v ?? "{}"]);
  return rows.filter((r) => r[0]); // remove empty docIds
}

function showPicker(accessToken) {
  return new Promise((resolve, reject) => {
    if (!accessToken) return reject("OAuth token not set");

    gapi.load("picker", () => {
      const view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS)
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false);

      const picker = new google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(accessToken)
        .setDeveloperKey("<YOUR_GOOGLE_API_KEY>") // restrict to Drive API if you like
        .setCallback((data) => {
          if (data.action === google.picker.Action.PICKED) {
            const file = data.docs[0];
            resolve({ id: file.id, name: file.name });
          } else {
            reject("No file selected");
          }
        })
        .build();

      picker.setVisible(true);
    });
  });
}
